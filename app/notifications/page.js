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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [mounted, setMounted] = useState(false);

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

  const renderNotificationItem = (item, type = 'notification') => {
    const isRead = item.is_read;
    const table = type === 'alert' ? 'alerts' : 'notifications';
    
    return (
      <Card
        key={item.id}
        bg={cardBg}
        borderRadius="md"
        mb={3}
        opacity={isRead ? 0.7 : 1}
        borderLeft={!isRead ? '4px solid' : 'none'}
        borderLeftColor="purple.500"
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
                  onClick={() => markAsRead(item.id, type)}
                />
              )}
              <IconButton
                icon={<Trash2 size={16} />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                aria-label="Delete"
                onClick={() => deleteNotification(item.id, type)}
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

      <BottomNavigation />
    </Box>
  );
}
