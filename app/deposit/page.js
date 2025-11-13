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
  RadioGroup,
  Radio,
  Stack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Upload,
  Camera,
  CreditCard,
  Building2,
  CheckCircle,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import ContactUsModal from '@/components/ContactUsModal';

export default function DepositPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isOpen: isDepositOpen, onOpen: onDepositOpen, onClose: onDepositClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [depositMethod, setDepositMethod] = useState('check');
  const [checkImage, setCheckImage] = useState(null);
  const [accountStatus, setAccountStatus] = useState('active');
  const [accountStatusReason, setAccountStatusReason] = useState('');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
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

      // Set default account
      if (accountsData && accountsData.length > 0) {
        const primary = accountsData.find(a => a.is_primary) || accountsData[0];
        setSelectedAccount(primary.id);
      }

      // Load notification counts
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotificationCount((notificationsData || []).length);

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadAlertCount((alertsData || []).length);

    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDepositModal = () => {
    if (accountStatus !== 'active') {
      toast({
        title: accountStatus === 'blocked' ? 'Account blocked' : 'Account under review',
        description:
          accountStatusReason ||
          'Deposits are temporarily disabled for this account. Please contact support.',
        status: accountStatus === 'blocked' ? 'error' : 'warning',
        duration: 4000,
      });
      return;
    }

    onDepositOpen();
  };

  const handleCheckImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setCheckImage(file);
    toast({
      title: 'Check Image Uploaded',
      description: 'Check image ready for deposit',
      status: 'success',
      duration: 2000,
    });
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid deposit amount',
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

    if (depositMethod === 'check' && !checkImage) {
      toast({
        title: 'Error',
        description: 'Please upload a check image',
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
          'Deposits are temporarily disabled for this account. Please contact support.',
        status: accountStatus === 'blocked' ? 'error' : 'warning',
        duration: 4000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amount = parseFloat(depositAmount);

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) {
        throw new Error('Account not found');
      }

      // Create pending transaction record for review
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: selectedAccount,
          amount: amount,
          transaction_type: 'deposit',
          category: 'Deposit',
          description: `Deposit via ${depositMethod}`,
          recipient_name: account.account_name || 'Self',
          status: 'pending',
          review_status: 'pending',
          requires_manual_review: true,
        });

      if (transactionError) throw transactionError;

      // Upload check image if provided
      if (depositMethod === 'check' && checkImage) {
        const fileExt = checkImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('id-documents')
          .upload(`check-deposits/${fileName}`, checkImage);

        if (uploadError) {
          console.error('Error uploading check image:', uploadError);
          // Don't fail the deposit if image upload fails
        }
      }

      toast({
        title: 'Deposit Submitted',
        description: '$' + amount.toFixed(2) + ' is pending approval. We will notify you once it is processed.',
        status: 'info',
        duration: 4000,
      });

      onDepositClose();
      setDepositAmount('');
      setCheckImage(null);
      loadAccounts();
      
      // Redirect to wallet after a moment
      setTimeout(() => {
        router.push('/wallet');
      }, 1500);
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deposit. Please try again.',
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
              Deposit Money
            </Text>
          </HStack>
          <IconButton
            icon={<MessageCircle size={20} />}
            variant="ghost"
            colorScheme="purple"
            aria-label="Contact Us"
            onClick={onContactOpen}
          />
        </Flex>
      </Box>

      <Box px={4} py={4}>
        <VStack spacing={6} align="stretch">
          {accountStatus !== 'active' && (
            <Alert
              status={accountStatus === 'blocked' ? 'error' : 'warning'}
              borderRadius="lg"
            >
              <AlertIcon />
              <VStack align="flex-start" spacing={1}>
                <Text fontWeight="semibold" color="gray.800">
                  {accountStatus === 'blocked' ? 'Account blocked' : 'Account under review'}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {accountStatusReason ||
                    'Deposits are temporarily disabled. Please contact support for assistance.'}
                </Text>
              </VStack>
            </Alert>
          )}

          {/* Deposit Methods */}
          <Card bg={cardBg} borderRadius="xl" boxShadow="md">
            <CardBody>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
                Deposit Methods
              </Text>
              <VStack spacing={4} align="stretch">
                <Card
                  bg="purple.50"
                  border="2px solid"
                  borderColor="purple.200"
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => {
                    setDepositMethod('check');
                    handleOpenDepositModal();
                  }}
                >
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <Box
                        w="50px"
                        h="50px"
                        borderRadius="full"
                        bg="purple.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Camera size={24} color="white" />
                      </Box>
                      <VStack align="flex-start" spacing={0} flex={1}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">
                          Mobile Check Deposit
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Take a photo of your check
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>

                <Card
                  bg="blue.50"
                  border="2px solid"
                  borderColor="blue.200"
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => {
                    setDepositMethod('transfer');
                    handleOpenDepositModal();
                  }}
                >
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <Box
                        w="50px"
                        h="50px"
                        borderRadius="full"
                        bg="blue.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <CreditCard size={24} color="white" />
                      </Box>
                      <VStack align="flex-start" spacing={0} flex={1}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">
                          Transfer from External Account
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Link and transfer from another bank
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>

                <Card
                  bg="green.50"
                  border="2px solid"
                  borderColor="green.200"
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => {
                    setDepositMethod('cash');
                    handleOpenDepositModal();
                  }}
                >
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <Box
                        w="50px"
                        h="50px"
                        borderRadius="full"
                        bg="green.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Building2 size={24} color="white" />
                      </Box>
                      <VStack align="flex-start" spacing={0} flex={1}>
                        <Text fontSize="md" fontWeight="semibold" color="gray.800">
                          Cash Deposit at ATM
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Deposit cash at any NovaBank ATM
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              </VStack>
            </CardBody>
          </Card>

          {/* Recent Deposits */}
          <Card bg={cardBg} borderRadius="xl" boxShadow="md">
            <CardBody>
              <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
                Recent Deposits
              </Text>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color="gray.600" textAlign="center" py={4}>
                  No recent deposits
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>

      {/* Deposit Modal */}
      <Modal isOpen={isDepositOpen} onClose={onDepositClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {depositMethod === 'check' && 'Mobile Check Deposit'}
            {depositMethod === 'transfer' && 'Transfer from External Account'}
            {depositMethod === 'cash' && 'Cash Deposit'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Amount</FormLabel>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Deposit To</FormLabel>
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  size="lg"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ({account.account_type}) - {formatCurrency(account.balance)}
                    </option>
                  ))}
                  {cards.map((card) => (
                    <option key={card.id} value={`card_${card.id}`}>
                      {card.card_holder_name} •••• {card.card_number.slice(-4)} - {formatCurrency(card.balance)}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {depositMethod === 'check' && (
                <FormControl>
                  <FormLabel>Check Image</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCheckImageUpload}
                    size="lg"
                  />
                  {checkImage && (
                    <Text fontSize="sm" color="green.600" mt={2}>
                      ✓ {checkImage.name} uploaded
                    </Text>
                  )}
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    Take a clear photo of both sides of your check
                  </Text>
                </FormControl>
              )}

              {depositMethod === 'transfer' && (
                <Box p={4} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" color="gray.600">
                    To link an external account, you'll need to verify your external bank account.
                    This feature will be available soon.
                  </Text>
                </Box>
              )}

              {depositMethod === 'cash' && (
                <Box p={4} bg="green.50" borderRadius="md">
                  <Text fontSize="sm" color="gray.600">
                    Visit any NovaBank ATM to deposit cash. Your deposit will appear in your account
                    within 1-2 business days.
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDepositClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleDeposit}
              isDisabled={depositMethod === 'transfer' || accountStatus !== 'active'}
            >
              {depositMethod === 'transfer' ? 'Coming Soon' : 'Complete Deposit'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}


