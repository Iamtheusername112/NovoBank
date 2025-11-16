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
} from '@chakra-ui/react';
import {
  ArrowRight,
  ArrowLeftRight,
  Calendar,
  Clock,
  MessageCircle,
  Repeat,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function TransfersPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { isOpen: isTransferOpen, onOpen: onTransferOpen, onClose: onTransferClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
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

      // Load transfers
      const { data: transfersData } = await supabase
        .from('internal_transfers')
        .select('*, from_account:accounts!internal_transfers_from_account_id_fkey(*), to_account:accounts!internal_transfers_to_account_id_fkey(*)')
        .eq('user_id', authUser.id)
        .order('transfer_date', { ascending: false })
        .limit(20);

      if (transfersData) setTransfers(transfersData);

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

  const handleTransfer = async () => {
    if (!transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    if (transferForm.from_account_id === transferForm.to_account_id) {
      toast({
        title: 'Error',
        description: 'Cannot transfer to the same account',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(transferForm.amount);
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

      const fromAccount = accounts.find(a => a.id === transferForm.from_account_id);
      const toAccount = accounts.find(a => a.id === transferForm.to_account_id);

      if (!fromAccount || !toAccount) {
        toast({
          title: 'Error',
          description: 'Account not found',
          status: 'error',
        });
        return;
      }

      if (amount > parseFloat(fromAccount.balance)) {
        toast({
          title: 'Insufficient Funds',
          description: 'You do not have enough balance in the source account',
          status: 'error',
        });
        return;
      }

      const transferDate = new Date(transferForm.transfer_date);
      const isFutureDate = transferDate > new Date();

      // Insert transfer
      const { data: transfer, error: transferError } = await supabase
        .from('internal_transfers')
        .insert({
          user_id: authUser.id,
          from_account_id: transferForm.from_account_id,
          to_account_id: transferForm.to_account_id,
          amount: amount,
          transfer_date: transferForm.transfer_date,
          status: isFutureDate ? 'scheduled' : 'processing',
          is_recurring: transferForm.is_recurring,
          recurring_frequency: transferForm.is_recurring ? transferForm.recurring_frequency : null,
          next_transfer_date: transferForm.is_recurring ? calculateNextTransferDate(transferForm.transfer_date, transferForm.recurring_frequency) : null,
          memo: transferForm.memo,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // If transfer is immediate, process it
      if (!isFutureDate) {
        // Update balances
        const newFromBalance = parseFloat(fromAccount.balance) - amount;
        const newToBalance = parseFloat(toAccount.balance) + amount;

        await supabase
          .from('accounts')
          .update({ balance: newFromBalance })
          .eq('id', transferForm.from_account_id);

        await supabase
          .from('accounts')
          .update({ balance: newToBalance })
          .eq('id', transferForm.to_account_id);

        // Create transactions
        await supabase.from('transactions').insert([
          {
            user_id: authUser.id,
            account_id: transferForm.from_account_id,
            amount: -amount,
            transaction_type: 'withdrawal',
            category: 'Transfer',
            description: `Transfer to ${toAccount.account_name}`,
            status: 'completed',
          },
          {
            user_id: authUser.id,
            account_id: transferForm.to_account_id,
            amount: amount,
            transaction_type: 'deposit',
            category: 'Transfer',
            description: `Transfer from ${fromAccount.account_name}`,
            status: 'completed',
          },
        ]);

        // Update transfer status
        await supabase
          .from('internal_transfers')
          .update({ status: 'completed' })
          .eq('id', transfer.id);
      }

      toast({
        title: 'Success',
        description: isFutureDate ? 'Transfer scheduled' : 'Transfer completed',
        status: 'success',
      });

      setTransferForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        transfer_date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurring_frequency: 'monthly',
        memo: '',
      });

      onTransferClose();
      loadUserData();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to process transfer',
        status: 'error',
      });
    }
  };

  const calculateNextTransferDate = (startDate, frequency) => {
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
          <Heading size="md">Account Transfers</Heading>
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
        {/* Transfer Button */}
        <Button
          leftIcon={<ArrowLeftRight size={18} />}
          colorScheme="purple"
          size="lg"
          w="full"
          mb={6}
          onClick={onTransferOpen}
        >
          Transfer Between Accounts
        </Button>

        {/* Recent Transfers */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Recent Transfers</Heading>
            {transfers.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No transfers yet</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {transfers.map((transfer) => (
                  <Flex
                    key={transfer.id}
                    justify="space-between"
                    align="center"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Text fontWeight="semibold">
                          {transfer.from_account?.account_name} → {transfer.to_account?.account_name}
                        </Text>
                        {transfer.is_recurring && (
                          <Badge colorScheme="purple" fontSize="xs">
                            <Repeat size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            Recurring
                          </Badge>
                        )}
                      </HStack>
                      <HStack spacing={2}>
                        <Badge colorScheme={getStatusColor(transfer.status)} fontSize="xs">
                          {transfer.status}
                        </Badge>
                        <Text fontSize="sm" color="gray.600">
                          {formatDate(transfer.transfer_date)}
                        </Text>
                      </HStack>
                      {transfer.memo && (
                        <Text fontSize="xs" color="gray.500">
                          {transfer.memo}
                        </Text>
                      )}
                    </VStack>
                    <Text fontWeight="bold">{formatCurrency(transfer.amount)}</Text>
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Transfer Modal */}
      <Modal isOpen={isTransferOpen} onClose={onTransferClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Transfer Between Accounts</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>From Account *</FormLabel>
                <Select
                  value={transferForm.from_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                  placeholder="Choose source account"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>To Account *</FormLabel>
                <Select
                  value={transferForm.to_account_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                  placeholder="Choose destination account"
                >
                  {accounts
                    .filter(account => account.id !== transferForm.from_account_id)
                    .map((account) => (
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
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Transfer Date</FormLabel>
                <Input
                  type="date"
                  value={transferForm.transfer_date}
                  onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Memo</FormLabel>
                <Input
                  value={transferForm.memo}
                  onChange={(e) => setTransferForm({ ...transferForm, memo: e.target.value })}
                  placeholder="Optional note"
                />
              </FormControl>

              <FormControl>
                <HStack>
                  <Switch
                    isChecked={transferForm.is_recurring}
                    onChange={(e) => setTransferForm({ ...transferForm, is_recurring: e.target.checked })}
                  />
                  <FormLabel mb={0}>Make this a recurring transfer</FormLabel>
                </HStack>
              </FormControl>

              {transferForm.is_recurring && (
                <FormControl>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    value={transferForm.recurring_frequency}
                    onChange={(e) => setTransferForm({ ...transferForm, recurring_frequency: e.target.value })}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTransferClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleTransfer}>
              Transfer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

