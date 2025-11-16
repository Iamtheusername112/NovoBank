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
  Badge,
  useToast,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
} from '@chakra-ui/react';
import {
  Bell,
  Check,
  X,
  Trash2,
  AlertCircle,
  Gift,
  CreditCard,
  Shield,
  TrendingDown,
  Info,
  Filter,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import ContactUsModal from '@/components/ContactUsModal';
import BottomNavigation from '@/components/BottomNavigation';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Divider,
} from '@chakra-ui/react';

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [contactResponses, setContactResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();
  const { isOpen: isResponseModalOpen, onOpen: onResponseModalOpen, onClose: onResponseModalClose } = useDisclosure();

  useEffect(() => {
    setMounted(true);
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load all notifications
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications(notificationsData || []);

      // Load all alerts
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setAlerts(alertsData || []);

      // Load promotions
      const { data: promotionsData } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setPromotions(promotionsData || []);

      // Load contact responses
      await loadContactResponses(user);

    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, type = 'notification') => {
    try {
      const table = type === 'alert' ? 'alerts' : 'notifications';
      const { error } = await supabase
        .from(table)
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      if (type === 'alert') {
        setAlerts(alerts.map(item => item.id === id ? { ...item, is_read: true } : item));
      } else {
        setNotifications(notifications.map(item => item.id === id ? { ...item, is_read: true } : item));
      }

      toast({
        title: 'Marked as read',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark as read',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const markAllAsRead = async (type = 'notification') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const table = type === 'alert' ? 'alerts' : 'notifications';
      const { error } = await supabase
        .from(table)
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      if (type === 'alert') {
        setAlerts(alerts.map(item => ({ ...item, is_read: true })));
      } else {
        setNotifications(notifications.map(item => ({ ...item, is_read: true })));
      }

      toast({
        title: 'All marked as read',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const deleteNotification = async (id, type = 'notification') => {
    try {
      const table = type === 'alert' ? 'alerts' : 'notifications';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      if (type === 'alert') {
        setAlerts(alerts.filter(item => item.id !== id));
      } else {
        setNotifications(notifications.filter(item => item.id !== id));
      }

      toast({
        title: 'Deleted',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'security':
        return <Shield size={20} color="#ef4444" />;
      case 'transaction':
        return <CreditCard size={20} color="#3b82f6" />;
      case 'promotion':
        return <Gift size={20} color="#10b981" />;
      case 'low_balance':
        return <TrendingDown size={20} color="#f97316" />;
      case 'alert':
        return <AlertCircle size={20} color="#ef4444" />;
      default:
        return <Bell size={20} color="#6b7280" />;
    }
  };

  const loadContactResponses = async (user) => {
    try {
      // Try API route first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found for loading contact responses');
        return;
      }

      const response = await fetch('/api/user/contact-responses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('Loaded contact responses from API:', result.data.length);
          setContactResponses(result.data || []);
          return;
        }
      }

      // Fallback: Query directly from Supabase
      // Try by user_id first
      let allResponses = [];
      
      if (user.id) {
        const { data: byUserId, error: error1 } = await supabase
          .from('contact_submissions')
          .select('id, name, email, message, admin_response, responded_at, created_at, status')
          .eq('user_id', user.id)
          .not('admin_response', 'is', null)
          .order('responded_at', { ascending: false });

        if (!error1 && byUserId) {
          allResponses = byUserId;
        }
      }

      // Also try by email
      if (user.email) {
        const { data: byEmail, error: error2 } = await supabase
          .from('contact_submissions')
          .select('id, name, email, message, admin_response, responded_at, created_at, status')
          .eq('email', user.email.toLowerCase())
          .not('admin_response', 'is', null)
          .order('responded_at', { ascending: false });

        if (!error2 && byEmail) {
          // Merge results, avoiding duplicates
          const existingIds = new Set(allResponses.map(c => c.id));
          const newSubmissions = byEmail.filter(c => !existingIds.has(c.id));
          allResponses = [...allResponses, ...newSubmissions];
        }
      }

      // Sort by responded_at descending
      allResponses.sort((a, b) => {
        const dateA = new Date(a.responded_at || a.created_at);
        const dateB = new Date(b.responded_at || b.created_at);
        return dateB - dateA;
      });

      setContactResponses(allResponses);
      console.log('Total contact responses loaded:', allResponses.length);
    } catch (error) {
      console.error('Error loading contact responses:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleViewResponse = (response) => {
    setSelectedResponse(response);
    onResponseModalOpen();
  };

  const renderNotificationItem = (item, type = 'notification') => {
    const isRead = item.is_read;
    const table = type === 'alert' ? 'alerts' : 'notifications';
    const isContactResponse = item.title === 'Response to Your Contact Form';
    
    // Find matching contact response
    const matchingResponse = isContactResponse ? contactResponses.find(r => {
      // Try to match by checking if notification was created around the same time as response
      const notifDate = new Date(item.created_at);
      const responseDate = new Date(r.responded_at);
      const timeDiff = Math.abs(notifDate - responseDate);
      return timeDiff < 60000; // Within 1 minute
    }) : null;
    
    return (
      <Card
        key={item.id}
        bg={cardBg}
        borderRadius="md"
        mb={3}
        opacity={isRead ? 0.7 : 1}
        borderLeft={!isRead ? '4px solid' : 'none'}
        borderLeftColor="purple.500"
        cursor={isContactResponse && matchingResponse ? 'pointer' : 'default'}
        onClick={isContactResponse && matchingResponse ? () => handleViewResponse(matchingResponse) : undefined}
        _hover={isContactResponse && matchingResponse ? { bg: 'gray.50' } : {}}
      >
        <CardBody p={4}>
          <Flex justify="space-between" align="flex-start">
            <HStack spacing={3} align="flex-start" flex={1}>
              <Box mt={1}>
                {getNotificationIcon(item.type || item.alert_type)}
              </Box>
              <VStack align="flex-start" spacing={1} flex={1}>
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight={isRead ? 'normal' : 'semibold'} color="gray.800">
                    {item.title || item.message}
                  </Text>
                  {!isRead && (
                    <Badge colorScheme="purple" size="sm" borderRadius="full">
                      New
                    </Badge>
                  )}
                  {isContactResponse && matchingResponse && (
                    <Badge colorScheme="blue" size="sm" variant="outline">
                      Click to view
                    </Badge>
                  )}
                </HStack>
                {item.description && (
                  <Text fontSize="xs" color="gray.600">
                    {item.description}
                  </Text>
                )}
                <Text fontSize="xs" color="gray.500">
                  {formatDate(item.created_at)}
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={1}>
              {!isRead && (
                <IconButton
                  icon={<Check size={16} />}
                  size="sm"
                  variant="ghost"
                  aria-label="Mark as read"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(item.id, type);
                  }}
                />
              )}
              <IconButton
                icon={<Trash2 size={16} />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                aria-label="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(item.id, type);
                }}
              />
            </HStack>
          </Flex>
        </CardBody>
      </Card>
    );
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

  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  return (
    <Box minH="100vh" bg={bgColor} pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Box px={4} py={4} bg={cardBg} borderBottom="1px" borderColor="gray.200">
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Notifications
          </Text>
          <HStack spacing={2}>
            <IconButton
              icon={<MessageCircle size={20} />}
              variant="ghost"
              colorScheme="purple"
              aria-label="Contact Us"
              onClick={onContactOpen}
            />
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<Filter size={20} />}
                variant="ghost"
                aria-label="Filter"
              />
              <MenuList>
                <MenuItem onClick={() => markAllAsRead('notification')}>
                  Mark all notifications as read
                </MenuItem>
                <MenuItem onClick={() => markAllAsRead('alert')}>
                  Mark all alerts as read
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>

      <Box px={4} py={4}>
        <Tabs
          index={activeTab}
          onChange={setActiveTab}
          colorScheme="purple"
        >
          <TabList>
            <Tab>
              All
              {unreadNotifications + unreadAlerts > 0 && (
                <Badge ml={2} colorScheme="purple" borderRadius="full">
                  {unreadNotifications + unreadAlerts}
                </Badge>
              )}
            </Tab>
            <Tab>
              Notifications
              {unreadNotifications > 0 && (
                <Badge ml={2} colorScheme="purple" borderRadius="full">
                  {unreadNotifications}
                </Badge>
              )}
            </Tab>
            <Tab>
              Alerts
              {unreadAlerts > 0 && (
                <Badge ml={2} colorScheme="red" borderRadius="full">
                  {unreadAlerts}
                </Badge>
              )}
            </Tab>
            <Tab>
              Promotions
            </Tab>
          </TabList>

          <TabPanels>
            {/* All Tab */}
            <TabPanel px={0}>
              <VStack spacing={3} align="stretch">
                {alerts.length === 0 && notifications.length === 0 && promotions.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Bell size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.600">No notifications</Text>
                  </Box>
                ) : (
                  <>
                    {alerts.length > 0 && (
                      <Box mb={4}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>
                          Security Alerts
                        </Text>
                        {alerts.map(alert => renderNotificationItem(alert, 'alert'))}
                      </Box>
                    )}
                    {notifications.length > 0 && (
                      <Box mb={4}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>
                          Notifications
                        </Text>
                        {notifications.map(notification => renderNotificationItem(notification, 'notification'))}
                      </Box>
                    )}
                    {promotions.length > 0 && (
                      <Box mb={4}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={2}>
                          Promotions
                        </Text>
                        {promotions.map(promo => (
                          <Card
                            key={promo.id}
                            bgGradient="linear(to-r, purple.500, pink.500)"
                            color="white"
                            borderRadius="md"
                            mb={3}
                          >
                            <CardBody p={4}>
                              <HStack spacing={3} align="flex-start">
                                <Gift size={24} />
                                <VStack align="flex-start" spacing={1} flex={1}>
                                  <Text fontWeight="semibold">{promo.title}</Text>
                                  <Text fontSize="sm" opacity={0.9}>{promo.description}</Text>
                                  {promo.discount_amount && (
                                    <Badge colorScheme="green" mt={2}>
                                      Save {promo.discount_amount}%
                                    </Badge>
                                  )}
                                </VStack>
                              </HStack>
                            </CardBody>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </VStack>
            </TabPanel>

            {/* Notifications Tab */}
            <TabPanel px={0}>
              <VStack spacing={3} align="stretch">
                {notifications.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Bell size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.600">No notifications</Text>
                  </Box>
                ) : (
                  notifications.map(notification => renderNotificationItem(notification, 'notification'))
                )}
              </VStack>
            </TabPanel>

            {/* Alerts Tab */}
            <TabPanel px={0}>
              <VStack spacing={3} align="stretch">
                {alerts.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <AlertCircle size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.600">No alerts</Text>
                  </Box>
                ) : (
                  alerts.map(alert => renderNotificationItem(alert, 'alert'))
                )}
              </VStack>
            </TabPanel>

            {/* Promotions Tab */}
            <TabPanel px={0}>
              <VStack spacing={3} align="stretch">
                {promotions.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Gift size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                    <Text color="gray.600">No promotions</Text>
                  </Box>
                ) : (
                  promotions.map(promo => (
                    <Card
                      key={promo.id}
                      bgGradient="linear(to-r, purple.500, pink.500)"
                      color="white"
                      borderRadius="md"
                      mb={3}
                    >
                      <CardBody p={4}>
                        <HStack spacing={3} align="flex-start">
                          <Gift size={24} />
                          <VStack align="flex-start" spacing={1} flex={1}>
                            <Text fontWeight="semibold">{promo.title}</Text>
                            <Text fontSize="sm" opacity={0.9}>{promo.description}</Text>
                            {promo.discount_amount && (
                              <Badge colorScheme="green" mt={2}>
                                Save {promo.discount_amount}%
                              </Badge>
                            )}
                            <Text fontSize="xs" opacity={0.8} mt={1}>
                              {formatDate(promo.created_at)}
                            </Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <BottomNavigation unreadCount={unreadNotifications + unreadAlerts} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      
      {/* Admin Response Modal */}
      <Modal isOpen={isResponseModalOpen} onClose={onResponseModalClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Admin Response</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedResponse && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    Your Message
                  </Text>
                  <Text fontSize="sm" color="gray.800" p={3} bg="gray.50" borderRadius="md">
                    {selectedResponse.message}
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <HStack spacing={2} mb={2}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Admin Response
                    </Text>
                    <Badge colorScheme="green">Responded</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.800" p={3} bg="blue.50" borderRadius="md" borderLeft="4px" borderColor="blue.500">
                    {selectedResponse.admin_response}
                  </Text>
                  {selectedResponse.responded_at && (
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      Responded on {formatDate(selectedResponse.responded_at)}
                    </Text>
                  )}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onResponseModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
