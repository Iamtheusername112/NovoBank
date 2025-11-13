'use client';

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
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Input,
  FormControl,
  FormLabel,
  Select,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Receipt,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

export default function BillsPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isOpen: isPayOpen, onOpen: onPayOpen, onClose: onPayClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [newBill, setNewBill] = useState({
    bill_name: '',
    amount: '',
    category: 'Utilities',
    due_date: '1',
    is_recurring: true,
    frequency: 'monthly',
  });
  const [accountStatus, setAccountStatus] = useState('active');
  const [accountStatusReason, setAccountStatusReason] = useState('');

  useEffect(() => {
    setMounted(true);
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load bills
      const { data: billsData } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('next_payment_date', { ascending: true });
      setBills(billsData || []);

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });
      setAccounts(accountsData || []);

      // Load cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id);
      setCards(cardsData || []);

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('account_status, account_status_reason')
        .eq('id', user.id)
        .single();
      setAccountStatus(profileData?.account_status || 'active');
      setAccountStatusReason(profileData?.account_status_reason || '');

    } catch (error) {
      console.error('Error loading bills:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bills',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (bill) => {
    if (accountStatus !== 'active') {
      toast({
        title: accountStatus === 'blocked' ? 'Account blocked' : 'Account under review',
        description:
          accountStatusReason ||
          'Payments are temporarily disabled for this account. Please contact support.',
        status: accountStatus === 'blocked' ? 'error' : 'warning',
        duration: 4000,
      });
      return;
    }

    setSelectedBill(bill);
    onPayOpen();
  };

  const handlePayBill = async () => {
    if (!selectedBill || !selectedAccount) {
      toast({
        title: 'Error',
        description: 'Please select a payment method',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if account has sufficient balance
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) {
        toast({
          title: 'Error',
          description: 'Account not found',
          status: 'error',
          duration: 3000,
        });
        return;
      }

    if (accountStatus !== 'active') {
      toast({
        title: accountStatus === 'blocked' ? 'Account blocked' : 'Account under review',
        description:
          accountStatusReason ||
          'Payments are temporarily disabled for this account. Please contact support.',
        status: accountStatus === 'blocked' ? 'error' : 'warning',
        duration: 4000,
      });
      return;
    }

      const balance = parseFloat(account.balance || 0);
      if (balance < parseFloat(selectedBill.amount)) {
        toast({
          title: 'Insufficient Funds',
          description: 'You do not have enough balance to pay this bill',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Update bill as paid
      const nextPaymentDate = calculateNextPaymentDate(selectedBill);
      const { error: updateError } = await supabase
        .from('bills')
        .update({
          is_paid: true,
          last_paid_date: new Date().toISOString().split('T')[0],
          next_payment_date: nextPaymentDate,
        })
        .eq('id', selectedBill.id);

      if (updateError) throw updateError;

      // Create pending transaction record for review
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: selectedAccount,
          amount: -parseFloat(selectedBill.amount),
          transaction_type: 'sent',
          category: selectedBill.category,
          description: `Bill payment: ${selectedBill.bill_name}`,
          recipient_name: selectedBill.bill_name,
          status: 'pending',
          review_status: 'pending',
          requires_manual_review: true,
        });

      toast({
        title: 'Bill Payment Submitted',
        description: `${selectedBill.bill_name} will be processed once approved.`,
        status: 'info',
        duration: 4000,
      });

      onPayClose();
      setSelectedBill(null);
      setSelectedAccount('');
      loadBills();
    } catch (error) {
      console.error('Error paying bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit bill payment',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleAddBill = async () => {
    if (!newBill.bill_name || !newBill.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextPaymentDate = calculateNextPaymentDate(newBill);
      
      const { error } = await supabase
        .from('bills')
        .insert({
          user_id: user.id,
          bill_name: newBill.bill_name,
          amount: parseFloat(newBill.amount),
          category: newBill.category,
          due_date: parseInt(newBill.due_date),
          is_recurring: newBill.is_recurring,
          frequency: newBill.frequency,
          next_payment_date: nextPaymentDate,
        });

      if (error) throw error;

      toast({
        title: 'Bill Added',
        description: 'Bill has been added successfully',
        status: 'success',
        duration: 3000,
      });

      onAddClose();
      setNewBill({
        bill_name: '',
        amount: '',
        category: 'Utilities',
        due_date: '1',
        is_recurring: true,
        frequency: 'monthly',
      });
      loadBills();
    } catch (error) {
      console.error('Error adding bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to add bill',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const calculateNextPaymentDate = (bill) => {
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), parseInt(bill.due_date));
    
    if (nextDate < today) {
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, parseInt(bill.due_date));
    }

    if (bill.frequency === 'weekly') {
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 7);
    } else if (bill.frequency === 'yearly') {
      nextDate = new Date(today.getFullYear() + 1, today.getMonth(), parseInt(bill.due_date));
    }

    return nextDate.toISOString().split('T')[0];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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

  const unpaidBills = bills.filter(b => !b.is_paid);
  const paidBills = bills.filter(b => b.is_paid);

  return (
    <Box minH="100vh" bg={bgColor} pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Box px={4} py={4} bg={cardBg} borderBottom="1px" borderColor="gray.200">
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <IconButton
              icon={<ArrowLeft size={20} />}
              variant="ghost"
              onClick={() => router.back()}
              aria-label="Back"
            />
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              Pay Bills
            </Text>
          </HStack>
          <IconButton
            icon={<Plus size={20} />}
            variant="ghost"
            onClick={onAddOpen}
            aria-label="Add Bill"
          />
        </Flex>
      </Box>

      <Box px={4} py={4}>
        {accountStatus !== 'active' && (
          <Alert status={accountStatus === 'blocked' ? 'error' : 'warning'} borderRadius="lg" mb={6}>
            <AlertIcon />
            <VStack align="flex-start" spacing={1}>
              <Text fontWeight="semibold" color="gray.800">
                {accountStatus === 'blocked' ? 'Account blocked' : 'Account under review'}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {accountStatusReason ||
                  'Payments are temporarily disabled. Please contact support for assistance.'}
              </Text>
            </VStack>
          </Alert>
        )}

        {/* Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <Box mb={6}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
              Upcoming Bills
            </Text>
            <VStack spacing={3} align="stretch">
              {unpaidBills.map((bill) => {
                const daysUntil = getDaysUntilDue(bill.next_payment_date);
                const isOverdue = daysUntil < 0;
                const isDueSoon = daysUntil >= 0 && daysUntil <= 3;

                return (
                  <Card
                    key={bill.id}
                    bg={cardBg}
                    borderRadius="md"
                    borderLeft={isOverdue ? '4px solid' : isDueSoon ? '4px solid' : 'none'}
                    borderLeftColor={isOverdue ? 'red.500' : 'orange.500'}
                  >
                    <CardBody p={4}>
                      <Flex justify="space-between" align="flex-start">
                        <VStack align="flex-start" spacing={2} flex={1}>
                          <HStack spacing={2}>
                            <Receipt size={20} color="#6b7280" />
                            <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                              {bill.bill_name}
                            </Text>
                          </HStack>
                          <HStack spacing={2}>
                            <Badge colorScheme={bill.category === 'Utilities' ? 'blue' : 'purple'}>
                              {bill.category}
                            </Badge>
                            {bill.is_recurring && (
                              <Badge colorScheme="gray" variant="outline">
                                {bill.frequency}
                              </Badge>
                            )}
                            {isOverdue && (
                              <Badge colorScheme="red">Overdue</Badge>
                            )}
                            {isDueSoon && !isOverdue && (
                              <Badge colorScheme="orange">Due Soon</Badge>
                            )}
                          </HStack>
                          <HStack spacing={4} fontSize="sm" color="gray.600">
                            <HStack spacing={1}>
                              <Calendar size={16} />
                              <Text>Due: {formatDate(bill.next_payment_date)}</Text>
                            </HStack>
                            {daysUntil !== null && (
                              <Text>
                                {isOverdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days left`}
                              </Text>
                            )}
                          </HStack>
                          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                            {formatCurrency(bill.amount)}
                          </Text>
                        </VStack>
                        <Button
                          colorScheme="purple"
                          onClick={() => handleOpenPayModal(bill)}
                          isDisabled={isOverdue && daysUntil < -30}
                        >
                          Pay Now
                        </Button>
                      </Flex>
                    </CardBody>
                  </Card>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* Paid Bills */}
        {paidBills.length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
              Recent Payments
            </Text>
            <VStack spacing={3} align="stretch">
              {paidBills.slice(0, 5).map((bill) => (
                <Card key={bill.id} bg={cardBg} borderRadius="md" opacity={0.7}>
                  <CardBody p={4}>
                    <Flex justify="space-between" align="center">
                      <HStack spacing={3}>
                        <CheckCircle size={20} color="#10b981" />
                        <VStack align="flex-start" spacing={0}>
                          <Text fontSize="md" fontWeight="semibold" color="gray.800">
                            {bill.bill_name}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            Paid on {formatDate(bill.last_paid_date)}
                          </Text>
                        </VStack>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold" color="gray.800">
                        {formatCurrency(bill.amount)}
                      </Text>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </Box>
        )}

        {bills.length === 0 && (
          <Box textAlign="center" py={12}>
            <Receipt size={64} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={2}>
              No Bills Yet
            </Text>
            <Text color="gray.600" mb={4}>
              Add your first bill to get started
            </Text>
            <Button colorScheme="purple" onClick={onAddOpen}>
              Add Bill
            </Button>
          </Box>
        )}
      </Box>

      {/* Pay Bill Modal */}
      <Modal isOpen={isPayOpen} onClose={onPayClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Pay Bill</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedBill && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.600">Bill Name</Text>
                  <Text fontSize="lg" fontWeight="semibold">{selectedBill.bill_name}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600">Amount</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                    {formatCurrency(selectedBill.amount)}
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel>Pay From</FormLabel>
                  <Select
                    placeholder="Select payment method"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} ({account.account_type}) - {formatCurrency(account.balance)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPayClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handlePayBill}
              isDisabled={accountStatus !== 'active'}
            >
              Pay Bill
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Bill Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Bill</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Bill Name</FormLabel>
                <Input
                  placeholder="e.g., Electricity, Rent, Internet"
                  value={newBill.bill_name}
                  onChange={(e) => setNewBill({ ...newBill, bill_name: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Amount</FormLabel>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={newBill.category}
                  onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                >
                  <option value="Utilities">Utilities</option>
                  <option value="Rent">Rent</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Loan">Loan</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Due Date (Day of Month)</FormLabel>
                <Select
                  value={newBill.due_date}
                  onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Frequency</FormLabel>
                <Select
                  value={newBill.frequency}
                  onChange={(e) => setNewBill({ ...newBill, frequency: e.target.value })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddBill}>
              Add Bill
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}

