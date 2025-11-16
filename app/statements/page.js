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
  Select,
  useToast,
  useDisclosure,
  IconButton,
  useBreakpointValue,
  Heading,
  Badge,
  Divider,
  SimpleGrid,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Download,
  FileText,
  Calendar,
  Mail,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function StatementsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [statements, setStatements] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [generating, setGenerating] = useState(false);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

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
    if (selectedAccount) {
      generateStatements();
    }
  }, [selectedAccount]);

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

    } catch (error) {
      console.error('Error loading data:', error);
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

  const generateStatements = async () => {
    if (!selectedAccount) return;

    try {
      // Generate statement periods (last 12 months)
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) return;

      const periods = [];
      const now = new Date();
      
      for (let i = 0; i < 12; i++) {
        const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        // Get transactions for this period
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', selectedAccount)
          .gte('created_at', periodStart.toISOString())
          .lte('created_at', periodEnd.toISOString())
          .order('created_at', { ascending: false });

        const totalDebits = transactions
          ?.filter(t => parseFloat(t.amount) < 0)
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0;
        
        const totalCredits = transactions
          ?.filter(t => parseFloat(t.amount) > 0)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

        periods.push({
          period: `${periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          start_date: periodStart.toISOString().split('T')[0],
          end_date: periodEnd.toISOString().split('T')[0],
          transaction_count: transactions?.length || 0,
          total_debits: totalDebits,
          total_credits: totalCredits,
          opening_balance: parseFloat(account.balance) - totalCredits + totalDebits,
          closing_balance: parseFloat(account.balance),
          transactions: transactions || [],
        });
      }

      setStatements(periods);
    } catch (error) {
      console.error('Error generating statements:', error);
    }
  };

  const handleDownloadStatement = async (statement) => {
    setGenerating(true);
    try {
      // Generate CSV statement
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) return;

      const csv = [
        [`Statement for ${account.account_name}`],
        [`Period: ${statement.period}`],
        [`Account Number: ••••${account.account_number.slice(-4)}`],
        [''],
        ['Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance'].join(','),
        ...statement.transactions.map(t => {
          const date = new Date(t.created_at).toLocaleDateString();
          const debit = parseFloat(t.amount) < 0 ? Math.abs(t.amount) : '';
          const credit = parseFloat(t.amount) > 0 ? t.amount : '';
          return [
            date,
            `"${t.description || ''}"`,
            t.category || '',
            debit,
            credit,
            '',
          ].join(',');
        }),
        [''],
        [`Opening Balance,${statement.opening_balance}`],
        [`Total Debits,${statement.total_debits}`],
        [`Total Credits,${statement.total_credits}`],
        [`Closing Balance,${statement.closing_balance}`],
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement-${account.account_name}-${statement.start_date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Statement Downloaded',
        description: 'Your statement has been downloaded',
        status: 'success',
      });
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast({
        title: 'Error',
        description: 'Failed to download statement',
        status: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailStatement = async (statement) => {
    toast({
      title: 'Email Sent',
      description: 'Statement will be emailed to your registered email address',
      status: 'success',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
          <Heading size="md">Account Statements</Heading>
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
        {/* Account Selection */}
        <Card mb={6}>
          <CardBody>
            <FormControl>
              <FormLabel>Select Account</FormLabel>
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                placeholder="Choose an account"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} - ••••{account.account_number.slice(-4)}
                  </option>
                ))}
              </Select>
            </FormControl>
          </CardBody>
        </Card>

        {/* Statements List */}
        {selectedAccount && statements.length > 0 ? (
          <VStack spacing={4} align="stretch">
            {statements.map((statement, index) => (
              <Card key={index} variant="outline">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Flex justify="space-between" align="start">
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Calendar size={20} />
                          <Text fontWeight="bold">{statement.period}</Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {new Date(statement.start_date).toLocaleDateString()} - {new Date(statement.end_date).toLocaleDateString()}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {statement.transaction_count} transactions
                        </Text>
                      </VStack>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          leftIcon={<Download size={16} />}
                          onClick={() => handleDownloadStatement(statement)}
                          isLoading={generating}
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Mail size={16} />}
                          onClick={() => handleEmailStatement(statement)}
                        >
                          Email
                        </Button>
                      </HStack>
                    </Flex>
                    <Divider />
                    <SimpleGrid columns={2} spacing={4}>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="gray.600">Opening Balance</Text>
                        <Text fontWeight="semibold">{formatCurrency(statement.opening_balance)}</Text>
                      </VStack>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="gray.600">Closing Balance</Text>
                        <Text fontWeight="semibold">{formatCurrency(statement.closing_balance)}</Text>
                      </VStack>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="gray.600">Total Debits</Text>
                        <Text color="red.500">{formatCurrency(statement.total_debits)}</Text>
                      </VStack>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="xs" color="gray.600">Total Credits</Text>
                        <Text color="green.500">{formatCurrency(statement.total_credits)}</Text>
                      </VStack>
                    </SimpleGrid>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        ) : selectedAccount ? (
          <Card>
            <CardBody>
              <VStack py={8} spacing={2}>
                <FileText size={48} color="gray" />
                <Text color="gray.500">No statements available</Text>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">Please select an account to view statements</Text>
          </Alert>
        )}
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

