'use client';

import dynamic from 'next/dynamic';
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
  Avatar,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Progress,
  Input,
  useBreakpointValue,
  Grid,
  SimpleGrid,
  Stack,
  Divider,
  Heading,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  Lock,
  Search,
  CreditCard,
  Wifi,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Upload,
  Camera,
  X,
  Send,
  Receipt,
  Shield,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  Gift,
  Wallet,
  PiggyBank,
  BarChart3,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

const COLORS = ['#9c27b0', '#ec4899', '#f97316', '#ef4444', '#10b981', '#3b82f6'];

function WalletPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure();
  const { isOpen: isTransferOpen, onOpen: onTransferOpen, onClose: onTransferClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();
  
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [promotions, setPromotions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [spendingData, setSpendingData] = useState([]);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user - check session first, then user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Get user with the session
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        router.push('/login');
        return;
      }
      
      setUser(currentUser);

      // Load profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      setProfile(profileData);

      // Load cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      setCards(cardsData || []);

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('is_primary', { ascending: false });
      setAccounts(accountsData || []);

      // Calculate total balance
      const cardsBalance = cardsData?.reduce((sum, card) => sum + parseFloat(card.balance || 0), 0) || 0;
      const accountsBalance = accountsData?.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0) || 0;
      setTotalBalance(cardsBalance + accountsBalance);

      // Load transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setTransactions(transactionsData || []);

      // Calculate spending by category
      const categorySpending = {};
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      transactionsData?.forEach(txn => {
        const txnDate = new Date(txn.created_at);
        if (txnDate.getMonth() === thisMonth && txnDate.getFullYear() === thisYear && txn.amount < 0) {
          const category = txn.category || 'Other';
          categorySpending[category] = (categorySpending[category] || 0) + Math.abs(txn.amount);
        }
      });

      const spendingArray = Object.entries(categorySpending).map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        color: COLORS[Object.keys(categorySpending).indexOf(name) % COLORS.length],
      }));
      setSpendingData(spendingArray);
      setMonthlySpending(Object.values(categorySpending).reduce((sum, val) => sum + val, 0));

      // Load notifications (all unread for count, but limit display to 5)
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      const allNotifications = notificationsData || [];
      setUnreadNotificationCount(allNotifications.length);
      setNotifications(allNotifications.slice(0, 5)); // Store only 5 for display

      // Load alerts (all unread for count, but limit display to 5)
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      const allAlerts = alertsData || [];
      setUnreadAlertCount(allAlerts.length);
      setAlerts(allAlerts.slice(0, 5)); // Store only 5 for display

      // Load promotions
      const { data: promotionsData } = await supabase
        .from('promotions')
        .select('*')
        .or(`user_id.eq.${currentUser.id},user_id.is.null`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      setPromotions(promotionsData || []);

      // Load budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('month', thisMonth + 1)
        .eq('year', thisYear);
      setBudgets(budgetsData || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG or PNG image',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'File must be less than 5MB',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // Upload to user's folder: profile-images/{user_id}/filename
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image_url: publicUrl });
      toast({
        title: 'Success',
        description: 'Profile image updated',
        status: 'success',
        duration: 3000,
      });
      onProfileClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleQuickAction = (action) => {
    const status = profile?.account_status || 'active';
    if (status !== 'active') {
      toast({
        title: status === 'blocked' ? 'Account blocked' : 'Account under review',
        description:
          profile?.account_status_reason ||
          'This action is temporarily disabled. Please contact support for assistance.',
        status: status === 'blocked' ? 'error' : 'warning',
        duration: 4000,
      });
      return;
    }

    switch (action) {
      case 'transfer':
        router.push('/send-money');
        break;
      case 'freeze':
        // Toggle card freeze
        if (cards.length > 0) {
          const card = cards[0];
          supabase
            .from('cards')
            .update({ is_frozen: !card.is_frozen })
            .eq('id', card.id)
            .then(() => {
              loadDashboardData();
              toast({
                title: card.is_frozen ? 'Card Unfrozen' : 'Card Frozen',
                description: `Card has been ${card.is_frozen ? 'unfrozen' : 'frozen'}`,
                status: 'success',
                duration: 3000,
              });
            });
        }
        break;
      case 'deposit':
        router.push('/deposit');
        break;
      case 'bills':
        router.push('/bills');
        break;
      default:
        break;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const isDesktop = useBreakpointValue({ base: false, lg: true });

  // Prevent hydration mismatch by not rendering until mounted
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

  const primaryCard = cards.find(c => !c.is_frozen) || cards[0];
  const unreadCount = unreadNotificationCount + unreadAlertCount;
  const accountStatus = profile?.account_status || 'active';
  const accountStatusReason = profile?.account_status_reason || '';
  const canTransact = accountStatus === 'active';
  const statusBanner =
    accountStatus !== 'active' ? (
      <Alert status={accountStatus === 'blocked' ? 'error' : 'warning'} borderRadius="lg" mb={4}>
        <AlertIcon />
        <VStack align="flex-start" spacing={0}>
          <Text fontWeight="semibold" color="gray.800">
            {accountStatus === 'blocked' ? 'Account blocked' : 'Account under review'}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {accountStatusReason ||
              'Transfers and deposits are temporarily disabled. Please contact support for assistance.'}
          </Text>
        </VStack>
      </Alert>
    ) : null;

  const mobileLayout = (
    <Box minH="100vh" bg={bgColor} pb="80px">
      <StatusBar />

      {/* Header */}
      <Box px={4} py={4} bg={cardBg} borderBottom="1px" borderColor="gray.200">
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Avatar
              size="md"
              src={profile?.profile_image_url}
              name={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
              cursor="pointer"
              onClick={onProfileOpen}
            />
            <VStack align="flex-start" spacing={0}>
              <Text fontSize="sm" color="gray.500">Welcome back,</Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {profile?.first_name || 'User'}
              </Text>
            </VStack>
          </HStack>
          <HStack spacing={2}>
            <NotificationBell count={unreadCount} size={20} />
            <IconButton
              icon={<MessageCircle size={20} />}
              variant="ghost"
              colorScheme="purple"
              aria-label="Contact Us"
              onClick={onContactOpen}
            />
            <IconButton
              icon={<Settings size={20} />}
              variant="ghost"
              aria-label="Settings"
              onClick={() => router.push('/profile')}
            />
          </HStack>
        </Flex>
      </Box>

      <Box px={4} py={4}>
        {statusBanner}
        {/* Account Overview */}
        <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                Total Balance
              </Text>
              <Text fontSize="4xl" fontWeight="bold" color="gray.800">
                {formatCurrency(totalBalance)}
              </Text>

              {accounts.length > 0 && (
                <VStack align="stretch" spacing={2}>
                  {accounts.slice(0, 3).map((account) => (
                    <HStack
                      key={account.id}
                      justify="space-between"
                      p={2}
                      bg="gray.50"
                      borderRadius="md"
                      cursor="pointer"
                      onClick={() => router.push('/accounts')}
                      _hover={{ bg: 'gray.100' }}
                    >
                      <VStack align="flex-start" spacing={0}>
                        <HStack spacing={2}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                            {account.account_name}
                          </Text>
                          {account.is_primary && (
                            <Badge colorScheme="purple" fontSize="xs" borderRadius="full">
                              Primary
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          {account.account_type.toUpperCase()} ••••{account.account_number.slice(-4)}
                        </Text>
                      </VStack>
                      <Text fontSize="lg" fontWeight="bold" color="gray.800">
                        {formatCurrency(account.balance)}
                      </Text>
                    </HStack>
                  ))}
                  {accounts.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/accounts')}
                      mt={2}
                    >
                      View All Accounts ({accounts.length})
                    </Button>
                  )}
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Primary Card */}
        {primaryCard && (
          <Card
            bgGradient="linear(to-r, gray.800, purple.500, pink.400, blue.400)"
            color="white"
            borderRadius="xl"
            mb={4}
            boxShadow="lg"
            minH="200px"
          >
            <CardBody p={6}>
              <Flex justify="space-between" mb={4}>
                <CreditCard size={24} />
                <Wifi size={24} />
              </Flex>
              <VStack align="flex-start" spacing={2} mt={8}>
                <Text fontSize="sm" opacity={0.9}>
                  Card Balance
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatCurrency(primaryCard.balance)}
                </Text>
                <Text fontSize="sm" mt={4}>
                  {primaryCard.card_holder_name} •••• {primaryCard.card_number.slice(-4)}
                </Text>
                <Text fontSize="xs" opacity={0.8}>
                  Expires {primaryCard.expiry_date}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Quick Actions */}
        <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md">
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                Quick Actions
              </Text>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="purple"
                onClick={() => router.push('/scheduled-payments')}
              >
                View Scheduled
              </Button>
            </HStack>
            <HStack spacing={3} justify="space-around">
              {[
                { icon: Send, label: 'Transfer', action: 'transfer', color: 'purple' },
                { icon: Receipt, label: 'Pay Bills', action: 'bills', color: 'blue' },
                { icon: Upload, label: 'Deposit', action: 'deposit', color: 'green' },
                { icon: Shield, label: primaryCard?.is_frozen ? 'Unfreeze' : 'Freeze', action: 'freeze', color: 'orange' },
              ].map(({ icon: Icon, label, action, color }) => (
                <VStack
                  key={action}
                  spacing={2}
                  cursor="pointer"
                  onClick={() => handleQuickAction(action)}
                  opacity={canTransact ? 1 : 0.5}
                  aria-disabled={!canTransact}
                >
                  <Box
                    w="50px"
                    h="50px"
                    borderRadius="full"
                    bg={`${color}.100`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon size={24} color={`var(--chakra-colors-${color}-500)`} />
                  </Box>
                  <Text fontSize="xs" color="gray.600" textAlign="center">
                    {label}
                  </Text>
                </VStack>
              ))}
            </HStack>
          </CardBody>
        </Card>

        {/* Spending Analytics */}
        {spendingData.length > 0 && (
          <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                  Spending This Month
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  rightIcon={<ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
                  onClick={() => router.push('/statistics')}
                >
                  View All
                </Button>
              </Flex>

              <Box w="full" h="200px" mb={4}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <VStack spacing={2} align="flex-start">
                {spendingData.slice(0, 4).map((item, index) => (
                  <HStack key={index} spacing={2} w="full" justify="space-between">
                    <HStack spacing={2}>
                      <Box w="12px" h="12px" borderRadius="full" bg={item.color} />
                      <Text fontSize="sm" color="gray.600">
                        {item.name}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                      {formatCurrency(item.value)}
                    </Text>
                  </HStack>
                ))}
              </VStack>

              <Box mt={4} p={3} bg="purple.50" borderRadius="md">
                <Text fontSize="sm" color="gray.700">
                  Total: <Text as="span" fontWeight="bold">{formatCurrency(monthlySpending)}</Text>
                </Text>
              </Box>
            </CardBody>
          </Card>
        )}

        {/* Budget Progress */}
        {budgets.length > 0 && (
          <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                  Budget Progress
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="purple"
                  onClick={() => router.push('/budget')}
                >
                  Manage
                </Button>
              </Flex>
              <VStack spacing={3} align="stretch">
                {budgets.slice(0, 3).map((budget) => {
                  const percentage = (budget.current_spending / budget.monthly_limit) * 100;
                  const isOver = budget.current_spending > budget.monthly_limit;
                  return (
                    <Box key={budget.id}>
                      <Flex justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                          {budget.category}
                        </Text>
                        <Text fontSize="sm" color={isOver ? 'red.500' : 'gray.600'}>
                          {formatCurrency(budget.current_spending)} / {formatCurrency(budget.monthly_limit)}
                        </Text>
                      </Flex>
                      <Progress
                        value={Math.min(percentage, 100)}
                        colorScheme={isOver ? 'red' : percentage > 80 ? 'orange' : 'green'}
                        borderRadius="full"
                        size="sm"
                      />
                    </Box>
                  );
                })}
                {budgets.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/budget')}
                    mt={2}
                  >
                    View All Budgets ({budgets.length})
                  </Button>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md" borderLeft="4px" borderColor="orange.500">
            <CardBody>
              <HStack spacing={2} mb={3}>
                <AlertCircle size={20} color="var(--chakra-colors-orange-500)" />
                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                  Alerts
                </Text>
              </HStack>
              <VStack spacing={2} align="stretch">
                {alerts.slice(0, 3).map((alert) => (
                  <Box
                    key={alert.id}
                    p={3}
                    bg={alert.severity === 'critical' ? 'red.50' : 'orange.50'}
                    borderRadius="md"
                  >
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                      {alert.title}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      {alert.message}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Promotions */}
        {promotions.length > 0 && (
          <Card bgGradient="linear(to-r, purple.500, pink.500)" color="white" borderRadius="xl" mb={4} boxShadow="md">
            <CardBody>
              <HStack spacing={2} mb={3}>
                <Gift size={20} />
                <Text fontSize="lg" fontWeight="semibold">
                  Special Offers
                </Text>
              </HStack>
              <VStack spacing={2} align="stretch">
                {promotions.map((promo) => (
                  <Box key={promo.id} p={3} bg="whiteAlpha.200" borderRadius="md">
                    <Text fontSize="sm" fontWeight="semibold">
                      {promo.title}
                    </Text>
                    <Text fontSize="xs" opacity={0.9}>
                      {promo.description}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md">
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                Recent Transactions
              </Text>
              <Button
                size="sm"
                variant="ghost"
                rightIcon={<ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
                onClick={() => router.push('/statistics')}
              >
                View All
              </Button>
            </Flex>
            <VStack spacing={3} align="stretch">
              {transactions.length > 0 ? (
                transactions.map((transaction) => {
                  return (
                    <HStack key={transaction.id} justify="space-between" p={2} borderRadius="md" _hover={{ bg: 'gray.50' }}>
                      <HStack spacing={3}>
                        <Box
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          bg={transaction.amount > 0 ? 'green.100' : 'red.100'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {transaction.amount > 0 ? (
                            <ArrowDownRight size={20} color="var(--chakra-colors-green-500)" />
                          ) : (
                            <ArrowUpRight size={20} color="var(--chakra-colors-red-500)" />
                          )}
                        </Box>
                        <VStack align="flex-start" spacing={0}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                            {transaction.recipient_name || transaction.description || 'Transaction'}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(transaction.created_at)} • {transaction.category}
                          </Text>
                        </VStack>
                      </HStack>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color={transaction.amount > 0 ? 'green.500' : 'red.500'}
                      >
                        {transaction.amount > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </Text>
                    </HStack>
                  );
                })
              ) : (
                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                  No transactions yet
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Send Again */}
        <Card bg={cardBg} borderRadius="xl" mb={4} boxShadow="md">
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                Send Again
              </Text>
              <IconButton
                icon={<ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
                variant="ghost"
                size="sm"
                aria-label="See more recipients"
                onClick={() => router.push('/send-money')}
              />
            </Flex>
            <HStack spacing={4} overflowX="auto" pb={2} css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
              {transactions
                .filter(t => t.recipient_name)
                .slice(0, 5)
                .map((transaction, index) => (
                  <VStack
                    key={index}
                    spacing={2}
                    minW="70px"
                    flexShrink={0}
                    cursor="pointer"
                    onClick={() => router.push('/send-money')}
                    align="center"
                  >
                    <Box
                      w="56px"
                      h="56px"
                      borderRadius="full"
                      bg="gray.300"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text fontSize="md" fontWeight="bold">
                        {transaction.recipient_name[0]}
                      </Text>
                    </Box>
                    <Text 
                      fontSize="xs" 
                      color="gray.600"
                      textAlign="center"
                      noOfLines={1}
                      maxW="70px"
                    >
                      {transaction.recipient_name}
                    </Text>
                  </VStack>
                ))}
              {transactions.length === 0 && (
                <Text fontSize="sm" color="gray.500">
                  No recent recipients
                </Text>
              )}
            </HStack>
          </CardBody>
        </Card>
      </Box>

      <BottomNavigation unreadCount={unreadCount} />
    </Box>
  );

  const desktopLayout = (
    <Box minH="100vh" bg="gray.50" pb={10}>
      <Flex
        px={12}
        py={6}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        justify="space-between"
        align="center"
        boxShadow="sm"
      >
        <VStack align="flex-start" spacing={1}>
          <Text fontSize="sm" color="gray.500">Dashboard</Text>
          <Heading size="lg" color="gray.800">
            Good {getGreeting()}, {profile?.first_name || 'User'}
          </Heading>
        </VStack>
        <HStack spacing={4}>
          <Button
            leftIcon={<ArrowUpRight size={18} />}
            colorScheme="purple"
            variant="solid"
            onClick={() => router.push('/send-money')}
            isDisabled={!canTransact}
          >
            New Transfer
          </Button>
          <NotificationBell count={unreadCount} size={22} />
          <Avatar
            size="sm"
            src={profile?.profile_image_url}
            name={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
            cursor="pointer"
            onClick={onProfileOpen}
          />
        </HStack>
      </Flex>

      {statusBanner && (
        <Box px={12} pt={6}>
          {statusBanner}
        </Box>
      )}

      <Grid templateColumns="320px minmax(0, 1fr) 360px" gap={6} px={12} py={8} alignItems="start">
        <VStack spacing={6} align="stretch">
          <Card bg="white" borderRadius="xl" boxShadow="md">
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack spacing={3}>
                  <Avatar
                    size="lg"
                    src={profile?.profile_image_url}
                    name={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
                  />
                  <Box>
                    <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                      {profile?.first_name || 'User'} {profile?.last_name || ''}
                    </Text>
                    <Text fontSize="sm" color="gray.500">{user?.email}</Text>
                  </Box>
                </HStack>
                <Divider />
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.500">Primary Account</Text>
                  {accounts.length > 0 ? (
                    <Box>
                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                        {accounts[0].account_name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {accounts[0].account_type.toUpperCase()} ••••{accounts[0].account_number.slice(-4)}
                      </Text>
                      <Text fontSize="xl" fontWeight="bold" color="gray.800" mt={2}>
                        {formatCurrency(accounts[0].balance)}
                      </Text>
                    </Box>
                  ) : (
                    <Text fontSize="sm" color="gray.500">No accounts linked yet.</Text>
                  )}
                </VStack>
                <Button variant="outline" leftIcon={<Settings size={16} />} onClick={() => router.push('/profile')}>
                  Manage Profile
                </Button>
                <Button variant="outline" colorScheme="purple" size="sm" onClick={onContactOpen}>
                  Contact Us
                </Button>
              </VStack>
            </CardBody>
          </Card>

          <Card bg="white" borderRadius="xl" boxShadow="md">
            <CardBody>
              <HStack justify="space-between" mb={4}>
                <Heading size="sm">Notifications</Heading>
                <Button variant="ghost" size="xs" onClick={() => router.push('/notifications')}>
                  View all
                </Button>
              </HStack>
              <VStack spacing={3} align="stretch">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <Box key={item.id} p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">{item.title || 'Notification'}</Text>
                      <Text fontSize="xs" color="gray.600">{item.message}</Text>
                    </Box>
                  ))
                ) : (
                  <Text fontSize="sm" color="gray.500">You're all caught up!</Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {alerts.length > 0 && (
            <Card bg="white" borderRadius="xl" boxShadow="md">
              <CardBody>
                <HStack spacing={2} mb={4}>
                  <AlertCircle size={20} color="var(--chakra-colors-red-500)" />
                  <Heading size="sm">Alerts</Heading>
                </HStack>
                <VStack spacing={3} align="stretch">
                  {alerts.map((alert) => (
                    <Box key={alert.id} p={3} bg={alert.severity === 'critical' ? 'red.50' : 'orange.50'} borderRadius="md">
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">{alert.title}</Text>
                      <Text fontSize="xs" color="gray.600">{alert.message}</Text>
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>

        <VStack spacing={6} align="stretch">
          <Card bgGradient="linear(to-r, purple.500, pink.500)" color="white" borderRadius="xl" boxShadow="lg">
            <CardBody>
              <Flex justify="space-between" align="start">
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" opacity={0.9}>Total Balance</Text>
                  <Heading size="lg">{formatCurrency(totalBalance)}</Heading>
                  <Text fontSize="xs" opacity={0.8}>
                    Across {accounts.length} accounts
                  </Text>
                </VStack>
                <VStack spacing={3} align="flex-end">
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="whiteAlpha"
                    leftIcon={<Upload size={16} />}
                    onClick={() => handleQuickAction('deposit')}
                    isDisabled={!canTransact}
                  >
                    Deposit funds
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="whiteAlpha"
                    leftIcon={<Send size={16} />}
                    onClick={() => handleQuickAction('transfer')}
                    isDisabled={!canTransact}
                  >
                    Quick transfer
                  </Button>
                </VStack>
              </Flex>
            </CardBody>
          </Card>

          {accounts.length > 0 && (
            <Card bg="white" borderRadius="xl" boxShadow="md">
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Heading size="sm">Accounts</Heading>
                  <Button variant="ghost" size="xs" onClick={() => router.push('/accounts')}>
                    Manage
                  </Button>
                </HStack>
                <SimpleGrid columns={2} spacing={4}>
                  {accounts.slice(0, 4).map((account) => (
                    <Box key={account.id} p={4} bg="gray.50" borderRadius="lg">
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                          {account.account_name}
                        </Text>
                        {account.is_primary && (
                          <Badge colorScheme="purple" fontSize="xs">Primary</Badge>
                        )}
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        {account.account_type.toUpperCase()} ••••{account.account_number.slice(-4)}
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.800" mt={2}>
                        {formatCurrency(account.balance)}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                {accounts.length > 4 && (
                  <Button variant="ghost" size="sm" mt={3} onClick={() => router.push('/accounts')}>
                    View all ({accounts.length})
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {primaryCard && (
            <Card bg="white" borderRadius="xl" boxShadow="md">
              <CardBody>
                <Heading size="sm" mb={4}>Primary Card</Heading>
                <Box
                  borderRadius="xl"
                  bgGradient="linear(to-r, gray.800, purple.600)"
                  color="white"
                  p={6}
                  minH="200px"
                >
                  <Flex justify="space-between">
                    <CreditCard size={28} />
                    <Wifi size={24} />
                  </Flex>
                  <VStack align="flex-start" spacing={2} mt={8}>
                    <Text fontSize="sm" opacity={0.8}>Available balance</Text>
                    <Heading size="md">{formatCurrency(primaryCard.balance)}</Heading>
                    <Text fontSize="sm">{primaryCard.card_holder_name} •••• {primaryCard.card_number.slice(-4)}</Text>
                    <Text fontSize="xs" opacity={0.7}>Expires {primaryCard.expiry_date}</Text>
                  </VStack>
                </Box>
              </CardBody>
            </Card>
          )}

          {spendingData.length > 0 && (
            <Card bg="white" borderRadius="xl" boxShadow="md">
              <CardBody>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="sm">Monthly Spend</Heading>
                  <Button variant="ghost" size="xs" onClick={() => router.push('/statistics')}>
                    View details
                  </Button>
                </Flex>
                <Box w="full" h="240px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={spendingData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} dataKey="value">
                        {spendingData.map((entry, index) => (
                          <Cell key={`desktop-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack mt={4} spacing={3}>
                  {spendingData.map((item, index) => (
                    <HStack key={index} justify="space-between">
                      <HStack>
                        <Box w="10px" h="10px" borderRadius="full" bg={item.color} />
                        <Text fontSize="sm" color="gray.600">{item.name}</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">{formatCurrency(item.value)}</Text>
                    </HStack>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          )}
        </VStack>

        <VStack spacing={6} align="stretch">
          <Card bg="white" borderRadius="xl" boxShadow="md">
            <CardBody>
              <HStack justify="space-between" mb={4}>
                <Heading size="sm">Recent Transactions</Heading>
                <Button variant="ghost" size="xs" onClick={() => router.push('/statistics')}>
                  View history
                </Button>
              </HStack>
              <VStack spacing={3} align="stretch">
                {transactions.length > 0 ? (
                  transactions.slice(0, 8).map((transaction) => {
                    return (
                      <HStack key={transaction.id} justify="space-between" p={3} borderRadius="md" bg="gray.50">
                        <HStack spacing={3}>
                          <Box
                            w="42px"
                            h="42px"
                            borderRadius="full"
                            bg={transaction.amount > 0 ? 'green.100' : 'red.100'}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            {transaction.amount > 0 ? (
                              <ArrowDownRight size={20} color="var(--chakra-colors-green-500)" />
                            ) : (
                              <ArrowUpRight size={20} color="var(--chakra-colors-red-500)" />
                            )}
                          </Box>
                          <VStack align="flex-start" spacing={0}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                              {transaction.recipient_name || transaction.description || 'Transaction'}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatDate(transaction.created_at)} • {transaction.category}
                            </Text>
                          </VStack>
                        </HStack>
                        <Text fontSize="sm" fontWeight="semibold" color={transaction.amount > 0 ? 'green.600' : 'red.500'}>
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </Text>
                      </HStack>
                    );
                  })
                ) : (
                  <Text fontSize="sm" color="gray.500">No transactions recorded yet.</Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {budgets.length > 0 && (
            <Card bg="white" borderRadius="xl" boxShadow="md">
              <CardBody>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="sm">Budget Tracker</Heading>
                  <Button variant="ghost" size="xs" onClick={() => router.push('/budget')}>
                    Manage budgets
                  </Button>
                </Flex>
                <VStack spacing={4} align="stretch">
                  {budgets.map((budget) => {
                    const percentage = (budget.current_spending / budget.monthly_limit) * 100;
                    const isOver = budget.current_spending > budget.monthly_limit;
                    return (
                      <Box key={budget.id}>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.700">{budget.category}</Text>
                          <Text fontSize="sm" color={isOver ? 'red.500' : 'gray.600'}>
                            {formatCurrency(budget.current_spending)} / {formatCurrency(budget.monthly_limit)}
                          </Text>
                        </HStack>
                        <Progress
                          value={Math.min(percentage, 100)}
                          colorScheme={isOver ? 'red' : percentage > 80 ? 'orange' : 'green'}
                          borderRadius="full"
                          size="sm"
                        />
                      </Box>
                    );
                  })}
                </VStack>
              </CardBody>
            </Card>
          )}

          {promotions.length > 0 && (
            <Card bgGradient="linear(to-r, purple.500, pink.500)" color="white" borderRadius="xl" boxShadow="md">
              <CardBody>
                <Heading size="sm" mb={4}>Rewards & Offers</Heading>
                <VStack spacing={3} align="stretch">
                  {promotions.map((promo) => (
                    <Box key={promo.id} p={3} bg="whiteAlpha.200" borderRadius="md">
                      <Text fontSize="sm" fontWeight="semibold">{promo.title}</Text>
                      <Text fontSize="xs" opacity={0.9}>{promo.description}</Text>
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Grid>
    </Box>
  );

  const modals = (
    <>
      <Modal isOpen={isProfileOpen} onClose={onProfileClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Profile Image</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Avatar
                size="2xl"
                src={profile?.profile_image_url}
                name={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
              />
              <Button as="label" leftIcon={<Camera size={18} />}>
                Choose Image
                <Input type="file" display="none" accept="image/*" onChange={handleProfileImageUpload} />
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isTransferOpen} onClose={onTransferClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Send Money</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Input placeholder="Recipient" />
              <Input placeholder="Amount" type="number" />
              <Button colorScheme="purple">Continue</Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );

  return (
    <>
      {isDesktop ? desktopLayout : mobileLayout}
      {modals}
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </>
  );
}

export default dynamic(() => Promise.resolve(WalletPage), { ssr: false });
