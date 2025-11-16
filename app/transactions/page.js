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
  Input,
  Select,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  IconButton,
  useBreakpointValue,
  Heading,
  Badge,
  Divider,
  SimpleGrid,
  Checkbox,
  CheckboxGroup,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Search,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function TransactionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isFilterOpen, onOpen: onFilterOpen, onClose: onFilterClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [filters, setFilters] = useState({
    searchQuery: '',
    accountIds: [],
    categories: [],
    transactionTypes: [],
    dateRange: 'all',
    startDate: '',
    endDate: '',
    amountRange: [0, 10000],
  });

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Transfer', 'Investment', 'Other'];
  const transactionTypes = ['sent', 'received', 'withdrawal', 'deposit'];

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

      if (accountsData) setAccounts(accountsData);

      // Load all transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*, accounts(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (transactionsData) setAllTransactions(transactionsData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        status: 'error',
      });
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

  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions];

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(query) ||
        t.recipient_name?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }

    // Account filter
    if (filters.accountIds.length > 0) {
      filtered = filtered.filter(t => filters.accountIds.includes(t.account_id));
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(t => filters.categories.includes(t.category));
    }

    // Transaction type filter
    if (filters.transactionTypes.length > 0) {
      filtered = filtered.filter(t => filters.transactionTypes.includes(t.transaction_type));
    }

    // Date range filter
    if (filters.dateRange === 'custom') {
      if (filters.startDate) {
        filtered = filtered.filter(t => new Date(t.created_at) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        filtered = filtered.filter(t => new Date(t.created_at) <= new Date(filters.endDate));
      }
    } else if (filters.dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(t => new Date(t.created_at) >= weekAgo);
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(t => new Date(t.created_at) >= monthAgo);
    } else if (filters.dateRange === 'year') {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      filtered = filtered.filter(t => new Date(t.created_at) >= yearAgo);
    }

    // Amount range filter
    filtered = filtered.filter(t => {
      const amount = Math.abs(parseFloat(t.amount));
      return amount >= filters.amountRange[0] && amount <= filters.amountRange[1];
    });

    return filtered;
  }, [allTransactions, filters]);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      accountIds: [],
      categories: [],
      transactionTypes: [],
      dateRange: 'all',
      startDate: '',
      endDate: '',
      amountRange: [0, 10000],
    });
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Description', 'Category', 'Type', 'Amount', 'Account'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        `"${t.description || ''}"`,
        t.category || '',
        t.transaction_type || '',
        t.amount,
        t.accounts?.account_name || '',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Transactions exported successfully',
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

  const activeFiltersCount = 
    (filters.searchQuery ? 1 : 0) +
    filters.accountIds.length +
    filters.categories.length +
    filters.transactionTypes.length +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.amountRange[0] > 0 || filters.amountRange[1] < 10000 ? 1 : 0);

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
          <Heading size="md">Transactions</Heading>
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
        {/* Search and Filters */}
        <Card mb={6}>
          <CardBody>
            <VStack spacing={4}>
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
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  />
                </Box>
                <Button
                  leftIcon={<Filter size={18} />}
                  onClick={onFilterOpen}
                  variant={activeFiltersCount > 0 ? 'solid' : 'outline'}
                  colorScheme={activeFiltersCount > 0 ? 'purple' : 'gray'}
                >
                  Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </Button>
                <Button
                  leftIcon={<Download size={18} />}
                  onClick={handleExport}
                  variant="outline"
                >
                  Export
                </Button>
              </HStack>
              {activeFiltersCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<X size={16} />}
                  onClick={handleResetFilters}
                >
                  Clear Filters
                </Button>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Results Count */}
        <Text fontSize="sm" color="gray.600" mb={4}>
          Showing {filteredTransactions.length} of {allTransactions.length} transactions
        </Text>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardBody>
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No transactions found</Text>
                {activeFiltersCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={handleResetFilters}>
                    Clear filters to see all transactions
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <VStack spacing={3} align="stretch">
            {filteredTransactions.map((transaction) => (
              <Card key={transaction.id} variant="outline">
                <CardBody>
                  <Flex justify="space-between" align="start">
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontWeight="semibold">
                        {transaction.description || 'No description'}
                      </Text>
                      <HStack spacing={2}>
                        <Badge fontSize="xs" colorScheme="purple">
                          {transaction.category || 'Other'}
                        </Badge>
                        <Badge fontSize="xs" colorScheme="blue">
                          {transaction.transaction_type}
                        </Badge>
                        {transaction.accounts && (
                          <Text fontSize="xs" color="gray.600">
                            {transaction.accounts.account_name}
                          </Text>
                        )}
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        {formatDate(transaction.created_at)}
                      </Text>
                    </VStack>
                    <Text
                      fontSize="lg"
                      fontWeight="bold"
                      color={parseFloat(transaction.amount) >= 0 ? 'green.500' : 'red.500'}
                    >
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </Flex>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </Box>

      {/* Filters Modal */}
      <Modal isOpen={isFilterOpen} onClose={onFilterClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Filter Transactions</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Accounts</FormLabel>
                <CheckboxGroup
                  value={filters.accountIds}
                  onChange={(value) => setFilters({ ...filters, accountIds: value })}
                >
                  <VStack align="start" spacing={2}>
                    {accounts.map((account) => (
                      <Checkbox key={account.id} value={account.id}>
                        {account.account_name}
                      </Checkbox>
                    ))}
                  </VStack>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Categories</FormLabel>
                <CheckboxGroup
                  value={filters.categories}
                  onChange={(value) => setFilters({ ...filters, categories: value })}
                >
                  <SimpleGrid columns={2} spacing={2}>
                    {categories.map((category) => (
                      <Checkbox key={category} value={category}>
                        {category}
                      </Checkbox>
                    ))}
                  </SimpleGrid>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Transaction Types</FormLabel>
                <CheckboxGroup
                  value={filters.transactionTypes}
                  onChange={(value) => setFilters({ ...filters, transactionTypes: value })}
                >
                  <SimpleGrid columns={2} spacing={2}>
                    {transactionTypes.map((type) => (
                      <Checkbox key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Checkbox>
                    ))}
                  </SimpleGrid>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Date Range</FormLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </Select>
              </FormControl>

              {filters.dateRange === 'custom' && (
                <>
                  <FormControl>
                    <FormLabel>Start Date</FormLabel>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>End Date</FormLabel>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </FormControl>
                </>
              )}

              <FormControl>
                <FormLabel>Amount Range: {formatCurrency(filters.amountRange[0])} - {formatCurrency(filters.amountRange[1])}</FormLabel>
                <RangeSlider
                  value={filters.amountRange}
                  onChange={(value) => setFilters({ ...filters, amountRange: value })}
                  min={0}
                  max={10000}
                  step={100}
                >
                  <RangeSliderTrack>
                    <RangeSliderFilledTrack />
                  </RangeSliderTrack>
                  <RangeSliderThumb index={0} />
                  <RangeSliderThumb index={1} />
                </RangeSlider>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleResetFilters}>
              Reset
            </Button>
            <Button colorScheme="purple" onClick={onFilterClose}>
              Apply Filters
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

