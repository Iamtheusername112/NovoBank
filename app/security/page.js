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
  Badge,
  IconButton,
  useBreakpointValue,
  Heading,
  Divider,
  Switch,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Shield,
  LogIn,
  Smartphone,
  Trash2,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function SecurityPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { isOpen: isPasswordOpen, onOpen: onPasswordOpen, onClose: onPasswordClose } = useDisclosure();
  const { isOpen: isPINOpen, onOpen: onPINOpen, onClose: onPINClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [pinForm, setPinForm] = useState({
    current_pin: '',
    new_pin: '',
    confirm_pin: '',
  });

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

      // Load active sessions
      const { data: sessionsData } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', authUser.id)
        .order('last_activity', { ascending: false });

      if (sessionsData) {
        // Mark current session
        const updatedSessions = sessionsData.map(session => ({
          ...session,
          is_current_session: session.id === sessionsData[0]?.id,
        }));
        setActiveSessions(updatedSessions);
      }

      // Load login history
      const { data: historyData } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (historyData) setLoginHistory(historyData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security data',
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

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        status: 'error',
      });
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        status: 'error',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password updated successfully',
        status: 'success',
      });

      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });

      onPasswordClose();
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'Failed to update password',
        status: 'error',
      });
    }
  };

  const handleChangePIN = async () => {
    if (!pinForm.current_pin || !pinForm.new_pin || !pinForm.confirm_pin) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
      });
      return;
    }

    if (pinForm.new_pin !== pinForm.confirm_pin) {
      toast({
        title: 'Error',
        description: 'PINs do not match',
        status: 'error',
      });
      return;
    }

    if (pinForm.new_pin.length !== 4 || !/^\d+$/.test(pinForm.new_pin)) {
      toast({
        title: 'Error',
        description: 'PIN must be 4 digits',
        status: 'error',
      });
      return;
    }

    try {
      // Update PIN in user settings or profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Store PIN hash (in production, this should be hashed)
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: authUser.id,
          pin: pinForm.new_pin, // In production, hash this
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'PIN updated successfully',
        status: 'success',
      });

      setPinForm({
        current_pin: '',
        new_pin: '',
        confirm_pin: '',
      });

      onPINClose();
    } catch (error) {
      console.error('Error changing PIN:', error);
      toast({
        title: 'Error',
        description: 'Failed to update PIN',
        status: 'error',
      });
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!confirm('Are you sure you want to terminate this session?')) return;

    try {
      const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Session terminated',
        status: 'success',
      });

      loadUserData();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to terminate session',
        status: 'error',
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Smartphone;
      case 'desktop':
        return LogIn;
      default:
        return LogIn;
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
          <Heading size="md">Security Center</Heading>
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
        {/* Security Settings */}
        <Card mb={6}>
          <CardBody>
            <Heading size="sm" mb={4}>Security Settings</Heading>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">Password</Text>
                  <Text fontSize="sm" color="gray.600">
                    Last changed: Recently
                  </Text>
                </VStack>
                <Button size="sm" colorScheme="purple" onClick={onPasswordOpen}>
                  Change Password
                </Button>
              </Flex>
              <Divider />
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">PIN</Text>
                  <Text fontSize="sm" color="gray.600">
                    Used for quick login
                  </Text>
                </VStack>
                <Button size="sm" colorScheme="purple" onClick={onPINOpen}>
                  Change PIN
                </Button>
              </Flex>
              <Divider />
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">Two-Factor Authentication</Text>
                  <Text fontSize="sm" color="gray.600">
                    Add an extra layer of security
                  </Text>
                </VStack>
                <Switch colorScheme="purple" />
              </Flex>
            </VStack>
          </CardBody>
        </Card>

        {/* Active Sessions */}
        <Card mb={6}>
          <CardBody>
            <Heading size="sm" mb={4}>Active Sessions</Heading>
            {activeSessions.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No active sessions</Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {activeSessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.device_type);
                  
                  return (
                    <Flex
                      key={session.id}
                      justify="space-between"
                      align="center"
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <HStack spacing={3}>
                        <DeviceIcon size={20} />
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontWeight="semibold" fontSize="sm">
                              {session.device_name || session.device_type || 'Unknown Device'}
                            </Text>
                            {session.is_current_session && (
                              <Badge colorScheme="green" fontSize="xs">Current</Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            {session.location || 'Unknown Location'} • {session.ip_address || 'Unknown IP'}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            Last activity: {formatDate(session.last_activity)}
                          </Text>
                        </VStack>
                      </HStack>
                      {!session.is_current_session && (
                        <IconButton
                          icon={<Trash2 size={16} />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleTerminateSession(session.id)}
                          aria-label="Terminate session"
                        />
                      )}
                    </Flex>
                  );
                })}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Login History */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Recent Login History</Heading>
            {loginHistory.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No login history</Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {loginHistory.slice(0, 10).map((login) => {
                  const SuccessIcon = login.success ? CheckCircle : XCircle;
                  
                  return (
                    <Flex
                      key={login.id}
                      justify="space-between"
                      align="center"
                      p={2}
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <HStack spacing={2}>
                        <SuccessIcon size={16} color={login.success ? 'green' : 'red'} />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="semibold">
                            {login.login_method || 'Unknown'} • {login.device_type || 'Unknown'}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {login.location || 'Unknown'} • {formatDate(login.created_at)}
                          </Text>
                          {!login.success && login.failure_reason && (
                            <Text fontSize="xs" color="red.500">
                              {login.failure_reason}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                      <Badge colorScheme={login.success ? 'green' : 'red'} fontSize="xs">
                        {login.success ? 'Success' : 'Failed'}
                      </Badge>
                    </Flex>
                  );
                })}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordOpen} onClose={onPasswordClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Change Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Current Password</FormLabel>
                <HStack>
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  />
                  <IconButton
                    icon={showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    variant="ghost"
                    aria-label="Toggle password visibility"
                  />
                </HStack>
              </FormControl>
              <FormControl>
                <FormLabel>New Password</FormLabel>
                <HStack>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                  <IconButton
                    icon={showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    variant="ghost"
                    aria-label="Toggle password visibility"
                  />
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Must be at least 8 characters
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel>Confirm New Password</FormLabel>
                <HStack>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                  <IconButton
                    icon={showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    variant="ghost"
                    aria-label="Toggle password visibility"
                  />
                </HStack>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPasswordClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleChangePassword}>
              Update Password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Change PIN Modal */}
      <Modal isOpen={isPINOpen} onClose={onPINClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Change PIN</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Current PIN</FormLabel>
                <Input
                  type="password"
                  value={pinForm.current_pin}
                  onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value })}
                  maxLength={4}
                  inputMode="numeric"
                />
              </FormControl>
              <FormControl>
                <FormLabel>New PIN</FormLabel>
                <Input
                  type="password"
                  value={pinForm.new_pin}
                  onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })}
                  maxLength={4}
                  inputMode="numeric"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Must be 4 digits
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel>Confirm New PIN</FormLabel>
                <Input
                  type="password"
                  value={pinForm.confirm_pin}
                  onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })}
                  maxLength={4}
                  inputMode="numeric"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPINClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleChangePIN}>
              Update PIN
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

