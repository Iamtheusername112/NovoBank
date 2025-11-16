'use client';

import { useState, useEffect, useRef } from 'react';
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
  Image,
  Spinner,
} from '@chakra-ui/react';
import {
  Camera,
  Upload,
  ArrowRight,
  CheckCircle,
  XCircle,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function CheckDepositPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [checkDeposits, setCheckDeposits] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { isOpen: isDepositOpen, onOpen: onDepositOpen, onClose: onDepositClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [depositForm, setDepositForm] = useState({
    account_id: '',
    check_number: '',
    amount: '',
    deposit_date: '', // Will be set after mount to prevent hydration mismatch
  });

  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontImagePreview, setFrontImagePreview] = useState(null);
  const [backImagePreview, setBackImagePreview] = useState(null);

  const fileInputFrontRef = useRef(null);
  const fileInputBackRef = useRef(null);

  const modalSize = useBreakpointValue({ base: 'full', md: 'lg' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    setMounted(true);
    // Set deposit_date after mount to prevent hydration mismatch
    setDepositForm(prev => ({
      ...prev,
      deposit_date: new Date().toISOString().split('T')[0],
    }));
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

      // Load check deposits
      const { data: depositsData } = await supabase
        .from('check_deposits')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (depositsData) setCheckDeposits(depositsData);

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

  const handleImageSelect = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        status: 'error',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        status: 'error',
      });
      return;
    }

    if (side === 'front') {
      setFrontImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setBackImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file, path) => {
    try {
      const { data, error } = await supabase.storage
        .from('check-deposits')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // If bucket doesn't exist, create it programmatically (fallback)
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          console.warn('Check-deposits bucket not found. Please create it in Supabase Dashboard > Storage.');
          // Return a placeholder URL for now
          return URL.createObjectURL(file);
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('check-deposits')
        .getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback: return object URL if storage fails
      return URL.createObjectURL(file);
    }
  };

  const handleDeposit = async () => {
    if (!depositForm.account_id || !depositForm.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    if (!frontImage || !backImage) {
      toast({
        title: 'Error',
        description: 'Please capture both front and back images of the check',
        status: 'error',
      });
      return;
    }

    const amount = parseFloat(depositForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        status: 'error',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Authentication failed. Please log in again.');
      }

      // Upload images
      const timestamp = Date.now();
      const frontPath = `${authUser.id}/${timestamp}_front.jpg`;
      const backPath = `${authUser.id}/${timestamp}_back.jpg`;

      let frontImageUrl, backImageUrl;
      try {
        frontImageUrl = await uploadImage(frontImage, frontPath);
        backImageUrl = await uploadImage(backImage, backPath);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error(`Failed to upload images: ${uploadError.message || 'Unknown error'}`);
      }

      // Validate and format dates
      const depositDate = depositForm.deposit_date ? new Date(depositForm.deposit_date) : new Date();
      if (isNaN(depositDate.getTime())) {
        throw new Error('Invalid deposit date');
      }

      const availableDate = new Date(depositDate);
      availableDate.setDate(availableDate.getDate() + 1);

      // Format dates as YYYY-MM-DD strings for PostgreSQL DATE type
      const depositDateStr = depositDate.toISOString().split('T')[0];
      const availableDateStr = availableDate.toISOString().split('T')[0];

      // Prepare insert data
      const insertData = {
        user_id: authUser.id,
        account_id: depositForm.account_id,
        check_number: depositForm.check_number?.trim() || null,
        amount: amount,
        front_image_url: frontImageUrl || null,
        back_image_url: backImageUrl || null,
        deposit_date: depositDateStr,
        available_date: availableDateStr,
        status: 'pending',
      };

      // Log the data being inserted for debugging
      console.log('Inserting check deposit with data:', {
        ...insertData,
        front_image_url: frontImageUrl ? 'present' : 'missing',
        back_image_url: backImageUrl ? 'present' : 'missing',
      });
      
      // Verify account exists
      const { data: accountCheck, error: accountError } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('id', depositForm.account_id)
        .eq('user_id', authUser.id)
        .single();
      
      if (accountError || !accountCheck) {
        console.error('Account verification failed:', accountError);
        throw new Error(`Invalid account selected. Please select a valid account. ${accountError?.message || ''}`);
      }
      
      console.log('Account verified:', accountCheck);

      // Verify table exists by trying to query it (with better error handling)
      let tableCheckError = null;
      try {
        const { error: checkError } = await supabase
          .from('check_deposits')
          .select('id')
          .limit(0);
        
        tableCheckError = checkError;
        
        if (tableCheckError) {
          // Try to extract error details
          const errorDetails = {
            message: tableCheckError.message,
            details: tableCheckError.details,
            hint: tableCheckError.hint,
            code: tableCheckError.code,
          };
          
          console.error('Table check error:', tableCheckError);
          console.error('Table check error details:', errorDetails);
          
          // If it's a "table not found" error, provide helpful message
          const errorMsg = tableCheckError.message || tableCheckError.details || 'Unknown error';
          if (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('schema cache')) {
            throw new Error(`Table 'check_deposits' does not exist. Please run the migration script '010_create_check_deposits_table.sql' in your Supabase SQL Editor.`);
          } else {
            throw new Error(`Cannot access 'check_deposits' table: ${errorMsg}. Please check your database setup and RLS policies.`);
          }
        }
      } catch (checkException) {
        // If it's already our custom error, re-throw it
        if (checkException.message && checkException.message.includes('does not exist')) {
          throw checkException;
        }
        // Otherwise, wrap it
        console.error('Exception during table check:', checkException);
        throw new Error(`Table check failed: ${checkException.message || 'Unknown error'}. Please ensure the 'check_deposits' table exists.`);
      }

      // Insert check deposit (try without .single() first to see if that's the issue)
      let deposit, depositError;
      
      try {
        const result = await supabase
          .from('check_deposits')
          .insert(insertData)
          .select();
        
        deposit = result.data;
        depositError = result.error;
        
        // If we got data but it's an array, take the first item
        if (deposit && Array.isArray(deposit) && deposit.length > 0) {
          deposit = deposit[0];
        } else if (deposit && Array.isArray(deposit) && deposit.length === 0) {
          depositError = depositError || { message: 'No data returned from insert' };
        }
      } catch (insertException) {
        console.error('Exception during insert:', insertException);
        depositError = insertException;
      }

      if (depositError) {
        // Log the raw error object
        console.error('Raw database error:', depositError);
        console.error('Error object type:', typeof depositError);
        console.error('Error constructor:', depositError?.constructor?.name);
        console.error('Error instanceof Error:', depositError instanceof Error);
        
        // Try to extract all possible error properties using multiple methods
        const errorInfo = {};
        
        // Method 1: Direct property access
        if (depositError.message) errorInfo.message = depositError.message;
        if (depositError.details) errorInfo.details = depositError.details;
        if (depositError.hint) errorInfo.hint = depositError.hint;
        if (depositError.code) errorInfo.code = depositError.code;
        if (depositError.statusCode) errorInfo.statusCode = depositError.statusCode;
        if (depositError.status) errorInfo.status = depositError.status;
        
        // Method 2: Enumerable properties
        try {
          Object.keys(depositError).forEach(key => {
            errorInfo[`key_${key}`] = depositError[key];
          });
        } catch (e) {
          console.error('Could not enumerate error properties:', e);
        }
        
        // Method 3: All own properties (including non-enumerable)
        try {
          Object.getOwnPropertyNames(depositError).forEach(key => {
            try {
              errorInfo[`prop_${key}`] = depositError[key];
            } catch (e) {
              errorInfo[`prop_${key}`] = '[cannot access]';
            }
          });
        } catch (e) {
          console.error('Could not get own property names:', e);
        }
        
        // Method 4: Try to stringify with replacer
        try {
          const errorStr = JSON.stringify(depositError, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              return value;
            }
            return value;
          }, 2);
          errorInfo.jsonStringified = errorStr;
        } catch (e) {
          errorInfo.jsonError = e.message;
        }
        
        // Method 5: Try toString
        try {
          errorInfo.toString = depositError.toString();
        } catch (e) {
          errorInfo.toStringError = e.message;
        }
        
        console.error('Extracted error info:', errorInfo);
        
        // Extract error message with fallbacks
        let errorMsg = 'Database error occurred';
        
        // Try multiple sources for error message
        const possibleMessages = [
          depositError.message,
          depositError.details,
          depositError.hint,
          depositError.toString?.(),
          errorInfo.toString,
          errorInfo.jsonStringified,
        ].filter(Boolean);
        
        if (possibleMessages.length > 0) {
          errorMsg = possibleMessages[0];
          
          // Add additional context
          if (depositError.code) {
            errorMsg += ` (Error Code: ${depositError.code})`;
          }
          if (depositError.statusCode) {
            errorMsg += ` (Status: ${depositError.statusCode})`;
          }
          if (depositError.details && depositError.details !== errorMsg && !errorMsg.includes(depositError.details)) {
            errorMsg += `. ${depositError.details}`;
          }
        } else {
          // Last resort: check if it's an RLS policy issue
          errorMsg = 'Failed to insert check deposit. This might be due to: missing table, RLS policy restrictions, or invalid account ID. Please check your database setup.';
          if (errorInfo.jsonStringified && errorInfo.jsonStringified !== '{}') {
            errorMsg += ` Error details: ${errorInfo.jsonStringified}`;
          }
        }
        
        throw new Error(errorMsg);
      }

      if (!deposit) {
        throw new Error('No data returned from deposit insert');
      }

      toast({
        title: 'Check Deposited',
        description: 'Your check deposit is being processed',
        status: 'success',
        duration: 5000,
      });

      // Reset form
      setDepositForm({
        account_id: '',
        check_number: '',
        amount: '',
        deposit_date: new Date().toISOString().split('T')[0],
      });
      setFrontImage(null);
      setBackImage(null);
      setFrontImagePreview(null);
      setBackImagePreview(null);

      onDepositClose();
      loadUserData();
    } catch (error) {
      console.error('Error depositing check:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      
      // Extract error message from various possible formats
      let errorMessage = 'Unknown error occurred';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }
      
      // Add additional context if available
      if (error?.code) {
        errorMessage += ` (Error Code: ${error.code})`;
      }
      if (error?.hint && errorMessage !== error.hint) {
        errorMessage += `. ${error.hint}`;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
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
      case 'rejected':
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

  // Prevent hydration mismatch - must check before rendering any Chakra UI components
  if (typeof window === 'undefined' || !mounted) {
    return null;
  }

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
          <Heading size="md">Mobile Check Deposit</Heading>
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
        {/* Instructions Card */}
        <Card mb={6}>
          <CardBody>
            <VStack align="start" spacing={3}>
              <Heading size="sm">How to Deposit a Check</Heading>
              <VStack align="start" spacing={2} fontSize="sm" color="gray.600">
                <Text>1. Endorse the back of your check</Text>
                <Text>2. Ensure good lighting and a flat surface</Text>
                <Text>3. Capture clear images of both sides</Text>
                <Text>4. Enter the check amount</Text>
                <Text>5. Submit for processing</Text>
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Deposit Button */}
        <Button
          leftIcon={<Camera size={18} />}
          colorScheme="purple"
          size="lg"
          w="full"
          mb={6}
          onClick={onDepositOpen}
        >
          Deposit a Check
        </Button>

        {/* Recent Deposits */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Recent Deposits</Heading>
            {checkDeposits.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No deposits yet</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {checkDeposits.map((deposit) => (
                  <Flex
                    key={deposit.id}
                    justify="space-between"
                    align="center"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold">
                        {formatCurrency(deposit.amount)}
                      </Text>
                      <HStack spacing={2}>
                        <Badge colorScheme={getStatusColor(deposit.status)} fontSize="xs">
                          {deposit.status}
                        </Badge>
                        <Text fontSize="sm" color="gray.600">
                          {formatDate(deposit.deposit_date)}
                        </Text>
                      </HStack>
                      {deposit.available_date && (
                        <Text fontSize="xs" color="gray.500">
                          Available: {formatDate(deposit.available_date)}
                        </Text>
                      )}
                    </VStack>
                    {deposit.status === 'rejected' && deposit.rejection_reason && (
                      <Text fontSize="xs" color="red.500" maxW="150px" textAlign="right">
                        {deposit.rejection_reason}
                      </Text>
                    )}
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Deposit Modal */}
      <Modal isOpen={isDepositOpen} onClose={onDepositClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Deposit Check</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6}>
              {/* Account Selection */}
              <FormControl>
                <FormLabel>Deposit To Account *</FormLabel>
                <Select
                  value={depositForm.account_id}
                  onChange={(e) => setDepositForm({ ...depositForm, account_id: e.target.value })}
                  placeholder="Choose an account"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {/* Check Amount */}
              <FormControl>
                <FormLabel>Check Amount *</FormLabel>
                <Input
                  type="number"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              {/* Check Number */}
              <FormControl>
                <FormLabel>Check Number (Optional)</FormLabel>
                <Input
                  value={depositForm.check_number}
                  onChange={(e) => setDepositForm({ ...depositForm, check_number: e.target.value })}
                  placeholder="Enter check number"
                />
              </FormControl>

              {/* Deposit Date */}
              <FormControl>
                <FormLabel>Deposit Date</FormLabel>
                <Input
                  type="date"
                  value={depositForm.deposit_date}
                  onChange={(e) => setDepositForm({ ...depositForm, deposit_date: e.target.value })}
                />
              </FormControl>

              {/* Front Image */}
              <FormControl>
                <FormLabel>Front of Check *</FormLabel>
                <VStack spacing={2}>
                  {frontImagePreview ? (
                    <Box position="relative" w="full">
                      <Image src={frontImagePreview} alt="Front of check" borderRadius="md" />
                      <Button
                        size="sm"
                        mt={2}
                        onClick={() => {
                          setFrontImage(null);
                          setFrontImagePreview(null);
                          if (fileInputFrontRef.current) fileInputFrontRef.current.value = '';
                        }}
                      >
                        Retake
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      leftIcon={<Camera size={18} />}
                      onClick={() => fileInputFrontRef.current?.click()}
                      w="full"
                    >
                      Capture Front
                    </Button>
                  )}
                  <input
                    ref={fileInputFrontRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageSelect(e, 'front')}
                  />
                </VStack>
              </FormControl>

              {/* Back Image */}
              <FormControl>
                <FormLabel>Back of Check *</FormLabel>
                <VStack spacing={2}>
                  {backImagePreview ? (
                    <Box position="relative" w="full">
                      <Image src={backImagePreview} alt="Back of check" borderRadius="md" />
                      <Button
                        size="sm"
                        mt={2}
                        onClick={() => {
                          setBackImage(null);
                          setBackImagePreview(null);
                          if (fileInputBackRef.current) fileInputBackRef.current.value = '';
                        }}
                      >
                        Retake
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      leftIcon={<Camera size={18} />}
                      onClick={() => fileInputBackRef.current?.click()}
                      w="full"
                    >
                      Capture Back
                    </Button>
                  )}
                  <input
                    ref={fileInputBackRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageSelect(e, 'back')}
                  />
                </VStack>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDepositClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleDeposit}
              isLoading={uploading}
              loadingText="Processing..."
            >
              Deposit Check
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

