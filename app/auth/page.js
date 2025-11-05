'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Input,
  Button,
  useToast,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { X, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

export default function AuthPage() {
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const method = urlParams.get('method');
    
    // If coming from "Sign in with PIN" button, show email input first
    if (method === 'pin') {
      setShowEmailInput(true);
      setCheckingAuth(false);
      return;
    }
    
    // Check if coming from PIN login with magic link
    if (urlParams.get('pin_verified') === 'true') {
      checkAuthStatus();
      return;
    }
    
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user is already authenticated
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user) {
        // User is authenticated, check if PIN is set
        const { data: settings } = await supabase
          .from('user_settings')
          .select('pin_hash')
          .eq('user_id', user.id)
          .single();
        
        if (!settings?.pin_hash) {
          // No PIN set yet, redirect to wallet (first time setup)
          router.push('/wallet');
          return;
        }
      } else {
        // User not authenticated, show email input for PIN login
        setShowEmailInput(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handlePinInput = (value) => {
    if (pin.length < 4 && value !== '.') {
      setPin(pin + value);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        status: 'error',
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      // Check if email exists (using lowercase for case-insensitive matching)
      const emailLower = email.trim().toLowerCase();
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .ilike('email', emailLower) // Use ilike for case-insensitive matching
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors if not found

      if (profileError) {
        console.error('Profile lookup error:', profileError);
        toast({
          title: 'Error',
          description: 'Failed to verify email. Please try again.',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      if (!profileData) {
        toast({
          title: 'Account Not Found',
          description: 'No account found with this email. Please sign up first.',
          status: 'error',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      // Email exists, proceed to PIN entry
      // We'll check if PIN is set during PIN verification
      setShowEmailInput(false);
      setLoading(false);
    } catch (error) {
      console.error('Email check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify email. Please try again.',
        status: 'error',
        duration: 3000,
      });
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      toast({
        title: 'Invalid PIN',
        description: 'Please enter a 4-digit PIN',
        status: 'error',
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      // Get user ID from email
      let userId = null;
      let userEmail = email;

      if (!userEmail) {
        // Check if user is already authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          // Not authenticated and no email, need email first
          setShowEmailInput(true);
          toast({
            title: 'Email Required',
            description: 'Please enter your email first',
            status: 'info',
            duration: 3000,
          });
          setLoading(false);
          return;
        }
        userId = user.id;
        userEmail = user.email;
      } else {
        // Verify email exists
        const emailLower = userEmail.trim().toLowerCase();
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, email')
          .ilike('email', emailLower) // Use ilike for case-insensitive matching
          .maybeSingle();

        if (profileError) {
          console.error('Profile lookup error:', profileError);
          toast({
            title: 'Error',
            description: 'Failed to verify email. Please try again.',
            status: 'error',
            duration: 3000,
          });
          setLoading(false);
          return;
        }

        if (!profileData) {
          toast({
            title: 'Account Not Found',
            description: 'No account found with this email',
            status: 'error',
            duration: 3000,
          });
          setLoading(false);
          return;
        }
        userId = profileData.id;
      }

      // Use database function to verify PIN (bypasses RLS, more secure)
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('verify_pin_for_login', {
          email_input: userEmail.trim().toLowerCase(),
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
      
      // Update userId from verification result
      userId = verificationResult.user_id;

      // Check if PIN is set and correct
      if (!verificationResult.pin_set) {
        // Check if pin_hash exists but doesn't match (wrong PIN) vs doesn't exist (PIN not set)
        // For now, treat both as invalid PIN
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

      // PIN is correct! Now authenticate with Supabase
      // Check if already authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser && currentUser.id === userId) {
        // Already authenticated, just proceed
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
          status: 'success',
          duration: 2000,
        });
        setTimeout(() => {
          router.push('/wallet');
        }, 500);
      } else {
        // Not authenticated - PIN is verified, create session via API route
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
              email: userEmail.trim().toLowerCase(),
              pin: pin,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate');
          }

          // If API route returns a session, set it
          if (data.session && data.session.access_token) {
            // Set the session in Supabase client
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

            setTimeout(() => {
              router.push('/wallet');
            }, 500);
          } else if (data.action_link) {
            // If we got an action link, redirect to it (will auto-complete auth)
            window.location.href = data.action_link;
          } else {
            throw new Error(data.error || 'No session returned');
          }
        } catch (apiError) {
          console.error('API authentication error:', apiError);
          // Fallback: redirect to password login
          toast({
            title: 'PIN Verified',
            description: 'Please enter your password to complete login',
            status: 'info',
            duration: 3000,
          });
          router.push(`/login?email=${encodeURIComponent(userEmail)}&pin_verified=true`);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('PIN validation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to validate PIN',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprint = () => {
    // TODO: Implement fingerprint authentication
    toast({
      title: 'Fingerprint authentication',
      description: 'Fingerprint authentication coming soon',
      status: 'info',
      duration: 2000,
    });
  };

  if (checkingAuth) {
    return (
      <Box minH="100vh" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.100">
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
          {showEmailInput ? (
            // Email input step
            <VStack spacing={6} w="full">
              <VStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  Sign in with PIN
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Enter your email to continue
                </Text>
              </VStack>
              
              <VStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    size="lg"
                    borderRadius="lg"
                    bg="white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleEmailSubmit();
                      }
                    }}
                  />
                </FormControl>
                <Button
                  w="full"
                  bg="purple.600"
                  color="white"
                  _hover={{ bg: 'purple.700' }}
                  size="lg"
                  onClick={handleEmailSubmit}
                  isLoading={loading}
                  loadingText="Verifying..."
                >
                  Continue
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  Use password login instead
                </Button>
              </VStack>
            </VStack>
          ) : (
            // PIN entry step - matches the screenshot design
            <>
              <VStack spacing={4}>
                <Box
                  bg="gray.200"
                  borderRadius="full"
                  p={6}
                  onClick={handleFingerprint}
                  cursor="pointer"
                  _hover={{ bg: 'gray.300' }}
                  transition="all 0.2s"
                >
                  <Fingerprint size={48} color="#666" />
                </Box>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  enter pin code or use fingerprint
                </Text>
              </VStack>

              <HStack spacing={2} w="full" justify="center">
                <Input
                  value={pin}
                  readOnly
                  maxLength={4}
                  w="200px"
                  h="50px"
                  bg="gray.200"
                  borderRadius="md"
                  textAlign="center"
                  letterSpacing="8px"
                  fontSize="xl"
                  fontWeight="bold"
                  border="none"
                  _focus={{ boxShadow: 'none' }}
                />
                {pin.length > 0 && (
                  <IconButton
                    icon={<X size={20} />}
                    onClick={handleClear}
                    borderRadius="full"
                    bg="gray.300"
                    aria-label="Clear PIN"
                  />
                )}
              </HStack>

              <VStack spacing={3} w="full">
                {[1, 2, 3].map((row) => (
                  <HStack key={row} spacing={3} justify="center" w="full">
                    {[1, 2, 3].map((num) => {
                      const value = (row - 1) * 3 + num;
                      return (
                        <Button
                          key={value}
                          onClick={() => handlePinInput(value.toString())}
                          w="60px"
                          h="60px"
                          borderRadius="full"
                          bg="gray.200"
                          color="gray.800"
                          fontSize="xl"
                          fontWeight="semibold"
                          _hover={{ bg: 'gray.300' }}
                        >
                          {value}
                        </Button>
                      );
                    })}
                  </HStack>
                ))}
                <HStack spacing={3} justify="center" w="full">
                  <Button
                    onClick={() => handlePinInput('.')}
                    w="60px"
                    h="60px"
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
                    onClick={() => handlePinInput('0')}
                    w="60px"
                    h="60px"
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
                    w="60px"
                    h="60px"
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

              {pin.length === 4 && (
                <Button
                  onClick={handleSubmit}
                  w="full"
                  bg="purple.600"
                  color="white"
                  _hover={{ bg: 'purple.700' }}
                  mt={4}
                  isLoading={loading}
                  loadingText="Verifying..."
                >
                  Submit
                </Button>
              )}

              {email && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEmailInput(true);
                    setPin('');
                  }}
                >
                  Change email
                </Button>
              )}
            </>
          )}
        </VStack>
      </Flex>
    </Box>
  );
}
