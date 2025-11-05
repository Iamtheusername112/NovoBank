'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Card,
  CardBody,
  Select,
  Checkbox,
  IconButton,
  useToast,
  Progress,
  Heading,
  Badge,
  Circle,
  useColorModeValue,
} from '@chakra-ui/react';
import { ArrowLeft, ArrowRight, Check, Upload, Eye, EyeOff, Sparkles, Shield, Lock, X, File, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

const steps = [
  { title: 'Personal Info', description: 'Basic information' },
  { title: 'Address', description: 'Location details' },
  { title: 'Identity', description: 'Verification' },
  { title: 'Security', description: 'PIN & Password' },
  { title: 'Review', description: 'Confirm details' },
];

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionCard = motion(Card);
const MotionCircle = motion(Circle);

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const bgGradient = useColorModeValue(
    'linear(to-br, purple.50, pink.50, blue.50)',
    'linear(to-br, gray.900, purple.900)'
  );
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    // Step 2: Address
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    // Step 3: Identity
    idType: '',
    idNumber: '',
    idFile: null,
    // Step 4: Security
    pin: '',
    confirmPin: '',
    password: '',
    confirmPassword: '',
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
    // Step 5: Terms
    acceptTerms: false,
    acceptPrivacy: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);

  const securityQuestions = [
    'What was the name of your first pet?',
    'What city were you born in?',
    'What was your mother\'s maiden name?',
    'What was the name of your elementary school?',
    'What was your childhood nickname?',
  ];

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0:
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
          newErrors.phone = 'Invalid phone format';
        }
        if (!formData.dateOfBirth) {
          newErrors.dateOfBirth = 'Date of birth is required';
        } else {
          const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
          if (age < 18) {
            newErrors.dateOfBirth = 'You must be at least 18 years old';
          }
        }
        break;

      case 1:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.zipCode.trim()) {
          newErrors.zipCode = 'ZIP code is required';
        } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
          newErrors.zipCode = 'Invalid ZIP code format';
        }
        break;

      case 2:
        if (!formData.idType) newErrors.idType = 'ID type is required';
        if (!formData.idNumber.trim()) newErrors.idNumber = 'ID number is required';
        break;

      case 3:
        if (!formData.pin) {
          newErrors.pin = 'PIN is required';
        } else if (!/^\d{4}$/.test(formData.pin)) {
          newErrors.pin = 'PIN must be 4 digits';
        }
        if (formData.pin !== formData.confirmPin) {
          newErrors.confirmPin = 'PINs do not match';
        }
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          newErrors.password = 'Password must contain uppercase, lowercase, and number';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!formData.securityQuestion1) newErrors.securityQuestion1 = 'Security question is required';
        if (!formData.securityAnswer1.trim()) newErrors.securityAnswer1 = 'Answer is required';
        if (!formData.securityQuestion2) newErrors.securityQuestion2 = 'Security question is required';
        if (!formData.securityAnswer2.trim()) newErrors.securityAnswer2 = 'Answer is required';
        break;

      case 4:
        if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms and conditions';
        if (!formData.acceptPrivacy) newErrors.acceptPrivacy = 'You must accept the privacy policy';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setIsAnimating(true);
      setTimeout(() => {
        if (activeStep < steps.length - 1) {
          setActiveStep(activeStep + 1);
        } else {
          handleSubmit();
        }
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleBack = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (activeStep > 0) {
        setActiveStep(activeStep - 1);
      } else {
        router.back();
      }
      setIsAnimating(false);
    }, 300);
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);

      // Step 1: Create user account in Supabase Auth with all metadata
      // This way the trigger can save all data even if email confirmation is required
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            date_of_birth: formData.dateOfBirth,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zipCode,
            country: formData.country,
            id_type: formData.idType,
            id_number: formData.idNumber,
            id_file_url: formData.idFile,
            security_question_1: formData.securityQuestion1,
            security_answer_1: formData.securityAnswer1,
            security_question_2: formData.securityQuestion2,
            security_answer_2: formData.securityAnswer2,
            pin: formData.pin, // Store PIN in metadata temporarily for later retrieval
          },
        },
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw authError;
      }

      if (!authData.user) {
        console.error('No user returned from signup');
        throw new Error('Failed to create user account');
      }

      console.log('User created in auth:', authData.user.id, authData.user.email);
      console.log('Email confirmed?', authData.user.email_confirmed_at ? 'Yes' : 'No');

      // Step 2: Wait for the trigger to create the profile with all data from metadata
      // The trigger function runs as SECURITY DEFINER, so it can insert all data even if user isn't authenticated yet
      // Wait a bit longer to ensure trigger completes
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('Waiting for profile creation...');

      // Step 3: Check if email confirmation is required
      // If user.email_confirmed_at is null, email confirmation is required
      const requiresEmailConfirmation = !authData.user.email_confirmed_at;

      if (requiresEmailConfirmation) {
        // Email confirmation is required - save PIN using a database function that bypasses RLS
        // We'll create a function to save PIN without authentication
        if (formData.pin && formData.pin.length === 4) {
          try {
            // Use a database function to save PIN (bypasses RLS)
            const { error: pinError } = await supabase.rpc('save_pin_for_new_user', {
              p_user_id: authData.user.id,
              p_pin: formData.pin
            });

            if (pinError) {
              console.warn('Failed to save PIN via function:', pinError);
              // PIN is stored in metadata, so we can retrieve it later
            } else {
              console.log('PIN saved successfully via function');
            }
          } catch (pinErr) {
            console.warn('PIN save function error:', pinErr);
            // Continue anyway - PIN is in metadata
          }
        }

        toast({
          title: 'Account Created Successfully!',
          description: 'Please check your email to confirm your account, then sign in to continue.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        setTimeout(() => {
          router.push('/');
        }, 2000);
        return;
      }

      // Step 4: Email is already confirmed (or confirmation disabled), try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.warn('Auto-login error:', signInError);
        
        // Even if login fails, try to save PIN using function
        if (formData.pin && formData.pin.length === 4) {
          try {
            const { error: pinError } = await supabase.rpc('save_pin_for_new_user', {
              p_user_id: authData.user.id,
              p_pin: formData.pin
            });
            if (pinError) console.warn('Failed to save PIN:', pinError);
          } catch (pinErr) {
            console.warn('PIN save error:', pinErr);
          }
        }
        
        toast({
          title: 'Account Created!',
          description: 'Please sign in to continue.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setTimeout(() => {
          router.push('/');
        }, 2000);
        return;
      }

      // Step 5: Successfully signed in - save PIN and redirect
      if (formData.pin && formData.pin.length === 4 && signInData?.user) {
        const { error: pinError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: signInData.user.id,
            pin_hash: formData.pin, // In production, use proper hashing!
          }, {
            onConflict: 'user_id'
          });

        if (pinError) {
          console.error('Failed to save PIN:', pinError);
          toast({
            title: 'PIN Not Saved',
            description: 'Your account was created but PIN could not be saved. Please set it up after logging in.',
            status: 'warning',
            duration: 3000,
          });
        } else {
          console.log('PIN saved successfully');
        }
      }

      // Step 6: User is now authenticated and PIN is saved, redirect to wallet
      toast({
        title: 'Account Created Successfully!',
        description: 'Welcome to NovaBank! Redirecting to your dashboard...',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setTimeout(() => {
        router.push('/wallet');
      }, 2000);
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to create account. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or PDF file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'File must be less than 10MB',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `id-documents/${fileName}`;

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        clearInterval(progressInterval);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('id-documents')
        .getPublicUrl(filePath);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadedFile({
        name: file.name,
        url: urlData.publicUrl,
        path: filePath,
      });

      handleChange('idFile', urlData.publicUrl);

      toast({
        title: 'File uploaded successfully',
        description: 'Your ID document has been uploaded',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file. Please try again.',
        status: 'error',
        duration: 3000,
      });
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setTimeout(() => {
        if (uploadProgress === 100) {
          setUploadProgress(0);
        }
      }, 2000);
    }
  };

  const handleRemoveFile = async () => {
    if (uploadedFile?.path) {
      try {
        // Delete from Supabase Storage
        await supabase.storage
          .from('id-documents')
          .remove([uploadedFile.path]);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }

    setUploadedFile(null);
    handleChange('idFile', null);
    toast({
      title: 'File removed',
      status: 'info',
      duration: 2000,
    });
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/jpg,image/png,application/pdf';
      input.files = event.dataTransfer.files;
      handleFileUpload({ target: input });
    }
  };

  const handleFileClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,application/pdf';
    input.onchange = handleFileUpload;
    input.click();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <MotionVStack spacing={6} align="stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FormControl isInvalid={errors.firstName}>
              <FormLabel fontWeight="semibold" color="gray.700">First Name</FormLabel>
              <Input
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.firstName ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.firstName}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.lastName}>
              <FormLabel fontWeight="semibold" color="gray.700">Last Name</FormLabel>
              <Input
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.lastName ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.lastName}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.email}>
              <FormLabel fontWeight="semibold" color="gray.700">Email Address</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john.doe@example.com"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.email ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.phone}>
              <FormLabel fontWeight="semibold" color="gray.700">Phone Number</FormLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.phone ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.phone}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.dateOfBirth}>
              <FormLabel fontWeight="semibold" color="gray.700">Date of Birth</FormLabel>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.dateOfBirth ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.dateOfBirth}</FormErrorMessage>
            </FormControl>
          </MotionVStack>
        );

      case 1:
        return (
          <MotionVStack spacing={6} align="stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FormControl isInvalid={errors.address}>
              <FormLabel fontWeight="semibold" color="gray.700">Street Address</FormLabel>
              <Input
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main Street"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.address ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.address}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.city}>
              <FormLabel fontWeight="semibold" color="gray.700">City</FormLabel>
              <Input
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="New York"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.city ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.city}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.state}>
              <FormLabel fontWeight="semibold" color="gray.700">State/Province</FormLabel>
              <Input
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="NY"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.state ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.state}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.zipCode}>
              <FormLabel fontWeight="semibold" color="gray.700">ZIP/Postal Code</FormLabel>
              <Input
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="10001"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.zipCode ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.zipCode}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="semibold" color="gray.700">Country</FormLabel>
              <Select
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              >
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
                <option>Australia</option>
                <option>Other</option>
              </Select>
            </FormControl>
          </MotionVStack>
        );

      case 2:
        return (
          <MotionVStack spacing={6} align="stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MotionBox
              bgGradient="linear(to-r, purple.50, pink.50)"
              p={4}
              borderRadius="lg"
              borderLeft="4px solid"
              borderColor="purple.500"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <HStack spacing={2}>
                <Shield size={20} color="#9c27b0" />
                <Text fontSize="sm" color="purple.700" fontWeight="medium">
                  For security and regulatory compliance, we need to verify your identity.
                </Text>
              </HStack>
            </MotionBox>

            <FormControl isInvalid={errors.idType}>
              <FormLabel fontWeight="semibold" color="gray.700">ID Type</FormLabel>
              <Select
                value={formData.idType}
                onChange={(e) => handleChange('idType', e.target.value)}
                placeholder="Select ID type"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.idType ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              >
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="state_id">State ID</option>
              </Select>
              <FormErrorMessage>{errors.idType}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.idNumber}>
              <FormLabel fontWeight="semibold" color="gray.700">ID Number</FormLabel>
              <Input
                value={formData.idNumber}
                onChange={(e) => handleChange('idNumber', e.target.value)}
                placeholder="Enter ID number"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.idNumber ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.idNumber}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="semibold" color="gray.700">Upload ID Document (Optional)</FormLabel>
              {uploadedFile ? (
                <MotionBox
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  border="2px solid"
                  borderColor="green.300"
                  borderRadius="lg"
                  p={4}
                  bg="green.50"
                >
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box
                        bg="green.100"
                        p={2}
                        borderRadius="md"
                      >
                        <File size={24} color="#10b981" />
                      </Box>
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                          {uploadedFile.name}
                        </Text>
                        <Text fontSize="xs" color="green.600">
                          Uploaded successfully
                        </Text>
                      </VStack>
                    </HStack>
                    <IconButton
                      icon={<X size={18} />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={handleRemoveFile}
                      aria-label="Remove file"
                    />
                  </HStack>
                </MotionBox>
              ) : (
                <MotionBox
                  border="2px dashed"
                  borderColor={uploading ? 'purple.500' : 'gray.300'}
                  borderRadius="lg"
                  p={8}
                  textAlign="center"
                  cursor={uploading ? 'wait' : 'pointer'}
                  onClick={!uploading ? handleFileClick : undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={!uploading ? handleFileDrop : undefined}
                  whileHover={!uploading ? { scale: 1.02 } : {}}
                  whileTap={!uploading ? { scale: 0.98 } : {}}
                  bg={uploading ? 'purple.50' : 'transparent'}
                  _hover={!uploading ? { borderColor: 'purple.500', bg: 'purple.50' } : {}}
                  transition="all 0.3s"
                  position="relative"
                  overflow="hidden"
                >
                  {uploading && (
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      h="4px"
                      bg="purple.200"
                      borderRadius="lg"
                    >
                      <MotionBox
                        h="100%"
                        bg="purple.600"
                        borderRadius="lg"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </Box>
                  )}
                  <VStack spacing={3}>
                    {uploading ? (
                      <Box display="flex" justifyContent="center">
                        <Loader2 size={40} color="#9c27b0" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                      </Box>
                    ) : (
                      <MotionBox
                        animate={{
                          y: [0, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Upload size={40} color="#9c27b0" style={{ margin: '0 auto' }} />
                      </MotionBox>
                    )}
                    <VStack spacing={1}>
                      <Text fontSize="sm" color="gray.600" fontWeight="medium">
                        {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        PNG, JPG, PDF up to 10MB
                      </Text>
                    </VStack>
                  </VStack>
                </MotionBox>
              )}
            </FormControl>
          </MotionVStack>
        );

      case 3:
        return (
          <MotionVStack spacing={6} align="stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MotionBox
              bgGradient="linear(to-r, blue.50, purple.50)"
              p={4}
              borderRadius="lg"
              borderLeft="4px solid"
              borderColor="blue.500"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <HStack spacing={2}>
                <Lock size={20} color="#2196f3" />
                <Text fontSize="sm" color="blue.700" fontWeight="medium">
                  Create secure credentials for your account. Keep these safe and don't share them with anyone.
                </Text>
              </HStack>
            </MotionBox>

            <FormControl isInvalid={errors.pin}>
              <FormLabel fontWeight="semibold" color="gray.700">4-Digit PIN</FormLabel>
              <Input
                type={showPin ? 'text' : 'password'}
                value={formData.pin}
                onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                size="lg"
                maxLength={4}
                inputMode="numeric"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.pin ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.pin}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.confirmPin}>
              <FormLabel fontWeight="semibold" color="gray.700">Confirm PIN</FormLabel>
              <Input
                type={showPin ? 'text' : 'password'}
                value={formData.confirmPin}
                onChange={(e) => handleChange('confirmPin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                size="lg"
                maxLength={4}
                inputMode="numeric"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.confirmPin ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.confirmPin}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.password}>
              <FormLabel fontWeight="semibold" color="gray.700">Password</FormLabel>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Create a strong password"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.password ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Must be at least 8 characters with uppercase, lowercase, and number
              </Text>
            </FormControl>

            <FormControl isInvalid={errors.confirmPassword}>
              <FormLabel fontWeight="semibold" color="gray.700">Confirm Password</FormLabel>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.confirmPassword ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>

            <HStack spacing={2}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPin(!showPin)}
                leftIcon={showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              >
                {showPin ? 'Hide' : 'Show'} PIN
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                leftIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              >
                {showPassword ? 'Hide' : 'Show'} Password
              </Button>
            </HStack>

            <FormControl isInvalid={errors.securityQuestion1}>
              <FormLabel fontWeight="semibold" color="gray.700">Security Question 1</FormLabel>
              <Select
                value={formData.securityQuestion1}
                onChange={(e) => handleChange('securityQuestion1', e.target.value)}
                placeholder="Select a security question"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.securityQuestion1 ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              >
                {securityQuestions.map((q, idx) => (
                  <option key={idx} value={q}>
                    {q}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.securityQuestion1}</FormErrorMessage>
            </FormControl>

            {formData.securityQuestion1 && (
              <FormControl isInvalid={errors.securityAnswer1}>
                <FormLabel fontWeight="semibold" color="gray.700">Answer</FormLabel>
                <Input
                  value={formData.securityAnswer1}
                  onChange={(e) => handleChange('securityAnswer1', e.target.value)}
                  placeholder="Your answer"
                  size="lg"
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={errors.securityAnswer1 ? 'red.300' : 'gray.200'}
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                  _hover={{ borderColor: 'purple.300' }}
                  transition="all 0.2s"
                />
                <FormErrorMessage>{errors.securityAnswer1}</FormErrorMessage>
              </FormControl>
            )}

            <FormControl isInvalid={errors.securityQuestion2}>
              <FormLabel fontWeight="semibold" color="gray.700">Security Question 2</FormLabel>
              <Select
                value={formData.securityQuestion2}
                onChange={(e) => handleChange('securityQuestion2', e.target.value)}
                placeholder="Select a different security question"
                size="lg"
                borderRadius="lg"
                border="2px solid"
                borderColor={errors.securityQuestion2 ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                _hover={{ borderColor: 'purple.300' }}
                transition="all 0.2s"
              >
                {securityQuestions
                  .filter((q) => q !== formData.securityQuestion1)
                  .map((q, idx) => (
                    <option key={idx} value={q}>
                      {q}
                    </option>
                  ))}
              </Select>
              <FormErrorMessage>{errors.securityQuestion2}</FormErrorMessage>
            </FormControl>

            {formData.securityQuestion2 && (
              <FormControl isInvalid={errors.securityAnswer2}>
                <FormLabel fontWeight="semibold" color="gray.700">Answer</FormLabel>
                <Input
                  value={formData.securityAnswer2}
                  onChange={(e) => handleChange('securityAnswer2', e.target.value)}
                  placeholder="Your answer"
                  size="lg"
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={errors.securityAnswer2 ? 'red.300' : 'gray.200'}
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(156, 39, 176, 0.1)' }}
                  _hover={{ borderColor: 'purple.300' }}
                  transition="all 0.2s"
                />
                <FormErrorMessage>{errors.securityAnswer2}</FormErrorMessage>
              </FormControl>
            )}
          </MotionVStack>
        );

      case 4:
        return (
          <MotionVStack spacing={6} align="stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Heading size="md" color="gray.800">
              Review Your Information
            </Heading>

            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Personal Information
                    </Text>
                    <Text fontWeight="semibold">
                      {formData.firstName} {formData.lastName}
                    </Text>
                    <Text fontSize="sm">{formData.email}</Text>
                    <Text fontSize="sm">{formData.phone}</Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Address
                    </Text>
                    <Text>{formData.address}</Text>
                    <Text>
                      {formData.city}, {formData.state} {formData.zipCode}
                    </Text>
                    <Text>{formData.country}</Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Identity Verification
                    </Text>
                    <Text>{formData.idType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</Text>
                    <Text fontSize="sm">ID: {formData.idNumber}</Text>
                  </Box>
                </VStack>
              </CardBody>
            </Card>

            <FormControl isInvalid={errors.acceptTerms}>
              <Checkbox
                isChecked={formData.acceptTerms}
                onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                colorScheme="purple"
              >
                I accept the{' '}
                <Text as="span" color="purple.600" textDecoration="underline">
                  Terms and Conditions
                </Text>
              </Checkbox>
              <FormErrorMessage>{errors.acceptTerms}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.acceptPrivacy}>
              <Checkbox
                isChecked={formData.acceptPrivacy}
                onChange={(e) => handleChange('acceptPrivacy', e.target.checked)}
                colorScheme="purple"
              >
                I accept the{' '}
                <Text as="span" color="purple.600" textDecoration="underline">
                  Privacy Policy
                </Text>
              </Checkbox>
              <FormErrorMessage>{errors.acceptPrivacy}</FormErrorMessage>
            </FormControl>

            <MotionBox
              bgGradient="linear(to-r, green.50, emerald.50)"
              p={4}
              borderRadius="lg"
              borderLeft="4px solid"
              borderColor="green.500"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Text fontSize="sm" color="green.700" fontWeight="medium">
                Your account will be created once you submit this form. You'll receive a verification email to activate your account.
              </Text>
            </MotionBox>
          </MotionVStack>
        );

      default:
        return null;
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Box 
      minH="100vh" 
      bgGradient={bgGradient}
      position="relative"
      overflow="hidden"
    >
      {/* Animated Background Elements */}
      <MotionBox
        position="absolute"
        top="-50%"
        right="-10%"
        w="600px"
        h="600px"
        bgGradient="linear(to-br, purple.200, pink.200)"
        borderRadius="full"
        opacity={0.3}
        filter="blur(80px)"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <MotionBox
        position="absolute"
        bottom="-30%"
        left="-10%"
        w="500px"
        h="500px"
        bgGradient="linear(to-br, blue.200, purple.200)"
        borderRadius="full"
        opacity={0.3}
        filter="blur(80px)"
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <StatusBar />
      <Box maxW="container.md" mx="auto" px={4} py={8} position="relative" zIndex={1}>
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <HStack spacing={4} mb={6}>
            <IconButton
              icon={<ArrowLeft size={20} />}
              variant="ghost"
              onClick={handleBack}
              aria-label="Back"
              _hover={{ bg: 'whiteAlpha.200', transform: 'translateX(-4px)' }}
              transition="all 0.2s"
            />
            <VStack align="flex-start" spacing={0} flex={1}>
              <HStack spacing={2}>
                <Sparkles size={24} color="#9c27b0" />
                <Heading size="lg" bgGradient="linear(to-r, purple.600, pink.600)" bgClip="text">
                  Create Your Account
                </Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Step {activeStep + 1} of {steps.length}
              </Text>
            </VStack>
          </HStack>
        </MotionBox>

        <MotionBox
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          mb={8}
        >
          <Box position="relative">
            <Progress
              value={(activeStep + 1) * (100 / steps.length)}
              colorScheme="purple"
              borderRadius="full"
              h="12px"
              bg="whiteAlpha.300"
              sx={{
                '& > div': {
                  background: 'linear-gradient(90deg, #9c27b0, #e91e63, #2196f3)',
                  backgroundSize: '200% 100%',
                  animation: 'gradient 3s ease infinite',
                },
              }}
            />
            <Box
              position="absolute"
              top="0"
              left={`${(activeStep + 1) * (100 / steps.length)}%`}
              transform="translateX(-50%)"
              mt="-4px"
            >
              <MotionCircle
                size="20px"
                bg="purple.600"
                shadow="lg"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </Box>
          </Box>
        </MotionBox>

        <MotionCard
          bg={cardBg}
          borderRadius="2xl"
          boxShadow="2xl"
          mb={6}
          border="1px solid"
          borderColor="whiteAlpha.200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardBody p={8}>
            <MotionBox
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Flex justify="space-between" align="center" mb={8} wrap="wrap" gap={4}>
                {steps.map((step, index) => (
                  <Flex key={index} align="center" flex={1} minW="120px">
                    <VStack spacing={2} align="center" flex={1}>
                      <MotionCircle
                        size="50px"
                        bgGradient={
                          index < activeStep
                            ? 'linear(to-br, purple.500, pink.500)'
                            : index === activeStep
                            ? 'linear(to-br, purple.600, blue.600)'
                            : 'gray.200'
                        }
                        color={index <= activeStep ? 'white' : 'gray.500'}
                        fontWeight="bold"
                        fontSize="sm"
                        shadow={index <= activeStep ? 'lg' : 'none'}
                        animate={{
                          scale: index === activeStep ? [1, 1.1, 1] : 1,
                          boxShadow: index === activeStep 
                            ? ['0 0 0px rgba(156, 39, 176, 0)', '0 0 20px rgba(156, 39, 176, 0.5)', '0 0 0px rgba(156, 39, 176, 0)']
                            : 'none',
                        }}
                        transition={{
                          duration: 2,
                          repeat: index === activeStep ? Infinity : 0,
                          ease: "easeInOut",
                        }}
                      >
                        {index < activeStep ? (
                          <Check size={24} />
                        ) : (
                          index + 1
                        )}
                      </MotionCircle>
                      <VStack spacing={0} align="center">
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color={index <= activeStep ? 'purple.600' : 'gray.500'}
                          transition="color 0.3s"
                        >
                          {step.title}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {step.description}
                        </Text>
                      </VStack>
                    </VStack>
                    {index < steps.length - 1 && (
                      <MotionBox
                        flex={1}
                        h="3px"
                        bgGradient={
                          index < activeStep
                            ? 'linear(to-r, purple.500, pink.500)'
                            : 'gray.200'
                        }
                        mx={2}
                        minW="20px"
                        borderRadius="full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: index < activeStep ? 1 : 0.3 }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </Flex>
                ))}
              </Flex>
            </MotionBox>

            <AnimatePresence mode="wait">
              <MotionBox
                key={activeStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </MotionBox>
            </AnimatePresence>
          </CardBody>
        </MotionCard>

        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <HStack spacing={4} justify="flex-end">
            <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={handleBack}
                leftIcon={<ArrowLeft size={16} />}
                isDisabled={activeStep === 0}
                borderColor="purple.300"
                color="purple.600"
                _hover={{ bg: 'purple.50', borderColor: 'purple.400' }}
                size="lg"
                transition="all 0.2s"
              >
                Back
              </Button>
            </MotionBox>
            <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                bgGradient="linear(to-r, purple.600, pink.600)"
                _hover={{
                  bgGradient: 'linear(to-r, purple.700, pink.700)',
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                }}
                onClick={handleNext}
                rightIcon={
                  activeStep === steps.length - 1 ? (
                    <Check size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )
                }
                size="lg"
                color="white"
                shadow="lg"
                transition="all 0.3s"
              >
                {activeStep === steps.length - 1 ? 'Create Account' : 'Next'}
              </Button>
            </MotionBox>
          </HStack>
        </MotionBox>
      </Box>
    </Box>
  );
}

