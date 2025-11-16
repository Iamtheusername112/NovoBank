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
  Switch,
  Divider,
} from '@chakra-ui/react';
import {
  Plus,
  Bell,
  ArrowRight,
  MessageCircle,
  DollarSign,
  TrendingDown,
  TrendingUp,
  LogIn,
  CreditCard,
  Calendar,
  AlertCircle,
  Trash2,
  Edit,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function AlertsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [alertForm, setAlertForm] = useState({
    account_id: '',
    alert_type: 'low_balance',
    threshold_amount: '',
    comparison_operator: 'less_than',
    is_enabled: true,
    notification_method: ['push', 'email'],
  });

  const [editingAlert, setEditingAlert] = useState(null);

  const modalSize = useBreakpointValue({ base: 'full', md: 'md' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  const alertTypes = [
    { value: 'low_balance', label: 'Low Balance', icon: TrendingDown, description: 'Get notified when balance falls below threshold' },
    { value: 'large_transaction', label: 'Large Transaction', icon: DollarSign, description: 'Alert when transaction exceeds amount' },
    { value: 'deposit', label: 'Deposit Received', icon: TrendingUp, description: 'Notify when money is deposited' },
    { value: 'withdrawal', label: 'Withdrawal Made', icon: TrendingDown, description: 'Notify when money is withdrawn' },
    { value: 'login', label: 'New Login', icon: LogIn, description: 'Alert on new device login' },
    { value: 'card_used', label: 'Card Used', icon: CreditCard, description: 'Notify when card is used' },
    { value: 'bill_due', label: 'Bill Due', icon: Calendar, description: 'Remind before bills are due' },
    { value: 'goal_milestone', label: 'Goal Milestone', icon: TrendingUp, description: 'Celebrate savings goal progress' },
    { value: 'custom', label: 'Custom Alert', icon: AlertCircle, description: 'Create a custom alert rule' },
  ];

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

      // Load alerts
      const { data: alertsData } = await supabase
        .from('account_alerts')
        .select('*, accounts(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (alertsData) setAlerts(alertsData);

      // Load alert history
      const { data: historyData } = await supabase
        .from('alert_history')
        .select('*, account_alerts(*)')
        .eq('user_id', authUser.id)
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (historyData) setAlertHistory(historyData);

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

  const handleCreateAlert = async () => {
    if (!alertForm.alert_type) {
      toast({
        title: 'Error',
        description: 'Please select an alert type',
        status: 'error',
      });
      return;
    }

    if (alertForm.alert_type !== 'login' && alertForm.alert_type !== 'card_used' && !alertForm.threshold_amount) {
      toast({
        title: 'Error',
        description: 'Please enter a threshold amount',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const alertData = {
        user_id: authUser.id,
        account_id: alertForm.account_id || null,
        alert_type: alertForm.alert_type,
        threshold_amount: alertForm.threshold_amount ? parseFloat(alertForm.threshold_amount) : null,
        comparison_operator: alertForm.comparison_operator,
        is_enabled: alertForm.is_enabled,
        notification_method: alertForm.notification_method,
      };

      if (editingAlert) {
        const { error } = await supabase
          .from('account_alerts')
          .update(alertData)
          .eq('id', editingAlert.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Alert updated successfully',
          status: 'success',
        });
      } else {
        const { error } = await supabase
          .from('account_alerts')
          .insert(alertData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Alert created successfully',
          status: 'success',
        });
      }

      setAlertForm({
        account_id: '',
        alert_type: 'low_balance',
        threshold_amount: '',
        comparison_operator: 'less_than',
        is_enabled: true,
        notification_method: ['push', 'email'],
      });
      setEditingAlert(null);
      onAlertClose();
      loadUserData();
    } catch (error) {
      console.error('Error saving alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to save alert',
        status: 'error',
      });
    }
  };

  const handleToggleAlert = async (alert) => {
    try {
      const { error } = await supabase
        .from('account_alerts')
        .update({ is_enabled: !alert.is_enabled })
        .eq('id', alert.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Alert ${!alert.is_enabled ? 'enabled' : 'disabled'}`,
        status: 'success',
      });

      loadUserData();
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert',
        status: 'error',
      });
    }
  };

  const handleDeleteAlert = async (alert) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const { error } = await supabase
        .from('account_alerts')
        .delete()
        .eq('id', alert.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Alert deleted',
        status: 'success',
      });

      loadUserData();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        status: 'error',
      });
    }
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setAlertForm({
      account_id: alert.account_id || '',
      alert_type: alert.alert_type,
      threshold_amount: alert.threshold_amount?.toString() || '',
      comparison_operator: alert.comparison_operator || 'less_than',
      is_enabled: alert.is_enabled,
      notification_method: alert.notification_method || ['push', 'email'],
    });
    onAlertOpen();
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAlertTypeInfo = (type) => {
    return alertTypes.find(t => t.value === type) || alertTypes[0];
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
          <Heading size="md">Account Alerts</Heading>
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
        {/* Create Alert Button */}
        <Button
          leftIcon={<Plus size={18} />}
          colorScheme="purple"
          size="lg"
          w="full"
          mb={6}
          onClick={() => {
            setEditingAlert(null);
            setAlertForm({
              account_id: '',
              alert_type: 'low_balance',
              threshold_amount: '',
              comparison_operator: 'less_than',
              is_enabled: true,
              notification_method: ['push', 'email'],
            });
            onAlertOpen();
          }}
        >
          Create New Alert
        </Button>

        {/* Active Alerts */}
        <Card mb={6}>
          <CardBody>
            <Heading size="sm" mb={4}>Active Alerts</Heading>
            {alerts.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Bell size={48} color="gray" />
                <Text color="gray.500">No alerts configured</Text>
                <Button size="sm" colorScheme="purple" onClick={onAlertOpen}>
                  Create Your First Alert
                </Button>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {alerts.map((alert) => {
                  const typeInfo = getAlertTypeInfo(alert.alert_type);
                  const Icon = typeInfo.icon;
                  
                  return (
                    <Card key={alert.id} variant="outline">
                      <CardBody>
                        <Flex justify="space-between" align="start">
                          <HStack spacing={3} flex={1}>
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="full"
                              bg="purple.100"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon size={20} color="var(--chakra-colors-purple-500)" />
                            </Box>
                            <VStack align="start" spacing={1} flex={1}>
                              <HStack>
                                <Text fontWeight="semibold">{typeInfo.label}</Text>
                                <Badge colorScheme={alert.is_enabled ? 'green' : 'gray'} fontSize="xs">
                                  {alert.is_enabled ? 'Active' : 'Inactive'}
                                </Badge>
                              </HStack>
                              {alert.account_id && alert.accounts && (
                                <Text fontSize="sm" color="gray.600">
                                  {alert.accounts.account_name}
                                </Text>
                              )}
                              {alert.threshold_amount && (
                                <Text fontSize="sm" color="gray.600">
                                  {alert.comparison_operator === 'less_than' ? 'Below' : 
                                   alert.comparison_operator === 'greater_than' ? 'Above' : 'Equal to'} {formatCurrency(alert.threshold_amount)}
                                </Text>
                              )}
                              <HStack spacing={2} fontSize="xs" color="gray.500">
                                {alert.notification_method?.map((method) => (
                                  <Badge key={method} fontSize="xs">{method}</Badge>
                                ))}
                              </HStack>
                            </VStack>
                          </HStack>
                          <HStack spacing={2}>
                            <Switch
                              isChecked={alert.is_enabled}
                              onChange={() => handleToggleAlert(alert)}
                              colorScheme="purple"
                            />
                            <IconButton
                              icon={<Edit size={16} />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditAlert(alert)}
                              aria-label="Edit"
                            />
                            <IconButton
                              icon={<Trash2 size={16} />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDeleteAlert(alert)}
                              aria-label="Delete"
                            />
                          </HStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  );
                })}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Alert History */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Recent Alert History</Heading>
            {alertHistory.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No alert history yet</Text>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch">
                {alertHistory.slice(0, 10).map((history) => (
                  <Flex
                    key={history.id}
                    justify="space-between"
                    align="center"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold" fontSize="sm">
                        {history.message}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {formatDate(history.triggered_at)}
                      </Text>
                    </VStack>
                    {!history.is_read && (
                      <Badge colorScheme="blue" fontSize="xs">New</Badge>
                    )}
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Create/Edit Alert Modal */}
      <Modal isOpen={isAlertOpen} onClose={onAlertClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingAlert ? 'Edit Alert' : 'Create Alert'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Alert Type *</FormLabel>
                <Select
                  value={alertForm.alert_type}
                  onChange={(e) => setAlertForm({ ...alertForm, alert_type: e.target.value })}
                >
                  {alertTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {getAlertTypeInfo(alertForm.alert_type).description}
                </Text>
              </FormControl>

              {(alertForm.alert_type !== 'login' && alertForm.alert_type !== 'card_used') && (
                <>
                  <FormControl>
                    <FormLabel>Account (Optional)</FormLabel>
                    <Select
                      value={alertForm.account_id}
                      onChange={(e) => setAlertForm({ ...alertForm, account_id: e.target.value })}
                      placeholder="All accounts"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Threshold Amount *</FormLabel>
                    <Input
                      type="number"
                      value={alertForm.threshold_amount}
                      onChange={(e) => setAlertForm({ ...alertForm, threshold_amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Comparison</FormLabel>
                    <Select
                      value={alertForm.comparison_operator}
                      onChange={(e) => setAlertForm({ ...alertForm, comparison_operator: e.target.value })}
                    >
                      <option value="less_than">Less Than</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="equals">Equals</option>
                    </Select>
                  </FormControl>
                </>
              )}

              <FormControl>
                <HStack>
                  <Switch
                    isChecked={alertForm.is_enabled}
                    onChange={(e) => setAlertForm({ ...alertForm, is_enabled: e.target.checked })}
                  />
                  <FormLabel mb={0}>Enable this alert</FormLabel>
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Notification Methods</FormLabel>
                <VStack align="start" spacing={2}>
                  <HStack>
                    <input
                      type="checkbox"
                      checked={alertForm.notification_method.includes('push')}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...alertForm.notification_method, 'push']
                          : alertForm.notification_method.filter(m => m !== 'push');
                        setAlertForm({ ...alertForm, notification_method: methods });
                      }}
                    />
                    <Text fontSize="sm">Push Notification</Text>
                  </HStack>
                  <HStack>
                    <input
                      type="checkbox"
                      checked={alertForm.notification_method.includes('email')}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...alertForm.notification_method, 'email']
                          : alertForm.notification_method.filter(m => m !== 'email');
                        setAlertForm({ ...alertForm, notification_method: methods });
                      }}
                    />
                    <Text fontSize="sm">Email</Text>
                  </HStack>
                  <HStack>
                    <input
                      type="checkbox"
                      checked={alertForm.notification_method.includes('sms')}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...alertForm.notification_method, 'sms']
                          : alertForm.notification_method.filter(m => m !== 'sms');
                        setAlertForm({ ...alertForm, notification_method: methods });
                      }}
                    />
                    <Text fontSize="sm">SMS</Text>
                  </HStack>
                </VStack>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAlertClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateAlert}>
              {editingAlert ? 'Update' : 'Create'} Alert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

