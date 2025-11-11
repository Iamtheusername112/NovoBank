'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
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
  FormErrorMessage,
  FormHelperText,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Image,
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

const GLOBAL_BANK_DIRECTORY = [
  { name: 'Bank of America', slug: 'bank-of-america', logo: 'https://logo.clearbit.com/bankofamerica.com' },
  { name: 'JPMorgan Chase', slug: 'jpmorgan', logo: 'https://logo.clearbit.com/jpmorganchase.com' },
  { name: 'Citibank', slug: 'citibank', logo: 'https://logo.clearbit.com/citi.com' },
  { name: 'Wells Fargo', slug: 'wells-fargo', logo: 'https://logo.clearbit.com/wellsfargo.com' },
  { name: 'Goldman Sachs', slug: 'goldman-sachs', logo: 'https://logo.clearbit.com/goldmansachs.com' },
  { name: 'Morgan Stanley', slug: 'morgan-stanley', logo: 'https://logo.clearbit.com/morganstanley.com' },
  { name: 'HSBC', slug: 'hsbc', logo: 'https://logo.clearbit.com/hsbc.com' },
  { name: 'Barclays', slug: 'barclays', logo: 'https://logo.clearbit.com/barclays.co.uk' },
  { name: 'Lloyds Bank', slug: 'lloyds-bank', logo: 'https://logo.clearbit.com/lloydsbank.com' },
  { name: 'Santander', slug: 'santander', logo: 'https://logo.clearbit.com/santander.com' },
  { name: 'Deutsche Bank', slug: 'deutsche-bank', logo: 'https://logo.clearbit.com/db.com' },
  { name: 'BNP Paribas', slug: 'bnp-paribas', logo: 'https://logo.clearbit.com/group.bnpparibas' },
  { name: 'Credit Suisse', slug: 'credit-suisse', logo: 'https://logo.clearbit.com/creditsuisse.com' },
  { name: 'UBS', slug: 'ubs', logo: 'https://logo.clearbit.com/ubs.com' },
  { name: 'ING Bank', slug: 'ing-bank', logo: 'https://logo.clearbit.com/ing.com' },
  { name: 'Rabobank', slug: 'rabobank', logo: 'https://logo.clearbit.com/rabobank.com' },
  { name: 'Societe Generale', slug: 'societe-generale', logo: 'https://logo.clearbit.com/societegenerale.com' },
  { name: 'Standard Chartered', slug: 'standard-chartered', logo: 'https://logo.clearbit.com/sc.com' },
  { name: 'Royal Bank of Canada', slug: 'royal-bank-of-canada', logo: 'https://logo.clearbit.com/rbc.com' },
  { name: 'Toronto-Dominion Bank', slug: 'td-bank', logo: 'https://logo.clearbit.com/td.com' },
  { name: 'Scotiabank', slug: 'scotiabank', logo: 'https://logo.clearbit.com/scotiabank.com' },
  { name: 'Banco do Brasil', slug: 'banco-do-brasil', logo: 'https://logo.clearbit.com/bb.com.br' },
  { name: 'Itau Unibanco', slug: 'itau', logo: 'https://logo.clearbit.com/itau.com.br' },
  { name: 'Bradesco', slug: 'bradesco', logo: 'https://logo.clearbit.com/bradesco.com.br' },
  { name: 'Banco Santander Mexico', slug: 'santander-mexico', logo: 'https://logo.clearbit.com/santander.com.mx' },
  { name: 'BBVA', slug: 'bbva', logo: 'https://logo.clearbit.com/bbva.com' },
  { name: 'CaixaBank', slug: 'caixabank', logo: 'https://logo.clearbit.com/caixabank.com' },
  { name: 'Intesa Sanpaolo', slug: 'intesa-sanpaolo', logo: 'https://logo.clearbit.com/intesasanpaolo.com' },
  { name: 'UniCredit', slug: 'unicredit', logo: 'https://logo.clearbit.com/unicreditgroup.eu' },
  { name: 'Bank Mandiri', slug: 'bank-mandiri', logo: 'https://logo.clearbit.com/bankmandiri.co.id' },
  { name: 'Bank Central Asia', slug: 'bca', logo: 'https://logo.clearbit.com/bca.co.id' },
  { name: 'Industrial and Commercial Bank of China', slug: 'icbc', logo: 'https://logo.clearbit.com/icbc-ltd.com' },
  { name: 'China Construction Bank', slug: 'ccb', logo: 'https://logo.clearbit.com/ccb.com' },
  { name: 'Bank of China', slug: 'bank-of-china', logo: 'https://logo.clearbit.com/boc.cn' },
  { name: 'Agricultural Bank of China', slug: 'abc', logo: 'https://logo.clearbit.com/abchina.com' },
  { name: 'State Bank of India', slug: 'sbi', logo: 'https://logo.clearbit.com/sbi.co.in' },
  { name: 'HDFC Bank', slug: 'hdfc-bank', logo: 'https://logo.clearbit.com/hdfcbank.com' },
  { name: 'ICICI Bank', slug: 'icici-bank', logo: 'https://logo.clearbit.com/icicibank.com' },
  { name: 'Axis Bank', slug: 'axis-bank', logo: 'https://logo.clearbit.com/axisbank.com' },
  { name: 'Kotak Mahindra Bank', slug: 'kotak-bank', logo: 'https://logo.clearbit.com/kotak.com' },
  { name: 'Bank of Montreal', slug: 'bank-of-montreal', logo: 'https://logo.clearbit.com/bmo.com' },
  { name: 'Australia and New Zealand Banking Group', slug: 'anz', logo: 'https://logo.clearbit.com/anz.com' },
  { name: 'Commonwealth Bank', slug: 'commonwealth-bank', logo: 'https://logo.clearbit.com/commbank.com.au' },
  { name: 'Westpac', slug: 'westpac', logo: 'https://logo.clearbit.com/westpac.com.au' },
  { name: 'National Australia Bank', slug: 'nab', logo: 'https://logo.clearbit.com/nab.com.au' },
  { name: 'First National Bank (South Africa)', slug: 'fnb', logo: 'https://logo.clearbit.com/fnb.co.za' },
  { name: 'Standard Bank', slug: 'standard-bank', logo: 'https://logo.clearbit.com/standardbank.co.za' },
  { name: 'Nedbank', slug: 'nedbank', logo: 'https://logo.clearbit.com/nedbank.co.za' },
  { name: 'Absa Bank', slug: 'absa-bank', logo: 'https://logo.clearbit.com/absa.co.za' },
  { name: 'Emirates NBD', slug: 'emirates-nbd', logo: 'https://logo.clearbit.com/emiratesnbd.com' },
  { name: 'Qatar National Bank', slug: 'qnb', logo: 'https://logo.clearbit.com/qnb.com' },
  { name: 'Mashreq Bank', slug: 'mashreq', logo: 'https://logo.clearbit.com/mashreqbank.com' },
  { name: 'Banco de Chile', slug: 'banco-de-chile', logo: 'https://logo.clearbit.com/bancochile.cl' },
  { name: 'Banco Itau Chile', slug: 'itau-chile', logo: 'https://logo.clearbit.com/itau.cl' },
  { name: 'Bank Rakyat Indonesia', slug: 'bri', logo: 'https://logo.clearbit.com/bri.co.id' },
  { name: 'Habib Bank', slug: 'habib-bank', logo: 'https://logo.clearbit.com/hbl.com' },
  { name: 'Kiwibank', slug: 'kiwibank', logo: 'https://logo.clearbit.com/kiwibank.co.nz' },
  { name: 'Banco Macro', slug: 'banco-macro', logo: 'https://logo.clearbit.com/macro.com.ar' },
  { name: 'Banorte', slug: 'banorte', logo: 'https://logo.clearbit.com/banorte.com' },
  { name: 'Kenya Commercial Bank', slug: 'kcb', logo: 'https://logo.clearbit.com/kcbgroup.com' },
  { name: 'National Bank of Egypt', slug: 'nbe', logo: 'https://logo.clearbit.com/nbe.com.eg' },
  { name: 'Ziraat Bank', slug: 'ziraat', logo: 'https://logo.clearbit.com/ziraatbank.com.tr' },
  { name: 'Danske Bank', slug: 'danske-bank', logo: 'https://logo.clearbit.com/danskebank.com' },
  { name: 'Skandinaviska Enskilda Banken', slug: 'seb', logo: 'https://logo.clearbit.com/seb.se' },
  { name: 'Nordea Bank', slug: 'nordea', logo: 'https://logo.clearbit.com/nordea.com' },
];

function AccountsPageComponent() {
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
  const {
    isOpen: isLinkOpen,
    onOpen: onLinkOpen,
    onClose: onLinkClose,
  } = useDisclosure();
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [linkForm, setLinkForm] = useState({
    accountNickname: '',
    accountNumber: '',
    accountType: 'checking',
    currency: 'USD',
    initialBalance: '',
  });
  const [linkErrors, setLinkErrors] = useState({
    bank: '',
    accountNumber: '',
    nickname: '',
  });

  const filteredBanks = useMemo(() => {
    if (!bankSearch) {
      return GLOBAL_BANK_DIRECTORY;
    }
    const query = bankSearch.toLowerCase();
    return GLOBAL_BANK_DIRECTORY.filter((bank) =>
      bank.name.toLowerCase().includes(query)
    );
  }, [bankSearch]);

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

  const resetLinkAccountState = () => {
    setBankSearch('');
    setSelectedBank(null);
    setLinkForm({
      accountNickname: '',
      accountNumber: '',
      accountType: 'checking',
      currency: 'USD',
      initialBalance: '',
    });
    setLinkErrors({
      bank: '',
      accountNumber: '',
      nickname: '',
    });
  };

  const handleOpenLinkModal = () => {
    resetLinkAccountState();
    onLinkOpen();
  };

  const handleBankSelection = (bank) => {
    setSelectedBank(bank);
    setLinkErrors((prev) => ({ ...prev, bank: '' }));
    setLinkForm((prev) => ({
      ...prev,
      accountNickname: prev.accountNickname || bank.name,
    }));
  };

  const handleLinkInputChange = (field) => (event) => {
    let value = event.target.value;
    if (field === 'accountNumber') {
      value = value.replace(/\s+/g, '');
    }
    if (field === 'initialBalance' && Number(value) < 0) {
      value = '0';
    }
    setLinkForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'accountNickname') {
      setLinkErrors((prev) => ({ ...prev, nickname: '' }));
    }
    if (field === 'accountNumber') {
      setLinkErrors((prev) => ({ ...prev, accountNumber: '' }));
    }
  };

  const handleCloseLinkModal = () => {
    if (linkingAccount) return;
    resetLinkAccountState();
    onLinkClose();
  };

  const handleSubmitLinkAccount = async () => {
    const nickname = linkForm.accountNickname.trim();
    const accountNumber = linkForm.accountNumber.trim();
    const errors = {
      bank: selectedBank ? '' : 'Select a bank to continue',
      accountNumber: accountNumber ? '' : 'Account number is required',
      nickname: nickname ? '' : 'Nickname is required',
    };
    setLinkErrors(errors);
    if (errors.bank || errors.accountNumber || errors.nickname) {
      return;
    }

    setLinkingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const initialBalanceValue = parseFloat(linkForm.initialBalance || '0') || 0;
      const payload = {
        user_id: user.id,
        account_type: linkForm.accountType,
        account_number: accountNumber,
        account_name: nickname,
        balance: initialBalanceValue,
        currency: linkForm.currency,
        is_primary: accounts.length === 0,
        bank_name: selectedBank?.name || null,
        bank_logo: selectedBank?.logo || null,
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('Unable to link account right now. Please try again.');
      }

      toast({
        title: 'Bank account linked',
        description: `${nickname} has been added to your wallet.`,
        status: 'success',
        duration: 3000,
      });

      resetLinkAccountState();
      onLinkClose();
      loadAccounts();
    } catch (error) {
      console.error('Link account error:', error);
      toast({
        title: 'Failed to link account',
        description: error.message || 'We could not link this account. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLinkingAccount(false);
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
          <Button colorScheme="purple" onClick={handleOpenLinkModal}>
            Link Bank Account
          </Button>
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
                    <HStack spacing={3} flex={1} align="flex-start">
                      <Box
                        w="50px"
                        h="50px"
                        borderRadius="full"
                        bg={
                          account.bank_logo
                            ? 'gray.100'
                            : `${account.account_type === 'checking' ? 'blue' : account.account_type === 'savings' ? 'green' : account.account_type === 'credit' ? 'orange' : 'purple'}.100`
                        }
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                      >
                        {account.bank_logo ? (
                          <Image
                            src={account.bank_logo}
                            alt={`${account.bank_name || account.account_name} logo`}
                            boxSize="36px"
                            objectFit="contain"
                            fallback={
                              <Box
                                boxSize="36px"
                                borderRadius="full"
                                bg="gray.200"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                              >
                                {getAccountIcon(account.account_type)}
                              </Box>
                            }
                          />
                        ) : (
                          getAccountIcon(account.account_type)
                        )}
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
                          {account.bank_name ? `${account.bank_name} • ` : ''}
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

      {/* Link Bank Account Modal */}
      <Modal isOpen={isLinkOpen} onClose={handleCloseLinkModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Link an external bank account</ModalHeader>
          <ModalCloseButton isDisabled={linkingAccount} />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired isInvalid={Boolean(linkErrors.bank)}>
                <FormLabel>Search worldwide banks</FormLabel>
                <Input
                  placeholder="Type bank name (e.g. HSBC, HDFC, Santander)"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  size="lg"
                />
                <Box
                  mt={3}
                  maxH="200px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={2}
                >
                  <VStack align="stretch" spacing={1}>
                    {filteredBanks.length === 0 && (
                      <Text fontSize="sm" color="gray.500" px={2} py={2}>
                        No banks match your search. Try a different name.
                      </Text>
                    )}
                    {filteredBanks.map((bank) => (
                      <Button
                        key={bank.slug}
                        variant={selectedBank?.slug === bank.slug ? 'solid' : 'ghost'}
                        colorScheme={selectedBank?.slug === bank.slug ? 'purple' : 'gray'}
                        justifyContent="flex-start"
                        onClick={() => handleBankSelection(bank)}
                        leftIcon={
                          <Image
                            src={bank.logo}
                            alt={`${bank.name} logo`}
                            boxSize="24px"
                            objectFit="contain"
                            fallback={
                              <Box
                                boxSize="24px"
                                borderRadius="full"
                                bg="gray.200"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Building2 size={14} color="#6b7280" />
                              </Box>
                            }
                          />
                        }
                      >
                        {bank.name}
                      </Button>
                    ))}
                  </VStack>
                </Box>
                <FormErrorMessage>{linkErrors.bank}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={Boolean(linkErrors.nickname)}>
                <FormLabel>Account nickname</FormLabel>
                <Input
                  placeholder="e.g. HSBC Checking"
                  value={linkForm.accountNickname}
                  onChange={handleLinkInputChange('accountNickname')}
                  size="lg"
                />
                <FormErrorMessage>{linkErrors.nickname}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={Boolean(linkErrors.accountNumber)}>
                <FormLabel>Account number</FormLabel>
                <Input
                  placeholder="Enter account number"
                  value={linkForm.accountNumber}
                  onChange={handleLinkInputChange('accountNumber')}
                  size="lg"
                />
                <FormHelperText>We never share this information without your consent.</FormHelperText>
                <FormErrorMessage>{linkErrors.accountNumber}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Account type</FormLabel>
                <Select
                  value={linkForm.accountType}
                  onChange={handleLinkInputChange('accountType')}
                  size="lg"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit</option>
                  <option value="investment">Investment</option>
                </Select>
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={linkForm.currency}
                    onChange={handleLinkInputChange('currency')}
                    size="lg"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Current balance (optional)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={linkForm.initialBalance}
                    onChange={handleLinkInputChange('initialBalance')}
                    placeholder="0.00"
                  />
                </FormControl>
              </HStack>

              <Text fontSize="sm" color="gray.500">
                By linking this account you authorise NovoBank to initiate transfers and display balances on your dashboard.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseLinkModal} isDisabled={linkingAccount}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSubmitLinkAccount} isLoading={linkingAccount}>
              Link account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}

export default dynamic(() => Promise.resolve(AccountsPageComponent), { ssr: false });
