'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
  Card,
  CardBody,
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
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
} from '@chakra-ui/react';
import { ArrowLeft, ChevronDown, CreditCard, X, ArrowRight, QrCode, Calendar, Clock } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

function SendMoneyContent() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  
  const [amount, setAmount] = useState('0');
  const [swipeProgress, setSwipeProgress] = useState(0);
  const swipeProgressRef = useRef(0);
  const [recipient, setRecipient] = useState({ name: 'Ann', account: '... 6301' });
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Schedule payment states
  const { isOpen: isScheduleOpen, onOpen: onScheduleOpen, onClose: onScheduleClose } = useDisclosure();
  const { isOpen: isQROpen, onOpen: onQROpen, onClose: onQRClose } = useDisclosure();
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    is_recurring: false,
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: '',
  });
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    setMounted(true);
    loadAccountsAndFavorites();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('schedule') === 'true') {
        setIsScheduled(true);
      }
    }
  }, []);

  const loadAccountsAndFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });
      setAccounts(accountsData || []);
      if (accountsData && accountsData.length > 0) {
        setSelectedAccount(accountsData[0].id);
      }

      // Load cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id);
      setCards(cardsData || []);

      // Load favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id);
      setFavorites(favoritesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleNumberInput = (value) => {
    if (amount === '0' || amount === '0.0') {
      setAmount(value);
    } else {
      setAmount(amount + value);
    }
  };

  const handleDecimal = () => {
    if (!amount.includes('.')) {
      setAmount(amount + '.');
    }
  };

  const handleBackspace = () => {
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount('0');
    }
  };

  const handleSwipeStart = (e) => {
    e.preventDefault();
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const button = e.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    const maxSwipe = buttonRect.width - 60;

    const handleMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentX = moveEvent.touches
        ? moveEvent.touches[0].clientX
        : moveEvent.clientX;
      const diff = currentX - startX;
      const progress = Math.min(Math.max((diff / maxSwipe) * 100, 0), 100);
      swipeProgressRef.current = progress;
      setSwipeProgress(progress);
    };

    const handleEnd = () => {
      const finalProgress = swipeProgressRef.current;
      if (finalProgress > 80) {
        if (isScheduled) {
          onScheduleOpen();
        } else {
          handlePayment();
        }
        setSwipeProgress(100);
      } else {
        setSwipeProgress(0);
      }
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  const handlePayment = async () => {
    if (parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!selectedAccount) {
      toast({
        title: 'Error',
        description: 'Please select an account',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) {
        throw new Error('Account not found');
      }

      const paymentAmount = parseFloat(amount);
      if (paymentAmount > parseFloat(account.balance)) {
        toast({
          title: 'Insufficient Funds',
          description: 'You do not have enough balance',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      // Update account balance
      const newBalance = parseFloat(account.balance) - paymentAmount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', selectedAccount);

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: -paymentAmount,
          transaction_type: 'sent',
          category: 'Transfer',
          description: `Payment to ${recipient.name}`,
          recipient_name: recipient.name,
        });

      toast({
        title: 'Payment Successful',
        description: `$${paymentAmount.toFixed(2)} sent to ${recipient.name}`,
        status: 'success',
        duration: 3000,
      });

      setTimeout(() => {
        router.push('/wallet');
      }, 1500);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePayment = async () => {
    if (parseFloat(amount) <= 0 || !selectedAccount) {
      toast({
        title: 'Error',
        description: 'Please enter amount and select account',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate next payment date
      const startDate = new Date(scheduleForm.start_date);
      let nextPaymentDate = new Date(startDate);

      if (scheduleForm.is_recurring) {
        switch (scheduleForm.frequency) {
          case 'daily':
            nextPaymentDate.setDate(startDate.getDate() + 1);
            break;
          case 'weekly':
            nextPaymentDate.setDate(startDate.getDate() + 7);
            break;
          case 'biweekly':
            nextPaymentDate.setDate(startDate.getDate() + 14);
            break;
          case 'monthly':
            nextPaymentDate.setMonth(startDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextPaymentDate.setMonth(startDate.getMonth() + 3);
            break;
          case 'yearly':
            nextPaymentDate.setFullYear(startDate.getFullYear() + 1);
            break;
        }
      }

      const { error } = await supabase
        .from('scheduled_payments')
        .insert({
          user_id: user.id,
          recipient_name: recipient.name,
          recipient_account: recipient.account,
          amount: parseFloat(amount),
          account_id: selectedAccount,
          description: scheduleForm.description,
          is_recurring: scheduleForm.is_recurring,
          frequency: scheduleForm.is_recurring ? scheduleForm.frequency : null,
          start_date: scheduleForm.start_date,
          end_date: scheduleForm.end_date || null,
          next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: 'Payment Scheduled',
        description: 'Your payment has been scheduled successfully',
        status: 'success',
        duration: 3000,
      });

      onScheduleClose();
      setTimeout(() => {
        router.push('/scheduled-payments');
      }, 1500);
    } catch (error) {
      console.error('Schedule error:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule payment',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const keypadNumbers = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  // Generate QR code data for payment
  const generateQRData = () => {
    return JSON.stringify({
      type: 'payment',
      amount: parseFloat(amount) || 0,
      recipient: recipient.name,
      account: selectedAccount,
    });
  };

  const getQRImageUrl = (size) => {
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      size: `${size}x${size}`,
      data: generateQRData(),
      format: 'svg',
      margin: '0',
    });
    return `${baseUrl}?${params.toString()}`;
  };

  if (!mounted) {
    return null;
  }

  return (
    <Box
      minH="100vh"
      bg={bgColor}
      pb={{
        base: 'calc(env(safe-area-inset-bottom, 0px) + 180px)',
        md: '120px',
      }}
    >
      <StatusBar />
      <Box px={4} py={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <IconButton
            icon={<ArrowLeft size={20} />}
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Back"
          />
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            {isScheduled ? 'Schedule Payment' : 'Send Money'}
          </Text>
          <HStack spacing={2}>
            <IconButton
              icon={<QrCode size={20} />}
              variant="ghost"
              onClick={onQROpen}
              aria-label="QR Code"
            />
            <IconButton
              icon={<Clock size={20} />}
              variant="ghost"
              onClick={() => {
                setIsScheduled(!isScheduled);
                if (!isScheduled) {
                  toast({
                    title: 'Schedule Mode',
                    description: 'Swipe to schedule payment',
                    status: 'info',
                    duration: 2000,
                  });
                }
              }}
              aria-label="Schedule"
              colorScheme={isScheduled ? 'purple' : 'gray'}
            />
          </HStack>
        </Flex>

        <Tabs colorScheme="purple" mb={6}>
          <TabList>
            <Tab>Recipients</Tab>
            <Tab>QR Code</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <Card bg={cardBg} borderRadius="xl" mb={6}>
                <CardBody p={4}>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box
                        w="50px"
                        h="50px"
                        borderRadius="full"
                        bg="purple.300"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          {recipient.name[0]}
                        </Text>
                      </Box>
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="md" fontWeight="bold" color="gray.800">
                          {recipient.name}
                        </Text>
                        <HStack spacing={1}>
                          <CreditCard size={12} color="#666" />
                          <Text fontSize="xs" color="gray.600">
                            {recipient.account}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                    <ChevronDown size={20} color="#666" />
                  </Flex>
                </CardBody>
              </Card>
            </TabPanel>
            <TabPanel px={0}>
              <Card bg={cardBg} borderRadius="xl" mb={6}>
                <CardBody p={4}>
                  <VStack spacing={4}>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      Scan QR code to send payment
                    </Text>
                    <Box p={4} bg="white" borderRadius="md" display="flex" justifyContent="center">
                      <Image
                        src={getQRImageUrl(200)}
                        alt="Payment QR code"
                        width={200}
                        height={200}
                      />
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => {
                        // In a real app, this would open camera to scan QR
                        toast({
                          title: 'QR Scanner',
                          description: 'QR scanner feature coming soon',
                          status: 'info',
                          duration: 2000,
                        });
                      }}
                    >
                      Scan QR Code
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Account Selection */}
        {accounts.length > 0 && (
          <Card bg={cardBg} borderRadius="xl" mb={6}>
            <CardBody p={4}>
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600">Pay From</FormLabel>
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  size="lg"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </CardBody>
          </Card>
        )}

        <VStack spacing={8} mb={8}>
          {isScheduled && (
            <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
              <HStack spacing={1}>
                <Calendar size={16} />
                <Text>Scheduled Payment</Text>
              </HStack>
            </Badge>
          )}
          <Text fontSize="4xl" fontWeight="light" color="gray.400">
            ${amount}
          </Text>

          <VStack spacing={3} w="full">
            {keypadNumbers.map((row, rowIndex) => (
              <HStack key={rowIndex} spacing={3} justify="center" w="full">
                {row.map((num) => (
                  <Button
                    key={num}
                    onClick={() => handleNumberInput(num.toString())}
                    w="70px"
                    h="70px"
                    borderRadius="full"
                    bg="gray.200"
                    color="gray.800"
                    fontSize="xl"
                    fontWeight="semibold"
                    _hover={{ bg: 'gray.300' }}
                  >
                    {num}
                  </Button>
                ))}
              </HStack>
            ))}
            <HStack spacing={3} justify="center" w="full">
              <Button
                onClick={handleDecimal}
                w="70px"
                h="70px"
                borderRadius="full"
                bg="gray.200"
                color="gray.800"
                fontSize="xl"
                fontWeight="semibold"
                _hover={{ bg: 'gray.300' }}
              >
                .
              </Button>
              <Button
                onClick={() => handleNumberInput('0')}
                w="70px"
                h="70px"
                borderRadius="full"
                bg="gray.200"
                color="gray.800"
                fontSize="xl"
                fontWeight="semibold"
                _hover={{ bg: 'gray.300' }}
              >
                0
              </Button>
              <Button
                onClick={handleBackspace}
                w="70px"
                h="70px"
                borderRadius="full"
                bg="gray.200"
                color="gray.800"
                fontSize="xl"
                _hover={{ bg: 'gray.300' }}
              >
                <X size={24} />
              </Button>
            </HStack>
          </VStack>
        </VStack>

        <Box
          position="fixed"
          bottom={{
            base: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
            md: '48px',
          }}
          left={{ base: 4, md: '50%' }}
          right={{ base: 4, md: 'auto' }}
          transform={{ base: 'none', md: 'translateX(-50%)' }}
          maxW={{ base: 'auto', md: '420px' }}
          mx="auto"
          zIndex={100}
        >
          <Box
            bg={isScheduled ? 'purple.400' : 'purple.600'}
            borderRadius="full"
            h="60px"
            position="relative"
            overflow="hidden"
            onMouseDown={handleSwipeStart}
            onTouchStart={handleSwipeStart}
            cursor="grab"
            _active={{ cursor: 'grabbing' }}
            userSelect="none"
          >
            <Flex
              align="center"
              justify={swipeProgress > 50 ? 'flex-end' : 'flex-start'}
              h="full"
              px={4}
              transition="all 0.1s"
            >
              <Box
                w="50px"
                h="50px"
                borderRadius="full"
                bg="purple.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="absolute"
                left={swipeProgress > 50 ? 'auto' : `${8 + swipeProgress * 0.5}px`}
                right={swipeProgress > 50 ? `${8 + (100 - swipeProgress) * 0.5}px` : 'auto'}
                transition="all 0.1s"
                style={{ transform: `translateX(${swipeProgress * 0.3}px)` }}
              >
                {swipeProgress > 50 ? (
                  <ArrowRight size={24} color="white" />
                ) : (
                  <Box position="relative" w="20px" h="20px">
                    <Box
                      w="2px"
                      h="12px"
                      bg="white"
                      position="absolute"
                      left="4px"
                      top="4px"
                    />
                    <Box
                      w="2px"
                      h="8px"
                      bg="white"
                      position="absolute"
                      left="8px"
                      top="6px"
                    />
                    <Box
                      w="2px"
                      h="16px"
                      bg="white"
                      position="absolute"
                      left="12px"
                      top="2px"
                    />
                  </Box>
                )}
              </Box>
              {swipeProgress < 50 && (
                <Text
                  color="white"
                  fontWeight="semibold"
                  ml="70px"
                  fontSize="md"
                  transition="opacity 0.2s"
                  opacity={swipeProgress > 20 ? 0 : 1}
                >
                  {isScheduled ? 'SWIPE TO SCHEDULE' : 'SWIPE TO PAY'}
                </Text>
              )}
            </Flex>
          </Box>
        </Box>
      </Box>

      {/* Schedule Payment Modal */}
      <Modal isOpen={isScheduleOpen} onClose={onScheduleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schedule Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="full">
                <Text fontSize="sm" color="gray.600">Amount</Text>
                <Text fontSize="2xl" fontWeight="bold">{formatCurrency(parseFloat(amount) || 0)}</Text>
              </Box>
              <Box w="full">
                <Text fontSize="sm" color="gray.600">Recipient</Text>
                <Text fontSize="lg" fontWeight="semibold">{recipient.name}</Text>
              </Box>
              <FormControl>
                <FormLabel>Recurring Payment</FormLabel>
                <Switch
                  isChecked={scheduleForm.is_recurring}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_recurring: e.target.checked })}
                />
              </FormControl>
              {scheduleForm.is_recurring && (
                <FormControl>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </FormControl>
              )}
              <FormControl>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={scheduleForm.start_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              {scheduleForm.is_recurring && (
                <FormControl>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Input
                    type="date"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                    min={scheduleForm.start_date}
                  />
                </FormControl>
              )}
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input
                  placeholder="e.g., Monthly rent payment"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onScheduleClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSchedulePayment} isLoading={loading}>
              Schedule Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={isQROpen} onClose={onQRClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>QR Code Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Share this QR code to receive payment
              </Text>
              <Box p={4} bg="white" borderRadius="md" display="flex" justifyContent="center">
                <Image
                  src={getQRImageUrl(256)}
                  alt="Payment QR code"
                  width={256}
                  height={256}
                />
              </Box>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Amount: {formatCurrency(parseFloat(amount) || 0)}
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onQRClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}

export default function SendMoneyPage() {
  return <SendMoneyContent />;
}
