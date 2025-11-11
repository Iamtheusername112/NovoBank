'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Card,
  CardBody,
  Button,
  Badge,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  FormControl,
  FormLabel,
  Select,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Wallet,
  Download,
  Edit,
  Star,
  DollarSign,
  CreditCard,
  Building2,
  TrendingUp,
  PiggyBank,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export default function AccountsPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editForm, setEditForm] = useState({
    account_name: '',
    currency: 'USD',
    is_primary: false,
  });

  useEffect(() => {
    setMounted(true);
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      setAccounts(accountsData || []);

      // Load cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCards(cardsData || []);

    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setEditForm({
      account_name: account.account_name,
      currency: account.currency || 'USD',
      is_primary: account.is_primary || false,
    });
    onEditOpen();
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount || !editForm.account_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an account nickname',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If setting as primary, unset other primary accounts
      if (editForm.is_primary) {
        await supabase
          .from('accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', selectedAccount.id);
      }

      const { error } = await supabase
        .from('accounts')
        .update({
          account_name: editForm.account_name.trim(),
          currency: editForm.currency,
          is_primary: editForm.is_primary,
        })
        .eq('id', selectedAccount.id);

      if (error) throw error;

      toast({
        title: 'Account Updated',
        description: 'Account settings have been updated',
        status: 'success',
        duration: 3000,
      });

      onEditClose();
      setSelectedAccount(null);
      loadAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: 'Error',
        description: 'Failed to update account',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDownloadStatement = async (account, period = 'month') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(endDate.getMonth() - 3);
      } else if (period === 'year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }

      // Fetch transactions for this account
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate CSV statement
      const csvHeader = 'Date,Description,Category,Amount,Type,Balance\n';
      let csvContent = csvHeader;
      let runningBalance = parseFloat(account.balance);

      // Sort transactions by date (oldest first for balance calculation)
      const sortedTransactions = [...(transactions || [])].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      sortedTransactions.forEach((txn) => {
        runningBalance -= parseFloat(txn.amount); // Subtract because amounts can be negative
        const date = new Date(txn.created_at).toLocaleDateString();
        const description = txn.description || txn.recipient_name || 'Transaction';
        const category = txn.category || 'Other';
        const amount = Math.abs(parseFloat(txn.amount));
        const type = txn.transaction_type || 'sent';
        csvContent += `${date},"${description}",${category},${amount},${type},${runningBalance.toFixed(2)}\n`;
      });

      // Add account summary
      csvContent += `\nAccount Summary\n`;
      csvContent += `Account Name,${account.account_name}\n`;
      csvContent += `Account Number,${account.account_number}\n`;
      csvContent += `Account Type,${account.account_type}\n`;
      csvContent += `Currency,${account.currency || 'USD'}\n`;
      csvContent += `Starting Balance,${(runningBalance - transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)).toFixed(2)}\n`;
      csvContent += `Ending Balance,${account.balance}\n`;
      csvContent += `Total Transactions,${transactions.length}\n`;

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement_${account.account_name}_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Statement Downloaded',
        description: 'Your statement has been downloaded successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast({
        title: 'Error',
        description: 'Failed to download statement',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case 'checking':
        return <Wallet size={24} color="#3b82f6" />;
      case 'savings':
        return <PiggyBank size={24} color="#10b981" />;
      case 'credit':
        return <CreditCard size={24} color="#f97316" />;
      case 'investment':
        return <TrendingUp size={24} color="#8b5cf6" />;
      default:
        return <Building2 size={24} color="#6b7280" />;
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => {
    // For now, just sum USD amounts (in production, you'd convert currencies)
    return sum + parseFloat(acc.balance || 0);
  }, 0);

  return (
    <Box minH="100vh" bg={bgColor} pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Box px={4} py={4} bg={cardBg} borderBottom="1px" borderColor="gray.200">
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <IconButton
              icon={<ArrowLeft size={20} />}
              variant="ghost"
              onClick={() => router.back()}
              aria-label="Back"
            />
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              My Accounts
            </Text>
          </HStack>
        </Flex>
      </Box>

      <Box px={4} py={4}>
        {/* Total Balance */}
        <Card bgGradient="linear(to-r, purple.500, pink.500)" color="white" borderRadius="xl" mb={4} boxShadow="lg">
          <CardBody p={6}>
            <VStack spacing={2} align="flex-start">
              <Text fontSize="sm" opacity={0.9}>
                Total Balance Across All Accounts
              </Text>
              <Text fontSize="3xl" fontWeight="bold">
                {formatCurrency(totalBalance)}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Accounts List */}
        <VStack spacing={4} align="stretch">
          {accounts.map((account) => {
            const currencyInfo = CURRENCIES.find(c => c.code === (account.currency || 'USD')) || CURRENCIES[0];
            
            return (
              <Card key={account.id} bg={cardBg} borderRadius="xl" boxShadow="md">
                <CardBody p={4}>
                  <Flex justify="space-between" align="flex-start">
                    <HStack spacing={3} flex={1}>
                      <Box
                        w="50px"
                        h="50px"
                        borderRadius="full"
                        bg={`${account.account_type === 'checking' ? 'blue' : account.account_type === 'savings' ? 'green' : account.account_type === 'credit' ? 'orange' : 'purple'}.100`}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {getAccountIcon(account.account_type)}
                      </Box>
                      <VStack align="flex-start" spacing={1} flex={1}>
                        <HStack spacing={2}>
                          <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                            {account.account_name}
                          </Text>
                          {account.is_primary && (
                            <Badge colorScheme="purple" borderRadius="full">
                              <Star size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              Primary
                            </Badge>
                          )}
                          <Badge colorScheme="gray" variant="outline">
                            {currencyInfo.code}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.600">
                          {account.account_type.toUpperCase()} ••••{account.account_number.slice(-4)}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                          {formatCurrency(account.balance, account.currency || 'USD')}
                        </Text>
                      </VStack>
                    </HStack>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<Text>⋯</Text>}
                        variant="ghost"
                        aria-label="Account options"
                        fontSize="xl"
                      />
                      <MenuList>
                        <MenuItem icon={<Edit size={16} />} onClick={() => handleEditAccount(account)}>
                          Edit Nickname
                        </MenuItem>
                        <MenuItem 
                          icon={<Download size={16} />}
                          onClick={() => handleDownloadStatement(account, 'month')}
                        >
                          Download Statement (Last Month)
                        </MenuItem>
                        <MenuItem 
                          icon={<Download size={16} />}
                          onClick={() => handleDownloadStatement(account, 'quarter')}
                        >
                          Download Statement (Last Quarter)
                        </MenuItem>
                        <MenuItem 
                          icon={<Download size={16} />}
                          onClick={() => handleDownloadStatement(account, 'year')}
                        >
                          Download Statement (Last Year)
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
        </VStack>

        {/* Cards Section */}
        {cards.length > 0 && (
          <Box mt={6}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
              Payment Cards
            </Text>
            <VStack spacing={3} align="stretch">
              {cards.map((card) => (
                <Card key={card.id} bg={cardBg} borderRadius="xl" boxShadow="md">
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <CreditCard size={24} color="#6b7280" />
                      <VStack align="flex-start" spacing={0} flex={1}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">
                          {card.card_holder_name}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          •••• {card.card_number.slice(-4)} • Expires {card.expiry_date}
                        </Text>
                        <Text fontSize="lg" fontWeight="bold" color="gray.800">
                          {formatCurrency(card.balance)}
                        </Text>
                      </VStack>
                      {card.is_frozen && (
                        <Badge colorScheme="red">Frozen</Badge>
                      )}
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </Box>
        )}

        {accounts.length === 0 && cards.length === 0 && (
          <Box textAlign="center" py={12}>
            <Wallet size={64} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={2}>
              No Accounts Yet
            </Text>
            <Text color="gray.600">
              Your accounts will appear here
            </Text>
          </Box>
        )}
      </Box>

      {/* Edit Account Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Account Nickname</FormLabel>
                <Input
                  placeholder="e.g., Main Checking, Savings, Emergency Fund"
                  value={editForm.account_name}
                  onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Give your account a friendly name to easily identify it
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Currency</FormLabel>
                <Select
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} flex={1}>
                  Set as Primary Account
                </FormLabel>
                <Button
                  size="sm"
                  variant={editForm.is_primary ? 'solid' : 'outline'}
                  colorScheme={editForm.is_primary ? 'purple' : 'gray'}
                  onClick={() => setEditForm({ ...editForm, is_primary: !editForm.is_primary })}
                >
                  {editForm.is_primary ? 'Yes' : 'No'}
                </Button>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleUpdateAccount}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}


