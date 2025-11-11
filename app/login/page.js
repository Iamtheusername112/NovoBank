'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Link,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { ArrowLeft, Eye, EyeOff, Lock, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'pin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
    
    // Check if coming from PIN login with verified PIN
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const pinVerified = urlParams.get('pin_verified');
    
    if (emailParam && pinVerified === 'true') {
      // Pre-fill email and show message
      setEmail(emailParam);
      toast({
        title: 'PIN Verified',
        description: 'Please enter your password to complete login',
        status: 'info',
        duration: 4000,
        isClosable: true,
      });
    }
  }, [toast]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    if (loginMethod === 'password') {
      if (!password) {
        newErrors.password = 'Password is required';
      }
    } else {
      if (!pin || pin.length !== 4) {
        newErrors.pin = 'PIN must be 4 digits';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      if (loginMethod === 'pin') {
        // PIN login flow
        await handlePinLogin();
        return;
      }

      // Password login flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Handle specific error cases
        let errorMessage = 'Invalid email or password';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        } else {
          errorMessage = error.message || 'Login failed. Please try again.';
        }
        
        toast({
          title: 'Login Failed',
          description: errorMessage,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          toast({
            title: 'Email Confirmation Required',
            description: 'Please check your email and confirm your account before signing in.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          setLoading(false);
          return;
        }

        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
          status: 'success',
          duration: 2000,
        });
        
        setTimeout(() => {
          router.push('/wallet');
        }, 500);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    try {
      // First, verify the email exists and get the user
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (profileError || !profileData) {
        toast({
          title: 'Login Failed',
          description: 'No account found with this email address',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      // Get user settings to verify PIN
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('pin_hash')
        .eq('user_id', profileData.id)
        .single();

      if (settingsError || !settings || !settings.pin_hash) {
        toast({
          title: 'PIN Not Set',
          description: 'Please use password login or set up your PIN first',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      // Verify PIN using database function (same as /auth page)
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('verify_pin_for_login', {
          email_input: email.trim().toLowerCase(),
          pin_input: pin
        });

      if (verifyError) {
        console.error('PIN verification error:', verifyError);
        toast({
          title: 'Error',
          description: 'Failed to verify PIN. Please try again.',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      if (!verifyData || verifyData.length === 0 || !verifyData[0]) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this email',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      const verificationResult = verifyData[0];

      // Check if PIN is set and correct
      if (!verificationResult.pin_set) {
        toast({
          title: 'Invalid PIN',
          description: 'The PIN you entered is incorrect',
          status: 'error',
          duration: 3000,
        });
        setPin('');
        setLoading(false);
        return;
      }

      // PIN is correct! Now authenticate with Supabase via API route
      toast({
        title: 'PIN Verified',
        description: 'Authenticating...',
        status: 'info',
        duration: 2000,
      });

      // Call API route to create session token using Admin API
      try {
        const response = await fetch('/api/auth/pin-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            pin: pin,
          }),
        });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate');
          }

          // If API route returns a session, set it directly
          if (data.session && data.session.access_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });

            if (sessionError) {
              throw sessionError;
            }

            toast({
              title: 'Login Successful',
              description: 'Welcome back!',
              status: 'success',
              duration: 2000,
            });

            router.push('/wallet');
          } else if (data.action_link) {
            // Fallback: if we get action_link, verify token client-side
            const url = new URL(data.action_link);
            const token = url.searchParams.get('token') || url.searchParams.get('token_hash');
            
            if (token) {
              const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'magiclink',
              });

              if (!verifyError && verifyData.session) {
                toast({
                  title: 'Login Successful',
                  description: 'Welcome back!',
                  status: 'success',
                  duration: 2000,
                });
                router.push('/wallet');
              } else {
                throw new Error('Failed to verify token');
              }
            } else {
              throw new Error('No token found in action link');
            }
          } else {
            throw new Error(data.error || 'No session returned');
          }
      } catch (apiError) {
        console.error('API authentication error:', apiError);
        toast({
          title: 'Login Failed',
          description: apiError.message || 'Failed to authenticate. Please try again.',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('PIN login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'An error occurred during PIN verification',
        status: 'error',
        duration: 3000,
      });
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <StatusBar />
      <Flex
        direction="column"
        align="center"
        justify="center"
        minH="calc(100vh - 60px)"
        px={6}
        py={8}
      >
        <VStack spacing={8} w="full" maxW="400px">
          <VStack spacing={2}>
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft size={20} />}
              onClick={() => router.push('/')}
              alignSelf="flex-start"
            >
              Back
            </Button>
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              Sign In
            </Text>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Choose your login method
            </Text>
          </VStack>

          <Tabs 
            index={loginMethod === 'password' ? 0 : 1} 
            onChange={(index) => setLoginMethod(index === 0 ? 'password' : 'pin')}
            colorScheme="purple"
            w="full"
          >
            <TabList w="full">
              <Tab flex={1}>Password</Tab>
              <Tab flex={1}>PIN</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <Box as="form" w="full" onSubmit={handleSubmit}>
                  <VStack spacing={4}>
                    <FormControl isInvalid={errors.email}>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: '' });
                        }}
                        placeholder="your.email@example.com"
                        size="lg"
                        borderRadius="lg"
                      />
                      <FormErrorMessage>{errors.email}</FormErrorMessage>
                    </FormControl>

                    <FormControl isInvalid={errors.password}>
                      <FormLabel>Password</FormLabel>
                      <HStack spacing={2}>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors({ ...errors, password: '' });
                          }}
                          placeholder="Enter your password"
                          size="lg"
                          borderRadius="lg"
                          flex={1}
                        />
                        <Button
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </Button>
                      </HStack>
                      <FormErrorMessage>{errors.password}</FormErrorMessage>
                    </FormControl>

                    <Button
                      type="submit"
                      w="full"
                      bg="purple.600"
                      color="white"
                      _hover={{ bg: 'purple.700' }}
                      size="lg"
                      isLoading={loading && loginMethod === 'password'}
                      loadingText="Signing in..."
                    >
                      Sign In
                    </Button>
                  </VStack>
                </Box>
              </TabPanel>
              
              <TabPanel px={0}>
                <Box as="form" w="full" onSubmit={handleSubmit}>
                  <VStack spacing={4}>
                    <FormControl isInvalid={errors.email}>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: '' });
                        }}
                        placeholder="your.email@example.com"
                        size="lg"
                        borderRadius="lg"
                      />
                      <FormErrorMessage>{errors.email}</FormErrorMessage>
                    </FormControl>

                    <FormControl isInvalid={errors.pin}>
                      <FormLabel>PIN</FormLabel>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPin(value);
                          if (errors.pin) setErrors({ ...errors, pin: '' });
                        }}
                        placeholder="Enter 4-digit PIN"
                        size="lg"
                        borderRadius="lg"
                        textAlign="center"
                        letterSpacing="4px"
                        fontSize="xl"
                        fontWeight="bold"
                      />
                      <FormErrorMessage>{errors.pin}</FormErrorMessage>
                    </FormControl>

                    <Button
                      type="submit"
                      w="full"
                      bg="purple.600"
                      color="white"
                      _hover={{ bg: 'purple.700' }}
                      size="lg"
                      isLoading={loading && loginMethod === 'pin'}
                      loadingText="Signing in..."
                    >
                      Sign In with PIN
                    </Button>
                  </VStack>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <VStack spacing={2} mt={4}>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Don't have an account?{' '}
              <Link
                color="purple.600"
                fontWeight="semibold"
                onClick={() => router.push('/signup')}
                cursor="pointer"
              >
                Sign up
              </Link>
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center" maxW="300px">
              Forgot your password? Contact support for assistance.
            </Text>
          </VStack>
        </VStack>
      </Flex>
    </Box>
  );
}

