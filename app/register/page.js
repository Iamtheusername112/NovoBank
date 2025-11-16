'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Input,
  Select,
  useToast,
  useDisclosure,
  IconButton,
  useBreakpointValue,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [runningBalance, setRunningBalance] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const tableBg = useColorModeValue('white', 'gray.800');
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadUserData();
      loadNotificationCounts();
    }
  }, [mounted]);

  useEffect(() => {
    filterTransactions();
  }, [selectedAccount, searchQuery, transactions]);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', authUser.id)
        .order('is_primary', { ascending: false });

      if (accountsData) {
        setAccounts(accountsData);
        if (accountsData.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsData[0].id);
        }
      }

      // Load transactions
      await loadTransactions();

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load register data',
        status: 'error',
      });
    }
  };

  const loadTransactions = async (accountId = null) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      let query = supabase
        .from('transactions')
        .select('*, accounts(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data: transactionsData } = await query;

      if (transactionsData) {
        setTransactions(transactionsData);
        
        // Calculate running balance
        if (accountId) {
          const account = accounts.find(a => a.id === accountId);
          if (account) {
            calculateRunningBalance(transactionsData, parseFloat(account.balance));
          }
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const calculateRunningBalance = (txns, currentBalance) => {
    // Sort by date ascending for running balance calculation
    const sorted = [...txns].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let balance = currentBalance;
    
    // Reverse to show most recent first, but calculate from oldest
    const balances = sorted.map(txn => {
      balance -= parseFloat(txn.amount);
      return { ...txn, running_balance: balance };
    }).reverse();

    setFilteredTransactions(balances);
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (selectedAccount) {
      filtered = filtered.filter(t => t.account_id === selectedAccount);
      const account = accounts.find(a => a.id === selectedAccount);
      if (account) {
        calculateRunningBalance(filtered, parseFloat(account.balance));
        return;
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Calculate running balance for all accounts
    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      calculateRunningBalance(filtered, parseFloat(account.balance));
    } else {
      setFilteredTransactions(filtered);
    }
  };

  const loadNotificationCounts = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      const { data: alerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      setUnreadNotificationCount(notifications?.length || 0);
      setUnreadAlertCount(alerts?.length || 0);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Description', 'Category', 'Amount', 'Balance'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        `"${t.description || ''}"`,
        t.category || '',
        t.amount,
        t.running_balance || '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `register-${selectedAccount || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Register exported successfully',
      status: 'success',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!mounted) return null;

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Flex
        px={4}
        py={4}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        justify="space-between"
      >
        <HStack spacing={3}>
          <IconButton
            icon={<ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />}
            onClick={() => router.back()}
            variant="ghost"
            aria-label="Back"
          />
          <Heading size="md">Checkbook Register</Heading>
        </HStack>
        <HStack spacing={2}>
          {isMobile ? (
            <IconButton
              icon={<MessageCircle size={20} />}
              onClick={onContactOpen}
              variant="ghost"
              aria-label="Contact Us"
            />
          ) : (
            <Button size="sm" variant="outline" onClick={onContactOpen}>
              Contact Us
            </Button>
          )}
          <NotificationBell count={unreadNotificationCount + unreadAlertCount} />
        </HStack>
      </Flex>

      <Box px={4} py={6}>
        {/* Filters */}
        <Card mb={6}>
          <CardBody>
            <VStack spacing={4}>
              <HStack w="full" spacing={3}>
                <Select
                  flex={1}
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value);
                    loadTransactions(e.target.value);
                  }}
                  placeholder="All Accounts"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </Select>
                <Button
                  leftIcon={<Download size={18} />}
                  colorScheme="purple"
                  onClick={handleExport}
                >
                  Export
                </Button>
              </HStack>
              <HStack w="full" spacing={2}>
                <Box position="relative" flex={1}>
                  <IconButton
                    icon={<Search size={18} />}
                    position="absolute"
                    left={2}
                    top="50%"
                    transform="translateY(-50%)"
                    variant="ghost"
                    size="sm"
                    aria-label="Search"
                    pointerEvents="none"
                    zIndex={1}
                  />
                  <Input
                    pl={10}
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Box>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Register Table */}
        <Card>
          <CardBody p={0}>
            {isMobile ? (
              <VStack spacing={3} align="stretch" p={4}>
                {filteredTransactions.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={8}>
                    No transactions found
                  </Text>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <Card key={transaction.id} variant="outline">
                      <CardBody>
                        <VStack align="stretch" spacing={2}>
                          <Flex justify="space-between">
                            <Text fontWeight="semibold">{formatDate(transaction.created_at)}</Text>
                            <Text
                              fontWeight="bold"
                              color={parseFloat(transaction.amount) >= 0 ? 'green.500' : 'red.500'}
                            >
                              {formatCurrency(transaction.amount)}
                            </Text>
                          </Flex>
                          <Text fontSize="sm" color="gray.600">
                            {transaction.description || 'No description'}
                          </Text>
                          <HStack justify="space-between">
                            <Badge fontSize="xs">{transaction.category || 'Other'}</Badge>
                            <Text fontSize="xs" color="gray.500">
                              Balance: {formatCurrency(transaction.running_balance || transaction.accounts?.balance || 0)}
                            </Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))
                )}
              </VStack>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Description</Th>
                      <Th>Category</Th>
                      <Th isNumeric>Amount</Th>
                      <Th isNumeric>Balance</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTransactions.length === 0 ? (
                      <Tr>
                        <Td colSpan={5} textAlign="center" py={8}>
                          <Text color="gray.500">No transactions found</Text>
                        </Td>
                      </Tr>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <Tr key={transaction.id}>
                          <Td>{formatDate(transaction.created_at)}</Td>
                          <Td>{transaction.description || 'No description'}</Td>
                          <Td>
                            <Badge fontSize="xs">{transaction.category || 'Other'}</Badge>
                          </Td>
                          <Td isNumeric>
                            <Text
                              fontWeight="semibold"
                              color={parseFloat(transaction.amount) >= 0 ? 'green.500' : 'red.500'}
                            >
                              {formatCurrency(transaction.amount)}
                            </Text>
                          </Td>
                          <Td isNumeric>
                            <Text fontSize="sm">
                              {formatCurrency(transaction.running_balance || transaction.accounts?.balance || 0)}
                            </Text>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

