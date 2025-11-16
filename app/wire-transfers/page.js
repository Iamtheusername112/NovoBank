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
  Alert,
  AlertIcon,
  Divider,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Send,
  Globe,
  Building2,
  DollarSign,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function WireTransfersPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [wireTransfers, setWireTransfers] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isWireOpen, onOpen: onWireOpen, onClose: onWireClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [wireForm, setWireForm] = useState({
    account_id: '',
    transfer_type: 'domestic',
    recipient_name: '',
    recipient_account_number: '',
    recipient_routing_number: '',
    recipient_bank_name: '',
    recipient_bank_address: '',
    recipient_country: 'US',
    amount: '',
    instructions: '',
  });

  const [wireFee, setWireFee] = useState(0);

  const modalSize = useBreakpointValue({ base: 'full', md: 'lg' });
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
    // Calculate wire fee based on transfer type
    if (wireForm.transfer_type === 'domestic') {
      setWireFee(25.00);
    } else {
      setWireFee(45.00);
    }
  }, [wireForm.transfer_type]);

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

      // Load wire transfers
      const { data: transfersData } = await supabase
        .from('wire_transfers')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transfersData) setWireTransfers(transfersData);

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

  const handleWireTransfer = async () => {
    if (!wireForm.account_id || !wireForm.recipient_name || !wireForm.recipient_account_number || 
        !wireForm.recipient_routing_number || !wireForm.recipient_bank_name || !wireForm.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(wireForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        status: 'error',
      });
      return;
    }

    const totalAmount = amount + wireFee;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const account = accounts.find(a => a.id === wireForm.account_id);
      if (!account) {
        toast({
          title: 'Error',
          description: 'Account not found',
          status: 'error',
        });
        return;
      }

      if (totalAmount > parseFloat(account.balance)) {
        toast({
          title: 'Insufficient Funds',
          description: `You need ${formatCurrency(totalAmount)} including fees`,
          status: 'error',
        });
        return;
      }

      // Create wire transfer
      const { data: transfer, error: transferError } = await supabase
        .from('wire_transfers')
        .insert({
          user_id: authUser.id,
          account_id: wireForm.account_id,
          recipient_name: wireForm.recipient_name,
          recipient_account_number: wireForm.recipient_account_number,
          recipient_routing_number: wireForm.recipient_routing_number,
          recipient_bank_name: wireForm.recipient_bank_name,
          recipient_bank_address: wireForm.recipient_bank_address || null,
          recipient_country: wireForm.recipient_country,
          amount: amount,
          fee: wireFee,
          transfer_type: wireForm.transfer_type,
          status: 'pending',
          reference_number: `WT${Date.now()}`,
          instructions: wireForm.instructions || null,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Deduct from account (including fee)
      const newBalance = parseFloat(account.balance) - totalAmount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', wireForm.account_id);

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: authUser.id,
        account_id: wireForm.account_id,
        amount: -totalAmount,
        transaction_type: 'withdrawal',
        category: 'Wire Transfer',
        description: `Wire transfer to ${wireForm.recipient_name} (${wireForm.transfer_type})`,
        status: 'completed',
      });

      toast({
        title: 'Wire Transfer Initiated',
        description: `Reference: ${transfer.reference_number}. Processing may take 1-3 business days.`,
        status: 'success',
        duration: 5000,
      });

      setWireForm({
        account_id: '',
        transfer_type: 'domestic',
        recipient_name: '',
        recipient_account_number: '',
        recipient_routing_number: '',
        recipient_bank_name: '',
        recipient_bank_address: '',
        recipient_country: 'US',
        amount: '',
        instructions: '',
      });

      onWireClose();
      loadUserData();
    } catch (error) {
      console.error('Error processing wire transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to process wire transfer',
        status: 'error',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'processing':
        return 'blue';
      case 'pending':
        return 'yellow';
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
          <Heading size="md">Wire Transfers</Heading>
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
        <Alert status="info" mb={6} borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="semibold" fontSize="sm">
              Wire Transfer Information
            </Text>
            <Text fontSize="xs">
              Domestic wires: {formatCurrency(25)} fee, typically processed same day. International wires: {formatCurrency(45)} fee, may take 1-3 business days.
            </Text>
          </VStack>
        </Alert>

        {/* Initiate Wire Button */}
        <Button
          leftIcon={<Send size={18} />}
          colorScheme="purple"
          size="lg"
          w="full"
          mb={6}
          onClick={onWireOpen}
        >
          Initiate Wire Transfer
        </Button>

        {/* Recent Wire Transfers */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Recent Wire Transfers</Heading>
            {wireTransfers.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No wire transfers yet</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {wireTransfers.map((transfer) => (
                  <Card key={transfer.id} variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Flex justify="space-between" align="start">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">
                              {transfer.recipient_name}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {transfer.recipient_bank_name}
                            </Text>
                            <HStack spacing={2}>
                              <Badge colorScheme={getStatusColor(transfer.status)} fontSize="xs">
                                {transfer.status}
                              </Badge>
                              <Badge fontSize="xs">
                                {transfer.transfer_type === 'domestic' ? 'Domestic' : 'International'}
                              </Badge>
                            </HStack>
                          </VStack>
                          <VStack align="end" spacing={1}>
                            <Text fontWeight="bold" fontSize="lg">
                              {formatCurrency(transfer.amount)}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              Fee: {formatCurrency(transfer.fee)}
                            </Text>
                          </VStack>
                        </Flex>
                        <Divider />
                        <HStack justify="space-between" fontSize="sm">
                          <Text color="gray.600">
                            Reference: {transfer.reference_number}
                          </Text>
                          <Text color="gray.600">
                            {formatDate(transfer.created_at)}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Wire Transfer Modal */}
      <Modal isOpen={isWireOpen} onClose={onWireClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Initiate Wire Transfer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>From Account *</FormLabel>
                <Select
                  value={wireForm.account_id}
                  onChange={(e) => setWireForm({ ...wireForm, account_id: e.target.value })}
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
                <FormLabel>Transfer Type *</FormLabel>
                <RadioGroup
                  value={wireForm.transfer_type}
                  onChange={(value) => setWireForm({ ...wireForm, transfer_type: value })}
                >
                  <Stack direction="row">
                    <Radio value="domestic">Domestic ({formatCurrency(25)} fee)</Radio>
                    <Radio value="international">International ({formatCurrency(45)} fee)</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Recipient Name *</FormLabel>
                <Input
                  value={wireForm.recipient_name}
                  onChange={(e) => setWireForm({ ...wireForm, recipient_name: e.target.value })}
                  placeholder="Full name"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Recipient Account Number *</FormLabel>
                <Input
                  value={wireForm.recipient_account_number}
                  onChange={(e) => setWireForm({ ...wireForm, recipient_account_number: e.target.value })}
                  placeholder="Account number"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Recipient Routing Number *</FormLabel>
                <Input
                  value={wireForm.recipient_routing_number}
                  onChange={(e) => setWireForm({ ...wireForm, recipient_routing_number: e.target.value })}
                  placeholder="9-digit routing number"
                  maxLength={9}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Recipient Bank Name *</FormLabel>
                <Input
                  value={wireForm.recipient_bank_name}
                  onChange={(e) => setWireForm({ ...wireForm, recipient_bank_name: e.target.value })}
                  placeholder="Bank name"
                />
              </FormControl>

              {wireForm.transfer_type === 'international' && (
                <>
                  <FormControl>
                    <FormLabel>Recipient Bank Address</FormLabel>
                    <Input
                      value={wireForm.recipient_bank_address}
                      onChange={(e) => setWireForm({ ...wireForm, recipient_bank_address: e.target.value })}
                      placeholder="Bank address"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Recipient Country</FormLabel>
                    <Select
                      value={wireForm.recipient_country}
                      onChange={(e) => setWireForm({ ...wireForm, recipient_country: e.target.value })}
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="JP">Japan</option>
                      <option value="CN">China</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </FormControl>
                </>
              )}

              <FormControl>
                <FormLabel>Amount *</FormLabel>
                <Input
                  type="number"
                  value={wireForm.amount}
                  onChange={(e) => setWireForm({ ...wireForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Total Amount: {formatCurrency(parseFloat(wireForm.amount || 0) + wireFee)}
                  </Text>
                  <Text fontSize="xs">
                    Transfer: {formatCurrency(parseFloat(wireForm.amount || 0))} + Fee: {formatCurrency(wireFee)}
                  </Text>
                </VStack>
              </Alert>

              <FormControl>
                <FormLabel>Special Instructions (Optional)</FormLabel>
                <Input
                  value={wireForm.instructions}
                  onChange={(e) => setWireForm({ ...wireForm, instructions: e.target.value })}
                  placeholder="Any special instructions"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onWireClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleWireTransfer}>
              Initiate Transfer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

