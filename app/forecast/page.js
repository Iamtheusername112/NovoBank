'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Divider,
  SimpleGrid,
  Alert,
  AlertIcon,
  Progress,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ForecastPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [forecastPeriod, setForecastPeriod] = useState('3months');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

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
      loadTransactions();
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

  const loadTransactions = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !selectedAccount) return;

      // Load last 6 months of transactions
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', selectedAccount)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (transactionsData) setTransactions(transactionsData);

    } catch (error) {
      console.error('Error loading transactions:', error);
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

  const forecastData = useMemo(() => {
    if (!transactions.length || !selectedAccount) return [];

    const account = accounts.find(a => a.id === selectedAccount);
    if (!account) return [];

    // Group transactions by month
    const monthlyData = {};
    transactions.forEach(txn => {
      const date = new Date(txn.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, count: 0 };
      }
      const amount = parseFloat(txn.amount);
      if (amount > 0) {
        monthlyData[monthKey].income += amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(amount);
      }
      monthlyData[monthKey].count++;
    });

    // Calculate averages
    const months = Object.keys(monthlyData).sort();
    const avgIncome = months.reduce((sum, key) => sum + monthlyData[key].income, 0) / months.length;
    const avgExpenses = months.reduce((sum, key) => sum + monthlyData[key].expenses, 0) / months.length;

    // Generate forecast
    const forecastMonths = forecastPeriod === '3months' ? 3 : forecastPeriod === '6months' ? 6 : 12;
    const forecast = [];
    let currentBalance = parseFloat(account.balance);

    for (let i = 0; i < forecastMonths; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Apply trend (simple linear regression)
      const trendFactor = 1 + (i * 0.02); // 2% growth assumption
      const projectedIncome = avgIncome * trendFactor;
      const projectedExpenses = avgExpenses * trendFactor;
      
      currentBalance = currentBalance + projectedIncome - projectedExpenses;

      forecast.push({
        month: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: projectedIncome,
        expenses: projectedExpenses,
        balance: currentBalance,
        net: projectedIncome - projectedExpenses,
      });
    }

    return forecast;
  }, [transactions, selectedAccount, accounts, forecastPeriod]);

  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const avgMonthlyIncome = forecastData.length > 0 
    ? forecastData.reduce((sum, d) => sum + d.income, 0) / forecastData.length 
    : 0;
  const avgMonthlyExpenses = forecastData.length > 0 
    ? forecastData.reduce((sum, d) => sum + d.expenses, 0) / forecastData.length 
    : 0;
  const projectedBalance = forecastData.length > 0 
    ? forecastData[forecastData.length - 1].balance 
    : currentAccount?.balance || 0;

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
          <Heading size="md">Spending Forecast</Heading>
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
            <VStack spacing={4}>
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                placeholder="Choose an account"
                w="full"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} - {formatCurrency(account.balance)}
                  </option>
                ))}
              </Select>
              <Select
                value={forecastPeriod}
                onChange={(e) => setForecastPeriod(e.target.value)}
                w="full"
              >
                <option value="3months">3 Months Forecast</option>
                <option value="6months">6 Months Forecast</option>
                <option value="12months">12 Months Forecast</option>
              </Select>
            </VStack>
          </CardBody>
        </Card>

        {selectedAccount && forecastData.length > 0 ? (
          <>
            {/* Summary Cards */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
              <Card>
                <CardBody>
                  <VStack spacing={2}>
                    <TrendingUp size={24} color="var(--chakra-colors-green-500)" />
                    <Text fontSize="sm" color="gray.600">Avg Monthly Income</Text>
                    <Text fontSize="xl" fontWeight="bold" color="green.500">
                      {formatCurrency(avgMonthlyIncome)}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <VStack spacing={2}>
                    <TrendingDown size={24} color="var(--chakra-colors-red-500)" />
                    <Text fontSize="sm" color="gray.600">Avg Monthly Expenses</Text>
                    <Text fontSize="xl" fontWeight="bold" color="red.500">
                      {formatCurrency(avgMonthlyExpenses)}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <VStack spacing={2}>
                    <DollarSign size={24} color="var(--chakra-colors-purple-500)" />
                    <Text fontSize="sm" color="gray.600">Projected Balance</Text>
                    <Text fontSize="xl" fontWeight="bold" color="purple.500">
                      {formatCurrency(projectedBalance)}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Forecast Chart */}
            <Card mb={6}>
              <CardBody>
                <Heading size="sm" mb={4}>Forecast Trend</Heading>
                <Box h="300px" w="full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                      <Line type="monotone" dataKey="balance" stroke="#8b5cf6" name="Balance" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardBody>
            </Card>

            {/* Monthly Forecast */}
            <Card>
              <CardBody>
                <Heading size="sm" mb={4}>Monthly Forecast</Heading>
                <VStack spacing={3} align="stretch">
                  {forecastData.map((data, index) => (
                    <Card key={index} variant="outline">
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between" align="center">
                            <Text fontWeight="bold">{data.month}</Text>
                            <Text fontWeight="bold" color="purple.600">
                              {formatCurrency(data.balance)}
                            </Text>
                          </Flex>
                          <Divider />
                          <SimpleGrid columns={2} spacing={4}>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="xs" color="gray.600">Income</Text>
                              <Text fontWeight="semibold" color="green.500">
                                {formatCurrency(data.income)}
                              </Text>
                            </VStack>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="xs" color="gray.600">Expenses</Text>
                              <Text fontWeight="semibold" color="red.500">
                                {formatCurrency(data.expenses)}
                              </Text>
                            </VStack>
                          </SimpleGrid>
                          <Progress
                            value={(data.net / data.income) * 100}
                            colorScheme={data.net >= 0 ? 'green' : 'red'}
                            size="sm"
                            borderRadius="full"
                          />
                          <Text fontSize="xs" color="gray.600">
                            Net: {formatCurrency(data.net)}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </>
        ) : selectedAccount ? (
          <Card>
            <CardBody>
              <VStack py={8} spacing={2}>
                <Calendar size={48} color="gray" />
                <Text color="gray.500">Insufficient data for forecast</Text>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  We need at least 3 months of transaction history to generate a forecast.
                </Text>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">Please select an account to view forecast</Text>
          </Alert>
        )}
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

