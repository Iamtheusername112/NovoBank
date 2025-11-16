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
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  IconButton,
  useBreakpointValue,
  Heading,
  Alert,
  AlertIcon,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function AccountLockPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');

  const { isOpen: isUnlockOpen, onOpen: onUnlockOpen, onClose: onUnlockClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

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

      // Load profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setIsLocked(profileData.account_status === 'locked' || profileData.account_status === 'blocked');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load account data',
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

  const handleLockAccount = async () => {
    if (!confirm('Are you sure you want to lock your account? This will prevent all transactions and access.')) {
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_status: 'locked',
          account_status_reason: 'User requested account lock',
        })
        .eq('id', authUser.id);

      if (error) throw error;

      setIsLocked(true);
      toast({
        title: 'Account Locked',
        description: 'Your account has been locked. Contact support to unlock.',
        status: 'warning',
        duration: 5000,
      });

      loadUserData();
    } catch (error) {
      console.error('Error locking account:', error);
      toast({
        title: 'Error',
        description: 'Failed to lock account',
        status: 'error',
      });
    }
  };

  const handleUnlockAccount = async () => {
    if (!unlockCode) {
      toast({
        title: 'Error',
        description: 'Please enter unlock code',
        status: 'error',
      });
      return;
    }

    // In production, verify unlock code
    // For now, accept any 6-digit code
    if (unlockCode.length !== 6 || !/^\d+$/.test(unlockCode)) {
      toast({
        title: 'Error',
        description: 'Unlock code must be 6 digits',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_status: 'active',
          account_status_reason: null,
        })
        .eq('id', authUser.id);

      if (error) throw error;

      setIsLocked(false);
      setUnlockCode('');
      onUnlockClose();

      toast({
        title: 'Account Unlocked',
        description: 'Your account has been unlocked successfully',
        status: 'success',
      });

      loadUserData();
    } catch (error) {
      console.error('Error unlocking account:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlock account',
        status: 'error',
      });
    }
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
          <Heading size="md">Account Lock</Heading>
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
        {/* Account Status */}
        <Card mb={6}>
          <CardBody>
            <VStack spacing={4}>
              {isLocked ? (
                <>
                  <Lock size={48} color="var(--chakra-colors-red-500)" />
                  <VStack spacing={2}>
                    <Heading size="md" color="red.500">Account Locked</Heading>
                    <Text color="gray.600" textAlign="center">
                      Your account is currently locked. All transactions and access are disabled.
                    </Text>
                    {profile?.account_status_reason && (
                      <Text fontSize="sm" color="gray.500" textAlign="center">
                        Reason: {profile.account_status_reason}
                      </Text>
                    )}
                  </VStack>
                  <Button
                    leftIcon={<Unlock size={18} />}
                    colorScheme="green"
                    size="lg"
                    onClick={onUnlockOpen}
                  >
                    Unlock Account
                  </Button>
                </>
              ) : (
                <>
                  <Shield size={48} color="var(--chakra-colors-green-500)" />
                  <VStack spacing={2}>
                    <Heading size="md" color="green.500">Account Active</Heading>
                    <Text color="gray.600" textAlign="center">
                      Your account is currently active and all features are available.
                    </Text>
                  </VStack>
                  <Button
                    leftIcon={<Lock size={18} />}
                    colorScheme="red"
                    size="lg"
                    onClick={handleLockAccount}
                  >
                    Lock Account
                  </Button>
                </>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Information */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="semibold" fontSize="sm">
              About Account Lock
            </Text>
            <Text fontSize="xs">
              Locking your account will immediately prevent all transactions, card usage, and account access. 
              You can unlock it using your unlock code or by contacting support.
            </Text>
          </VStack>
        </Alert>
      </Box>

      {/* Unlock Modal */}
      <Modal isOpen={isUnlockOpen} onClose={onUnlockClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Unlock Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Enter your 6-digit unlock code to unlock your account.
                </Text>
              </Alert>
              <FormControl>
                <FormLabel>Unlock Code</FormLabel>
                <Input
                  type="text"
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  fontSize="2xl"
                  textAlign="center"
                  letterSpacing="widest"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onUnlockClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleUnlockAccount}>
              Unlock Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

