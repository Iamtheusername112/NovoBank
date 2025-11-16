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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Send,
  Download,
  UserPlus,
  Mail,
  Phone,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function P2PPaymentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [p2pPayments, setP2pPayments] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const { isOpen: isSendOpen, onOpen: onSendOpen, onClose: onSendClose } = useDisclosure();
  const { isOpen: isRequestOpen, onOpen: onRequestOpen, onClose: onRequestClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [sendForm, setSendForm] = useState({
    account_id: '',
    recipient_type: 'email',
    recipient_email: '',
    recipient_phone: '',
    amount: '',
    memo: '',
  });

  const [requestForm, setRequestForm] = useState({
    recipient_type: 'email',
    recipient_email: '',
    recipient_phone: '',
    amount: '',
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

      // Load P2P payments (sent and received)
      const { data: paymentsData } = await supabase
        .from('p2p_payments')
        .select('*, sender:user_profiles!p2p_payments_sender_id_fkey(*), recipient:user_profiles!p2p_payments_recipient_id_fkey(*)')
        .or(`sender_id.eq.${authUser.id},recipient_id.eq.${authUser.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (paymentsData) setP2pPayments(paymentsData);

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

  const handleSendPayment = async () => {
    if (!sendForm.account_id || !sendForm.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    if (sendForm.recipient_type === 'email' && !sendForm.recipient_email) {
      toast({
        title: 'Error',
        description: 'Please enter recipient email',
        status: 'error',
      });
      return;
    }

    if (sendForm.recipient_type === 'phone' && !sendForm.recipient_phone) {
      toast({
        title: 'Error',
        description: 'Please enter recipient phone',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(sendForm.amount);
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

      const account = accounts.find(a => a.id === sendForm.account_id);
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
          description: 'You do not have enough balance',
          status: 'error',
        });
        return;
      }

      // Try to find recipient by email or phone
      let recipientId = null;
      if (sendForm.recipient_type === 'email') {
        const { data: recipientData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', sendForm.recipient_email.toLowerCase())
          .single();

        if (recipientData) recipientId = recipientData.id;
      }

      // Create P2P payment
      const { data: payment, error: paymentError } = await supabase
        .from('p2p_payments')
        .insert({
          sender_id: authUser.id,
          recipient_id: recipientId,
          recipient_email: sendForm.recipient_type === 'email' ? sendForm.recipient_email.toLowerCase() : null,
          recipient_phone: sendForm.recipient_type === 'phone' ? sendForm.recipient_phone : null,
          account_id: sendForm.account_id,
          amount: amount,
          payment_type: 'send',
          status: recipientId ? 'completed' : 'pending',
          memo: sendForm.memo,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // If recipient found, process immediately
      if (recipientId) {
        // Deduct from sender account
        const newSenderBalance = parseFloat(account.balance) - amount;
        await supabase
          .from('accounts')
          .update({ balance: newSenderBalance })
          .eq('id', sendForm.account_id);

        // Add to recipient account (find their primary account)
        const { data: recipientAccount } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', recipientId)
          .eq('is_primary', true)
          .single();

        if (recipientAccount) {
          const newRecipientBalance = parseFloat(recipientAccount.balance) + amount;
          await supabase
            .from('accounts')
            .update({ balance: newRecipientBalance })
            .eq('id', recipientAccount.id);
        }

        // Create transactions
        await supabase.from('transactions').insert([
          {
            user_id: authUser.id,
            account_id: sendForm.account_id,
            amount: -amount,
            transaction_type: 'sent',
            category: 'P2P Payment',
            description: `P2P payment to ${sendForm.recipient_email || sendForm.recipient_phone}`,
            status: 'completed',
          },
        ]);

        // Update payment status
        await supabase
          .from('p2p_payments')
          .update({ status: 'completed' })
          .eq('id', payment.id);
      }

      toast({
        title: 'Success',
        description: recipientId ? 'Payment sent successfully' : 'Payment request sent. Recipient will be notified.',
        status: 'success',
      });

      setSendForm({
        account_id: '',
        recipient_type: 'email',
        recipient_email: '',
        recipient_phone: '',
        amount: '',
        memo: '',
      });

      onSendClose();
      loadUserData();
    } catch (error) {
      console.error('Error sending payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to send payment',
        status: 'error',
      });
    }
  };

  const handleRequestPayment = async () => {
    if (!requestForm.amount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount',
        status: 'error',
      });
      return;
    }

    if (requestForm.recipient_type === 'email' && !requestForm.recipient_email) {
      toast({
        title: 'Error',
        description: 'Please enter recipient email',
        status: 'error',
      });
      return;
    }

    if (requestForm.recipient_type === 'phone' && !requestForm.recipient_phone) {
      toast({
        title: 'Error',
        description: 'Please enter recipient phone',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(requestForm.amount);
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

      // Try to find recipient
      let recipientId = null;
      if (requestForm.recipient_type === 'email') {
        const { data: recipientData } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', requestForm.recipient_email.toLowerCase())
          .single();

        if (recipientData) recipientId = recipientData.id;
      }

      // Create P2P payment request
      const { error: paymentError } = await supabase
        .from('p2p_payments')
        .insert({
          sender_id: authUser.id,
          recipient_id: recipientId,
          recipient_email: requestForm.recipient_type === 'email' ? requestForm.recipient_email.toLowerCase() : null,
          recipient_phone: requestForm.recipient_type === 'phone' ? requestForm.recipient_phone : null,
          account_id: null, // Will be set when payment is made
          amount: amount,
          payment_type: 'request',
          status: 'pending',
          memo: requestForm.memo,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (paymentError) throw paymentError;

      toast({
        title: 'Success',
        description: 'Payment request sent',
        status: 'success',
      });

      setRequestForm({
        recipient_type: 'email',
        recipient_email: '',
        recipient_phone: '',
        amount: '',
        memo: '',
      });

      onRequestClose();
      loadUserData();
    } catch (error) {
      console.error('Error requesting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to send payment request',
        status: 'error',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'failed':
        return 'red';
      case 'expired':
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

  const sentPayments = p2pPayments.filter(p => p.payment_type === 'send' && p.sender_id === user?.id);
  const receivedPayments = p2pPayments.filter(p => p.payment_type === 'send' && p.recipient_id === user?.id);
  const paymentRequests = p2pPayments.filter(p => p.payment_type === 'request');

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
          <Heading size="md">P2P Payments</Heading>
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
        <HStack spacing={3} mb={6}>
          <Button
            leftIcon={<Send size={18} />}
            colorScheme="purple"
            flex={1}
            onClick={onSendOpen}
          >
            Send Money
          </Button>
          <Button
            leftIcon={<Download size={18} />}
            variant="outline"
            flex={1}
            onClick={onRequestOpen}
          >
            Request Money
          </Button>
        </HStack>

        {/* Payment Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>Sent</Tab>
            <Tab>Received</Tab>
            <Tab>Requests</Tab>
          </TabList>

          <TabPanels>
            {/* Sent Payments */}
            <TabPanel px={0}>
              {sentPayments.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <Text color="gray.500">No sent payments yet</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={3} align="stretch">
                  {sentPayments.map((payment) => (
                    <Card key={payment.id}>
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">
                              To: {payment.recipient?.first_name || payment.recipient_email || payment.recipient_phone || 'Unknown'}
                            </Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={getStatusColor(payment.status)} fontSize="xs">
                                {payment.status}
                              </Badge>
                              <Text fontSize="sm" color="gray.600">
                                {formatDate(payment.created_at)}
                              </Text>
                            </HStack>
                            {payment.memo && (
                              <Text fontSize="sm" color="gray.600">
                                {payment.memo}
                              </Text>
                            )}
                          </VStack>
                          <Text fontWeight="bold" fontSize="lg">
                            -{formatCurrency(payment.amount)}
                          </Text>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>

            {/* Received Payments */}
            <TabPanel px={0}>
              {receivedPayments.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <Text color="gray.500">No received payments yet</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={3} align="stretch">
                  {receivedPayments.map((payment) => (
                    <Card key={payment.id}>
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">
                              From: {payment.sender?.first_name || 'Unknown'}
                            </Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={getStatusColor(payment.status)} fontSize="xs">
                                {payment.status}
                              </Badge>
                              <Text fontSize="sm" color="gray.600">
                                {formatDate(payment.created_at)}
                              </Text>
                            </HStack>
                            {payment.memo && (
                              <Text fontSize="sm" color="gray.600">
                                {payment.memo}
                              </Text>
                            )}
                          </VStack>
                          <Text fontWeight="bold" fontSize="lg" color="green.500">
                            +{formatCurrency(payment.amount)}
                          </Text>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>

            {/* Payment Requests */}
            <TabPanel px={0}>
              {paymentRequests.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <Text color="gray.500">No payment requests</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={3} align="stretch">
                  {paymentRequests.map((payment) => (
                    <Card key={payment.id}>
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">
                              Request from: {payment.sender?.first_name || 'Unknown'}
                            </Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={getStatusColor(payment.status)} fontSize="xs">
                                {payment.status}
                              </Badge>
                              <Text fontSize="sm" color="gray.600">
                                {formatDate(payment.created_at)}
                              </Text>
                            </HStack>
                            {payment.memo && (
                              <Text fontSize="sm" color="gray.600">
                                {payment.memo}
                              </Text>
                            )}
                          </VStack>
                          <VStack align="end" spacing={2}>
                            <Text fontWeight="bold" fontSize="lg">
                              {formatCurrency(payment.amount)}
                            </Text>
                            {payment.sender_id === user?.id ? (
                              <Badge colorScheme="blue" fontSize="xs">Your Request</Badge>
                            ) : (
                              <Button size="sm" colorScheme="purple">
                                Pay
                              </Button>
                            )}
                          </VStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Send Payment Modal */}
      <Modal isOpen={isSendOpen} onClose={onSendClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Send Money</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>From Account *</FormLabel>
                <Select
                  value={sendForm.account_id}
                  onChange={(e) => setSendForm({ ...sendForm, account_id: e.target.value })}
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
                <FormLabel>Send To *</FormLabel>
                <RadioGroup
                  value={sendForm.recipient_type}
                  onChange={(value) => setSendForm({ ...sendForm, recipient_type: value })}
                >
                  <Stack direction="row">
                    <Radio value="email">Email</Radio>
                    <Radio value="phone">Phone</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {sendForm.recipient_type === 'email' ? (
                <FormControl>
                  <FormLabel>Recipient Email *</FormLabel>
                  <Input
                    type="email"
                    value={sendForm.recipient_email}
                    onChange={(e) => setSendForm({ ...sendForm, recipient_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </FormControl>
              ) : (
                <FormControl>
                  <FormLabel>Recipient Phone *</FormLabel>
                  <Input
                    type="tel"
                    value={sendForm.recipient_phone}
                    onChange={(e) => setSendForm({ ...sendForm, recipient_phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Amount *</FormLabel>
                <Input
                  type="number"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Memo (Optional)</FormLabel>
                <Input
                  value={sendForm.memo}
                  onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                  placeholder="What's this for?"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onSendClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSendPayment}>
              Send Money
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Request Payment Modal */}
      <Modal isOpen={isRequestOpen} onClose={onRequestClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Money</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Request From *</FormLabel>
                <RadioGroup
                  value={requestForm.recipient_type}
                  onChange={(value) => setRequestForm({ ...requestForm, recipient_type: value })}
                >
                  <Stack direction="row">
                    <Radio value="email">Email</Radio>
                    <Radio value="phone">Phone</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              {requestForm.recipient_type === 'email' ? (
                <FormControl>
                  <FormLabel>Recipient Email *</FormLabel>
                  <Input
                    type="email"
                    value={requestForm.recipient_email}
                    onChange={(e) => setRequestForm({ ...requestForm, recipient_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </FormControl>
              ) : (
                <FormControl>
                  <FormLabel>Recipient Phone *</FormLabel>
                  <Input
                    type="tel"
                    value={requestForm.recipient_phone}
                    onChange={(e) => setRequestForm({ ...requestForm, recipient_phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Amount *</FormLabel>
                <Input
                  type="number"
                  value={requestForm.amount}
                  onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Memo (Optional)</FormLabel>
                <Input
                  value={requestForm.memo}
                  onChange={(e) => setRequestForm({ ...requestForm, memo: e.target.value })}
                  placeholder="What's this for?"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRequestClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleRequestPayment}>
              Request Money
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

