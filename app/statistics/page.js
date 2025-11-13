'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
  Card,
  CardBody,
  Badge,
  useColorModeValue,
  useDisclosure,
  Spinner,
} from '@chakra-ui/react';
import { Grid, ArrowLeft, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import ContactUsModal from '@/components/ContactUsModal';

const CATEGORY_COLORS = {
  'Food & Dining': '#ef4444',
  'Shopping': '#9c27b0',
  'Transportation': '#3b82f6',
  'Bills & Utilities': '#10b981',
  'Entertainment': '#f59e0b',
  'Healthcare': '#ec4899',
  'Education': '#6366f1',
  'Travel': '#14b8a6',
  'Groceries': '#84cc16',
  'Gas': '#f97316',
  'Subscriptions': '#8b5cf6',
  'Deposit': '#22c55e',
  'Transfer': '#e0e0e0',
  'Other': '#94a3b8',
};

export default function StatisticsPage() {
  const [timePeriod, setTimePeriod] = useState('week');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  useEffect(() => {
    setMounted(true);
    loadStatistics();
    loadNotificationCounts();
  }, [timePeriod]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Calculate date range based on time period
      const now = new Date();
      let startDate;
      
      if (timePeriod === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (timePeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timePeriod === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Load transactions for the selected period
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotificationCount((notificationsData || []).length);

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadAlertCount((alertsData || []).length);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  // Calculate spending by category
  const spendingData = useMemo(() => {
    const categoryTotals = {};
    
    transactions.forEach((tx) => {
      if (tx.amount < 0) { // Only count expenses (negative amounts)
        const category = tx.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(parseFloat(tx.amount || 0));
      }
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Other'],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 categories
  }, [transactions]);

  // Calculate total spending
  const totalSpending = useMemo(() => {
    return transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount || 0)), 0);
  }, [transactions]);

  // Calculate total income
  const totalIncome = useMemo(() => {
    return transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
  }, [transactions]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach((tx) => {
      const dateLabel = formatDate(tx.created_at);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(tx);
    });
    return groups;
  }, [transactions]);

  if (!mounted) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Statistic
          </Text>
          <HStack spacing={2}>
            <IconButton
              icon={<MessageCircle size={20} />}
              variant="ghost"
              colorScheme="purple"
              aria-label="Contact Us"
              onClick={onContactOpen}
            />
            <IconButton
              icon={<Grid size={20} />}
              variant="ghost"
              onClick={() => router.push('/widgets')}
              aria-label="Widgets"
            />
          </HStack>
        </Flex>

        <HStack spacing={2} mb={6}>
          {['week', 'month', 'year'].map((period) => (
            <Button
              key={period}
              onClick={() => setTimePeriod(period)}
              size="sm"
              bg={timePeriod === period ? 'brand.600' : 'white'}
              color={timePeriod === period ? 'white' : 'gray.600'}
              _hover={{
                bg: timePeriod === period ? 'brand.700' : 'gray.100',
              }}
              textTransform="capitalize"
            >
              {period}
            </Button>
          ))}
        </HStack>

        {loading ? (
          <Card bg={cardBg} borderRadius="xl" mb={6} boxShadow="md">
            <CardBody>
              <Flex justify="center" align="center" h="200px">
                <Spinner size="lg" color="purple.500" />
              </Flex>
            </CardBody>
          </Card>
        ) : spendingData.length > 0 ? (
          <Card bg={cardBg} borderRadius="xl" mb={6} boxShadow="md">
            <CardBody>
              <VStack spacing={4}>
                <Box w="full" h="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {spendingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Text fontSize="3xl" fontWeight="bold" color="gray.800">
                  {formatCurrency(totalSpending)}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Total spending this {timePeriod}
                  {totalIncome > 0 && ` • Income: ${formatCurrency(totalIncome)}`}
                </Text>
                <VStack spacing={2} align="flex-start" w="full" mt={4}>
                  {spendingData.map((item, index) => (
                    <Flex key={index} justify="space-between" align="center" w="full">
                      <HStack spacing={2}>
                        <Box
                          w="12px"
                          h="12px"
                          borderRadius="full"
                          bg={item.color}
                        />
                        <Text fontSize="sm" color="gray.600">
                          {item.name}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        {formatCurrency(item.value)}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Card bg={cardBg} borderRadius="xl" mb={6} boxShadow="md">
            <CardBody>
              <VStack spacing={4} py={8}>
                <Text fontSize="lg" color="gray.600" textAlign="center">
                  No spending data for this {timePeriod}
                </Text>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Transactions will appear here once you start making payments
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {loading ? (
          <Card bg={cardBg} borderRadius="xl" mb={6} boxShadow="md">
            <CardBody>
              <Flex justify="center" align="center" h="200px">
                <Spinner size="lg" color="purple.500" />
              </Flex>
            </CardBody>
          </Card>
        ) : Object.keys(groupedTransactions).length > 0 ? (
          <VStack spacing={4} align="stretch">
            {Object.entries(groupedTransactions)
              .sort((a, b) => {
                // Sort: Today first, then Yesterday, then by date
                if (a[0] === 'Today') return -1;
                if (b[0] === 'Today') return 1;
                if (a[0] === 'Yesterday') return -1;
                if (b[0] === 'Yesterday') return 1;
                return b[0].localeCompare(a[0]);
              })
              .map(([dateLabel, dateTransactions]) => (
                <Box key={dateLabel}>
                  <Text fontSize="md" fontWeight="semibold" color="gray.600" mb={3}>
                    {dateLabel}
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {dateTransactions.map((transaction, index) => {
                      const recipientName = transaction.recipient_name || transaction.description || 'Transaction';
                      const initial = recipientName[0]?.toUpperCase() || 'T';
                      return (
                        <Card key={`${transaction.id || index}`} bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Box
                                  w="40px"
                                  h="40px"
                                  borderRadius="full"
                                  bg="gray.300"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Text fontSize="sm" fontWeight="bold">
                                    {initial}
                                  </Text>
                                </Box>
                                <VStack align="flex-start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                                    {recipientName}
                                  </Text>
                                  <HStack spacing={2}>
                                    <Text fontSize="xs" color="gray.500">
                                      {formatTime(transaction.created_at)}
                                    </Text>
                                    {transaction.category && (
                                      <>
                                        <Text fontSize="xs" color="gray.400">•</Text>
                                        <Badge fontSize="xs" colorScheme="gray" variant="subtle">
                                          {transaction.category}
                                        </Badge>
                                      </>
                                    )}
                                  </HStack>
                                </VStack>
                              </HStack>
                              <VStack align="flex-end" spacing={0}>
                                <Text
                                  fontSize="sm"
                                  fontWeight="semibold"
                                  color={transaction.amount > 0 ? 'green.500' : 'red.500'}
                                >
                                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                                </Text>
                              </VStack>
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                </Box>
              ))}
          </VStack>
        ) : (
          <Card bg={cardBg} borderRadius="xl" boxShadow="md">
            <CardBody>
              <VStack spacing={4} py={8}>
                <Text fontSize="lg" color="gray.600" textAlign="center">
                  No transactions for this {timePeriod}
                </Text>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Your transaction history will appear here
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}
      </Box>
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}

