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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Badge,
  IconButton,
  useBreakpointValue,
  Heading,
  Progress,
  Switch,
} from '@chakra-ui/react';
import {
  Plus,
  Target,
  ArrowRight,
  MessageCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function SavingsGoalsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { isOpen: isGoalOpen, onOpen: onGoalOpen, onClose: onGoalClose } = useDisclosure();
  const { isOpen: isAddFundsOpen, onOpen: onAddFundsOpen, onClose: onAddFundsClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [goalForm, setGoalForm] = useState({
    account_id: '',
    goal_name: '',
    target_amount: '',
    target_date: '',
    auto_transfer_enabled: false,
    auto_transfer_amount: '',
    auto_transfer_frequency: 'monthly',
  });

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');

  const modalSize = useBreakpointValue({ base: 'full', md: 'md' });
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

      // Load savings goals
      const { data: goalsData } = await supabase
        .from('savings_goals')
        .select('*, accounts(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (goalsData) setGoals(goalsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        status: 'error',
      });
      setLoading(false);
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

  const handleCreateGoal = async () => {
    if (!goalForm.goal_name || !goalForm.target_amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    const targetAmount = parseFloat(goalForm.target_amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid target amount',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase.from('savings_goals').insert({
        user_id: authUser.id,
        account_id: goalForm.account_id || null,
        goal_name: goalForm.goal_name,
        target_amount: targetAmount,
        target_date: goalForm.target_date || null,
        auto_transfer_enabled: goalForm.auto_transfer_enabled,
        auto_transfer_amount: goalForm.auto_transfer_enabled ? parseFloat(goalForm.auto_transfer_amount) : null,
        auto_transfer_frequency: goalForm.auto_transfer_enabled ? goalForm.auto_transfer_frequency : null,
        next_auto_transfer_date: goalForm.auto_transfer_enabled ? calculateNextTransferDate(goalForm.auto_transfer_frequency) : null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Savings goal created successfully',
        status: 'success',
      });

      setGoalForm({
        account_id: '',
        goal_name: '',
        target_amount: '',
        target_date: '',
        auto_transfer_enabled: false,
        auto_transfer_amount: '',
        auto_transfer_frequency: 'monthly',
      });

      onGoalClose();
      loadUserData();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to create goal',
        status: 'error',
      });
    }
  };

  const handleAddFunds = async () => {
    if (!selectedGoal || !addFundsAmount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const sourceAccount = accounts.find(a => a.is_primary) || accounts[0];
      if (!sourceAccount) {
        toast({
          title: 'Error',
          description: 'No account found to transfer from',
          status: 'error',
        });
        return;
      }

      if (amount > parseFloat(sourceAccount.balance)) {
        toast({
          title: 'Insufficient Funds',
          description: 'You do not have enough balance',
          status: 'error',
        });
        return;
      }

      // Update goal
      const newCurrentAmount = parseFloat(selectedGoal.current_amount) + amount;
      await supabase
        .from('savings_goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', selectedGoal.id);

      // Update source account
      const newBalance = parseFloat(sourceAccount.balance) - amount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', sourceAccount.id);

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: authUser.id,
        account_id: sourceAccount.id,
        amount: -amount,
        transaction_type: 'withdrawal',
        category: 'Savings',
        description: `Contribution to ${selectedGoal.goal_name}`,
        status: 'completed',
      });

      toast({
        title: 'Success',
        description: 'Funds added to goal',
        status: 'success',
      });

      setAddFundsAmount('');
      setSelectedGoal(null);
      onAddFundsClose();
      loadUserData();
    } catch (error) {
      console.error('Error adding funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to add funds',
        status: 'error',
      });
    }
  };

  const calculateNextTransferDate = (frequency) => {
    const date = new Date();
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  const calculateProgress = (goal) => {
    return Math.min((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100, 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No target date';
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
          <Heading size="md">Savings Goals</Heading>
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
        {/* Create Goal Button */}
        <Button
          leftIcon={<Plus size={18} />}
          colorScheme="purple"
          size="lg"
          w="full"
          mb={6}
          onClick={onGoalOpen}
        >
          Create New Goal
        </Button>

        {/* Goals List */}
        {goals.length === 0 ? (
          <Card>
            <CardBody>
              <VStack py={8} spacing={2}>
                <Target size={48} color="gray" />
                <Text color="gray.500">No savings goals yet</Text>
                <Button size="sm" colorScheme="purple" onClick={onGoalOpen}>
                  Create Your First Goal
                </Button>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <VStack spacing={4}>
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const isCompleted = progress >= 100;
              
              return (
                <Card key={goal.id} w="full">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontWeight="bold" fontSize="lg">
                              {goal.goal_name}
                            </Text>
                            {isCompleted && (
                              <Badge colorScheme="green">Completed!</Badge>
                            )}
                            {goal.is_active === false && (
                              <Badge colorScheme="gray">Inactive</Badge>
                            )}
                          </HStack>
                          {goal.target_date && (
                            <HStack spacing={1} fontSize="sm" color="gray.600">
                              <Calendar size={14} />
                              <Text>Target: {formatDate(goal.target_date)}</Text>
                            </HStack>
                          )}
                        </VStack>
                        <Button
                          size="sm"
                          colorScheme="purple"
                          onClick={() => {
                            setSelectedGoal(goal);
                            onAddFundsOpen();
                          }}
                        >
                          Add Funds
                        </Button>
                      </Flex>

                      <VStack align="stretch" spacing={2}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.600">Progress</Text>
                          <Text fontWeight="semibold">
                            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          </Text>
                        </Flex>
                        <Progress
                          value={progress}
                          colorScheme={isCompleted ? 'green' : 'purple'}
                          size="lg"
                          borderRadius="full"
                        />
                        <Text fontSize="xs" color="gray.500" textAlign="right">
                          {progress.toFixed(1)}% complete
                        </Text>
                      </VStack>

                      {goal.auto_transfer_enabled && (
                        <HStack spacing={2} fontSize="sm" color="gray.600">
                          <TrendingUp size={14} />
                          <Text>
                            Auto-transfer: {formatCurrency(goal.auto_transfer_amount)} {goal.auto_transfer_frequency}
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* Create Goal Modal */}
      <Modal isOpen={isGoalOpen} onClose={onGoalClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Savings Goal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Goal Name *</FormLabel>
                <Input
                  value={goalForm.goal_name}
                  onChange={(e) => setGoalForm({ ...goalForm, goal_name: e.target.value })}
                  placeholder="e.g., Vacation, Emergency Fund"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Target Amount *</FormLabel>
                <Input
                  type="number"
                  value={goalForm.target_amount}
                  onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Target Date (Optional)</FormLabel>
                <Input
                  type="date"
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Linked Account (Optional)</FormLabel>
                <Select
                  value={goalForm.account_id}
                  onChange={(e) => setGoalForm({ ...goalForm, account_id: e.target.value })}
                  placeholder="Choose an account"
                >
                  <option value="">No linked account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <HStack>
                  <Switch
                    isChecked={goalForm.auto_transfer_enabled}
                    onChange={(e) => setGoalForm({ ...goalForm, auto_transfer_enabled: e.target.checked })}
                  />
                  <FormLabel mb={0}>Enable automatic transfers</FormLabel>
                </HStack>
              </FormControl>

              {goalForm.auto_transfer_enabled && (
                <>
                  <FormControl>
                    <FormLabel>Transfer Amount</FormLabel>
                    <Input
                      type="number"
                      value={goalForm.auto_transfer_amount}
                      onChange={(e) => setGoalForm({ ...goalForm, auto_transfer_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      value={goalForm.auto_transfer_frequency}
                      onChange={(e) => setGoalForm({ ...goalForm, auto_transfer_frequency: e.target.value })}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </FormControl>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onGoalClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateGoal}>
              Create Goal
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Funds Modal */}
      <Modal isOpen={isAddFundsOpen} onClose={onAddFundsClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Funds to Goal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedGoal && (
              <VStack spacing={4}>
                <Text>
                  Adding funds to: <strong>{selectedGoal.goal_name}</strong>
                </Text>
                <FormControl>
                  <FormLabel>Amount *</FormLabel>
                  <Input
                    type="number"
                    value={addFundsAmount}
                    onChange={(e) => setAddFundsAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </FormControl>
                <Text fontSize="sm" color="gray.600">
                  Funds will be transferred from your primary account
                </Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddFundsClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddFunds}>
              Add Funds
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

