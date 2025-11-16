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
  Radio,
  RadioGroup,
  Stack,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Ban,
  FileX,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function StopPaymentPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [billPayments, setBillPayments] = useState([]);
  const [stopPayments, setStopPayments] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isStopOpen, onOpen: onStopOpen, onClose: onStopClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [stopForm, setStopForm] = useState({
    account_id: '',
    stop_type: 'check',
    check_number: '',
    amount: '',
    payee_name: '',
    recurring_payment_id: '',
    reason: '',
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

      // Load recurring bill payments
      const { data: paymentsData } = await supabase
        .from('bill_payments')
        .select('*, payees(*)')
        .eq('user_id', authUser.id)
        .eq('is_recurring', true)
        .eq('status', 'scheduled')
        .order('next_payment_date', { ascending: true });

      if (paymentsData) setBillPayments(paymentsData);

      // Load stop payments
      const { data: stopData } = await supabase
        .from('stop_payments')
        .select('*, accounts(*), bill_payments(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (stopData) setStopPayments(stopData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
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

  const handleStopPayment = async () => {
    if (!stopForm.account_id) {
      toast({
        title: 'Error',
        description: 'Please select an account',
        status: 'error',
      });
      return;
    }

    if (stopForm.stop_type === 'check') {
      if (!stopForm.check_number || !stopForm.amount) {
        toast({
          title: 'Error',
          description: 'Please fill in check number and amount',
          status: 'error',
        });
        return;
      }
    } else {
      if (!stopForm.recurring_payment_id) {
        toast({
          title: 'Error',
          description: 'Please select a recurring payment',
          status: 'error',
        });
        return;
      }
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const stopPaymentData = {
        user_id: authUser.id,
        account_id: stopForm.account_id,
        stop_type: stopForm.stop_type,
        check_number: stopForm.stop_type === 'check' ? stopForm.check_number : null,
        amount: stopForm.stop_type === 'check' ? parseFloat(stopForm.amount) : null,
        payee_name: stopForm.payee_name || null,
        recurring_payment_id: stopForm.stop_type === 'recurring_payment' ? stopForm.recurring_payment_id : null,
        status: 'active',
        expiration_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
        fee: 25.00,
        reason: stopForm.reason || null,
      };

      const { error } = await supabase
        .from('stop_payments')
        .insert(stopPaymentData);

      if (error) throw error;

      // If stopping a recurring payment, cancel it
      if (stopForm.stop_type === 'recurring_payment' && stopForm.recurring_payment_id) {
        await supabase
          .from('bill_payments')
          .update({ status: 'cancelled', is_recurring: false })
          .eq('id', stopForm.recurring_payment_id);
      }

      toast({
        title: 'Stop Payment Requested',
        description: `Stop payment fee: ${formatCurrency(25)}. Request is active for 6 months.`,
        status: 'success',
      });

      // Deduct fee from account
      const account = accounts.find(a => a.id === stopForm.account_id);
      if (account) {
        const newBalance = parseFloat(account.balance) - 25.00;
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', stopForm.account_id);

        // Create transaction
        await supabase.from('transactions').insert({
          user_id: authUser.id,
          account_id: stopForm.account_id,
          amount: -25.00,
          transaction_type: 'withdrawal',
          category: 'Fees',
          description: 'Stop payment fee',
          status: 'completed',
        });
      }

      setStopForm({
        account_id: '',
        stop_type: 'check',
        check_number: '',
        amount: '',
        payee_name: '',
        recurring_payment_id: '',
        reason: '',
      });

      onStopClose();
      loadUserData();
    } catch (error) {
      console.error('Error stopping payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to process stop payment request',
        status: 'error',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'expired':
        return 'gray';
      case 'cancelled':
        return 'red';
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
          <Heading size="md">Stop Payment</Heading>
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
        {/* Info Alert */}
        <Alert status="warning" mb={6} borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="semibold" fontSize="sm">
              Stop Payment Fee: {formatCurrency(25)}
            </Text>
            <Text fontSize="xs">
              Stop payment requests are active for 6 months. A fee applies to each request.
            </Text>
          </VStack>
        </Alert>

        {/* Request Stop Payment Button */}
        <Button
          leftIcon={<Ban size={18} />}
          colorScheme="red"
          size="lg"
          w="full"
          mb={6}
          onClick={onStopOpen}
        >
          Request Stop Payment
        </Button>

        {/* Active Stop Payments */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Active Stop Payments</Heading>
            {stopPayments.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No stop payments requested</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {stopPayments.map((stop) => (
                  <Card key={stop.id} variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Flex justify="space-between" align="start">
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <Text fontWeight="semibold">
                                {stop.stop_type === 'check' ? 'Check' : 'Recurring Payment'}
                              </Text>
                              <Badge colorScheme={getStatusColor(stop.status)} fontSize="xs">
                                {stop.status}
                              </Badge>
                            </HStack>
                            {stop.stop_type === 'check' && (
                              <>
                                <Text fontSize="sm" color="gray.600">
                                  Check #{stop.check_number}
                                </Text>
                                {stop.amount && (
                                  <Text fontSize="sm" color="gray.600">
                                    Amount: {formatCurrency(stop.amount)}
                                  </Text>
                                )}
                                {stop.payee_name && (
                                  <Text fontSize="sm" color="gray.600">
                                    Payee: {stop.payee_name}
                                  </Text>
                                )}
                              </>
                            )}
                            {stop.stop_type === 'recurring_payment' && stop.bill_payments && (
                              <Text fontSize="sm" color="gray.600">
                                Payment: {stop.bill_payments.payees?.name || 'Unknown'}
                              </Text>
                            )}
                            <Text fontSize="xs" color="gray.500">
                              Expires: {formatDate(stop.expiration_date)}
                            </Text>
                          </VStack>
                          <Text fontWeight="bold" color="red.500">
                            -{formatCurrency(stop.fee)}
                          </Text>
                        </Flex>
                        {stop.reason && (
                          <>
                            <Divider />
                            <Text fontSize="sm" color="gray.600">
                              <strong>Reason:</strong> {stop.reason}
                            </Text>
                          </>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Stop Payment Modal */}
      <Modal isOpen={isStopOpen} onClose={onStopClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Stop Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Account *</FormLabel>
                <Select
                  value={stopForm.account_id}
                  onChange={(e) => setStopForm({ ...stopForm, account_id: e.target.value })}
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
                <FormLabel>Stop Payment Type *</FormLabel>
                <RadioGroup
                  value={stopForm.stop_type}
                  onChange={(value) => setStopForm({ ...stopForm, stop_type: value })}
                >
                  <Stack direction="column">
                    <Radio value="check">Stop a Check</Radio>
                    <Radio value="recurring_payment">Stop Recurring Payment</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {stopForm.stop_type === 'check' ? (
                <>
                  <FormControl>
                    <FormLabel>Check Number *</FormLabel>
                    <Input
                      value={stopForm.check_number}
                      onChange={(e) => setStopForm({ ...stopForm, check_number: e.target.value })}
                      placeholder="Enter check number"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Check Amount *</FormLabel>
                    <Input
                      type="number"
                      value={stopForm.amount}
                      onChange={(e) => setStopForm({ ...stopForm, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Payee Name</FormLabel>
                    <Input
                      value={stopForm.payee_name}
                      onChange={(e) => setStopForm({ ...stopForm, payee_name: e.target.value })}
                      placeholder="Optional"
                    />
                  </FormControl>
                </>
              ) : (
                <FormControl>
                  <FormLabel>Select Recurring Payment *</FormLabel>
                  <Select
                    value={stopForm.recurring_payment_id}
                    onChange={(e) => setStopForm({ ...stopForm, recurring_payment_id: e.target.value })}
                    placeholder="Choose a recurring payment"
                  >
                    {billPayments.map((payment) => (
                      <option key={payment.id} value={payment.id}>
                        {payment.payees?.name || 'Unknown'} - {formatCurrency(payment.amount)} {payment.recurring_frequency}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Reason (Optional)</FormLabel>
                <Input
                  value={stopForm.reason}
                  onChange={(e) => setStopForm({ ...stopForm, reason: e.target.value })}
                  placeholder="Why are you stopping this payment?"
                />
              </FormControl>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Stop payment fee: {formatCurrency(25)}. Request valid for 6 months.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onStopClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleStopPayment}>
              Request Stop Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

