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
  Divider,
  Heading,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  Plus,
  Calendar,
  DollarSign,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Star,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function BillPayPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [payees, setPayees] = useState([]);
  const [billPayments, setBillPayments] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { isOpen: isAddPayeeOpen, onOpen: onAddPayeeOpen, onClose: onAddPayeeClose } = useDisclosure();
  const { isOpen: isPayBillOpen, onOpen: onPayBillOpen, onClose: onPayBillClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [newPayee, setNewPayee] = useState({
    name: '',
    account_number: '',
    routing_number: '',
    payee_type: 'company',
    category: '',
    phone: '',
    email: '',
    address: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    payee_id: '',
    account_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_frequency: 'monthly',
    memo: '',
  });

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

      // Load payees
      const { data: payeesData } = await supabase
        .from('payees')
        .select('*')
        .eq('user_id', authUser.id)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (payeesData) setPayees(payeesData);

      // Load bill payments
      const { data: paymentsData } = await supabase
        .from('bill_payments')
        .select('*, payees(*)')
        .eq('user_id', authUser.id)
        .order('payment_date', { ascending: false })
        .limit(20);

      if (paymentsData) setBillPayments(paymentsData);

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

  const handleAddPayee = async () => {
    if (!newPayee.name) {
      toast({
        title: 'Error',
        description: 'Payee name is required',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase.from('payees').insert({
        user_id: authUser.id,
        ...newPayee,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payee added successfully',
        status: 'success',
      });

      setNewPayee({
        name: '',
        account_number: '',
        routing_number: '',
        payee_type: 'company',
        category: '',
        phone: '',
        email: '',
        address: '',
      });

      onAddPayeeClose();
      loadUserData();
    } catch (error) {
      console.error('Error adding payee:', error);
      toast({
        title: 'Error',
        description: 'Failed to add payee',
        status: 'error',
      });
    }
  };

  const handlePayBill = async () => {
    if (!paymentForm.payee_id || !paymentForm.account_id || !paymentForm.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(paymentForm.amount);
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

      const account = accounts.find(a => a.id === paymentForm.account_id);
      if (!account) {
        toast({
          title: 'Error',
          description: 'Account not found',
          status: 'error',
        });
        return;
      }

      if (amount > parseFloat(account.balance)) {
        toast({
          title: 'Insufficient Funds',
          description: 'You do not have enough balance in this account',
          status: 'error',
        });
        return;
      }

      const paymentDate = new Date(paymentForm.payment_date);
      const isFutureDate = paymentDate > new Date();

      // Insert bill payment
      const { data: payment, error: paymentError } = await supabase
        .from('bill_payments')
        .insert({
          user_id: authUser.id,
          account_id: paymentForm.account_id,
          payee_id: paymentForm.payee_id,
          amount: amount,
          payment_date: paymentForm.payment_date,
          status: isFutureDate ? 'scheduled' : 'processing',
          is_recurring: paymentForm.is_recurring,
          recurring_frequency: paymentForm.is_recurring ? paymentForm.recurring_frequency : null,
          next_payment_date: paymentForm.is_recurring ? calculateNextPaymentDate(paymentForm.payment_date, paymentForm.recurring_frequency) : null,
          memo: paymentForm.memo,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // If payment is immediate, process it
      if (!isFutureDate) {
        // Deduct from account
        const newBalance = parseFloat(account.balance) - amount;
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', paymentForm.account_id);

        // Create transaction
        await supabase.from('transactions').insert({
          user_id: authUser.id,
          account_id: paymentForm.account_id,
          amount: -amount,
          transaction_type: 'withdrawal',
          category: 'Bills',
          description: `Bill payment to ${payees.find(p => p.id === paymentForm.payee_id)?.name || 'Payee'}`,
          status: 'completed',
        });

        // Update payment status
        await supabase
          .from('bill_payments')
          .update({ status: 'completed', confirmation_number: `BP${Date.now()}` })
          .eq('id', payment.id);
      }

      toast({
        title: 'Success',
        description: isFutureDate ? 'Bill payment scheduled' : 'Bill payment processed',
        status: 'success',
      });

      setPaymentForm({
        payee_id: '',
        account_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurring_frequency: 'monthly',
        memo: '',
      });

      onPayBillClose();
      loadUserData();
    } catch (error) {
      console.error('Error paying bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment',
        status: 'error',
      });
    }
  };

  const calculateNextPaymentDate = (startDate, frequency) => {
    const date = new Date(startDate);
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
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'processing':
        return 'blue';
      case 'scheduled':
        return 'purple';
      case 'failed':
        return 'red';
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
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
          <Heading size="md">Bill Pay</Heading>
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
        {/* Quick Actions */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Button
            leftIcon={<Plus size={18} />}
            colorScheme="purple"
            onClick={onAddPayeeOpen}
            size="lg"
          >
            Add Payee
          </Button>
          <Button
            leftIcon={<DollarSign size={18} />}
            colorScheme="blue"
            onClick={onPayBillOpen}
            size="lg"
          >
            Pay Bill
          </Button>
          <Button
            leftIcon={<Calendar size={18} />}
            variant="outline"
            onClick={() => router.push('/bill-pay/scheduled')}
            size="lg"
          >
            Scheduled
          </Button>
          <Button
            leftIcon={<Clock size={18} />}
            variant="outline"
            onClick={() => router.push('/bill-pay/history')}
            size="lg"
          >
            History
          </Button>
        </SimpleGrid>

        {/* Payees Section */}
        <Card mb={6}>
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">My Payees</Heading>
              <Text fontSize="sm" color="gray.600">
                {payees.length} payee{payees.length !== 1 ? 's' : ''}
              </Text>
            </Flex>
            {payees.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No payees yet</Text>
                <Button size="sm" colorScheme="purple" onClick={onAddPayeeOpen}>
                  Add Your First Payee
                </Button>
              </VStack>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {payees.map((payee) => (
                  <Card key={payee.id} variant="outline">
                    <CardBody>
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontWeight="semibold">{payee.name}</Text>
                            {payee.is_favorite && <Star size={16} fill="gold" color="gold" />}
                          </HStack>
                          <Badge colorScheme="blue" fontSize="xs">
                            {payee.payee_type}
                          </Badge>
                          {payee.category && (
                            <Text fontSize="sm" color="gray.600">
                              {payee.category}
                            </Text>
                          )}
                        </VStack>
                        <Button
                          size="sm"
                          colorScheme="purple"
                          onClick={() => {
                            setPaymentForm({ ...paymentForm, payee_id: payee.id });
                            onPayBillOpen();
                          }}
                        >
                          Pay
                        </Button>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </CardBody>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Recent Payments</Heading>
            {billPayments.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No payments yet</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {billPayments.map((payment) => (
                  <Flex
                    key={payment.id}
                    justify="space-between"
                    align="center"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold">
                        {payment.payees?.name || 'Unknown Payee'}
                      </Text>
                      <HStack spacing={2}>
                        <Badge colorScheme={getStatusColor(payment.status)} fontSize="xs">
                          {payment.status}
                        </Badge>
                        <Text fontSize="sm" color="gray.600">
                          {formatDate(payment.payment_date)}
                        </Text>
                      </HStack>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontWeight="bold">{formatCurrency(payment.amount)}</Text>
                      {payment.is_recurring && (
                        <Badge colorScheme="purple" fontSize="xs">
                          Recurring
                        </Badge>
                      )}
                    </VStack>
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Add Payee Modal */}
      <Modal isOpen={isAddPayeeOpen} onClose={onAddPayeeClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Payee</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Payee Name *</FormLabel>
                <Input
                  value={newPayee.name}
                  onChange={(e) => setNewPayee({ ...newPayee, name: e.target.value })}
                  placeholder="Enter payee name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Payee Type</FormLabel>
                <Select
                  value={newPayee.payee_type}
                  onChange={(e) => setNewPayee({ ...newPayee, payee_type: e.target.value })}
                >
                  <option value="company">Company</option>
                  <option value="individual">Individual</option>
                  <option value="utility">Utility</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="subscription">Subscription</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Account Number</FormLabel>
                <Input
                  value={newPayee.account_number}
                  onChange={(e) => setNewPayee({ ...newPayee, account_number: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Routing Number</FormLabel>
                <Input
                  value={newPayee.routing_number}
                  onChange={(e) => setNewPayee({ ...newPayee, routing_number: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Input
                  value={newPayee.category}
                  onChange={(e) => setNewPayee({ ...newPayee, category: e.target.value })}
                  placeholder="e.g., Utilities, Insurance"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input
                  value={newPayee.phone}
                  onChange={(e) => setNewPayee({ ...newPayee, phone: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={newPayee.email}
                  onChange={(e) => setNewPayee({ ...newPayee, email: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  value={newPayee.address}
                  onChange={(e) => setNewPayee({ ...newPayee, address: e.target.value })}
                  placeholder="Optional"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddPayeeClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddPayee}>
              Add Payee
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Pay Bill Modal */}
      <Modal isOpen={isPayBillOpen} onClose={onPayBillClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Pay Bill</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Select Payee *</FormLabel>
                <Select
                  value={paymentForm.payee_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payee_id: e.target.value })}
                  placeholder="Choose a payee"
                >
                  {payees.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>From Account *</FormLabel>
                <Select
                  value={paymentForm.account_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
                  placeholder="Choose an account"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Amount *</FormLabel>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Payment Date</FormLabel>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Memo</FormLabel>
                <Input
                  value={paymentForm.memo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, memo: e.target.value })}
                  placeholder="Optional note"
                />
              </FormControl>
              <FormControl>
                <HStack>
                  <input
                    type="checkbox"
                    checked={paymentForm.is_recurring}
                    onChange={(e) => setPaymentForm({ ...paymentForm, is_recurring: e.target.checked })}
                  />
                  <FormLabel mb={0}>Make this a recurring payment</FormLabel>
                </HStack>
              </FormControl>
              {paymentForm.is_recurring && (
                <FormControl>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    value={paymentForm.recurring_frequency}
                    onChange={(e) => setPaymentForm({ ...paymentForm, recurring_frequency: e.target.value })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPayBillClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handlePayBill}>
              Schedule Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

