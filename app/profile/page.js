'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Switch,
  Card,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  Button,
  useToast,
  Avatar,
  useDisclosure,
} from '@chakra-ui/react';
import {
  Moon,
  Lock,
  Globe,
  Grid,
  Star,
  CreditCard,
  LogOut,
  Bell,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [darkTheme, setDarkTheme] = useState(false);
  const [personalOffers, setPersonalOffers] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const cardBg = useColorModeValue('white', 'gray.800');
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Load notification counts
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('is_read', false);
      setUnreadNotificationCount((notificationsData || []).length);

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('is_read', false);
      setUnreadAlertCount((alertsData || []).length);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of your account',
        status: 'success',
        duration: 2000,
      });

      // Redirect to landing page
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: error.message || 'An error occurred while logging out',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <HStack justify="space-between" align="center" mb={6}>
          <HStack spacing={3}>
            {profile?.profile_image_url ? (
              <Avatar
                size="md"
                src={profile.profile_image_url}
                name={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
              />
            ) : (
              <Box
                w="50px"
                h="50px"
                borderRadius="full"
                bgGradient="linear(to-br, purple.500, pink.500)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="lg" fontWeight="bold" color="white">
                  {profile?.first_name?.[0] || profile?.email?.[0] || 'U'}{' '}
                </Text>
              </Box>
            )}
            <VStack align="flex-start" spacing={0}>
              <Text fontSize="xs" color="gray.500">
                Welcome back,
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="brand.600">
                {profile?.first_name || profile?.email || 'User'}
              </Text>
            </VStack>
          </HStack>
          <NotificationBell count={unreadNotificationCount + unreadAlertCount} size={20} />
        </HStack>

        <Tabs colorScheme="brand" mb={6}>
          <TabList bg="white" borderRadius="md" p={1}>
            <Tab flex={1} _selected={{ bg: 'brand.600', color: 'white' }}>
              personal
            </Tab>
            <Tab flex={1} _selected={{ bg: 'brand.600', color: 'white' }}>
              cards
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    Appearance
                  </Text>
                  <Card bg={cardBg} borderRadius="md">
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Moon size={20} color="#9c27b0" />
                          <Text fontSize="sm" color="gray.800">
                            Dark theme
                          </Text>
                        </HStack>
                        <Switch
                          isChecked={darkTheme}
                          onChange={(e) => setDarkTheme(e.target.checked)}
                          colorScheme="brand"
                        />
                      </Flex>
                    </CardBody>
                  </Card>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    General
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {[
                      { icon: Lock, label: 'Security', color: 'green.500' },
                      { icon: Bell, label: 'Notifications', color: 'blue.500', action: () => router.push('/notifications') },
                      { icon: CreditCard, label: 'Google pay', color: 'red.500' },
                      { icon: Globe, label: 'Language', color: 'pink.500' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card 
                          key={item.label} 
                          bg={cardBg} 
                          borderRadius="md"
                          cursor={item.action ? 'pointer' : 'default'}
                          onClick={item.action}
                        >
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
                              <IconButton
                                icon={
                                  <Text
                                    style={{
                                      transform: 'rotate(180deg)',
                                      display: 'inline-block',
                                    }}
                                  >
                                    →
                                  </Text>
                                }
                                variant="ghost"
                                size="sm"
                                aria-label={`Go to ${item.label}`}
                              />
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                    <Card bg={cardBg} borderRadius="md" cursor="pointer" onClick={onContactOpen}>
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <HStack spacing={3}>
                            <Box w="20px" h="20px" display="flex" alignItems="center" justifyContent="center">
                              <Text fontSize="sm">💬</Text>
                            </Box>
                            <Text fontSize="sm" color="gray.800">
                              Contact Us
                            </Text>
                          </HStack>
                          <IconButton
                            icon={
                              <Text
                                style={{
                                  transform: 'rotate(180deg)',
                                  display: 'inline-block',
                                }}
                              >
                                →
                              </Text>
                            }
                            variant="ghost"
                            size="sm"
                            aria-label="Contact Us"
                          />
                        </Flex>
                      </CardBody>
                    </Card>
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    Account
                  </Text>
                  <Card bg={cardBg} borderRadius="md">
                    <CardBody>
                      <Button
                        leftIcon={<LogOut size={20} />}
                        colorScheme="red"
                        variant="outline"
                        w="full"
                        onClick={handleLogout}
                        isLoading={loading}
                      >
                        Log Out
                      </Button>
                    </CardBody>
                  </Card>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    Personalization
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {[
                      { icon: Grid, label: 'Main screen', color: 'pink.500' },
                      { icon: Grid, label: 'Widgets', color: 'blue.500' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.label} bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
                              <IconButton
                                icon={
                                  <Text
                                    style={{
                                      transform: 'rotate(180deg)',
                                      display: 'inline-block',
                                    }}
                                  >
                                    →
                                  </Text>
                                }
                                variant="ghost"
                                size="sm"
                                aria-label={`Go to ${item.label}`}
                              />
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                    <Card bg={cardBg} borderRadius="md">
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <HStack spacing={3}>
                            <Star size={20} color="#f97316" />
                            <Text fontSize="sm" color="gray.800">
                              Personal offers
                            </Text>
                          </HStack>
                          <Switch
                            isChecked={personalOffers}
                            onChange={(e) => setPersonalOffers(e.target.checked)}
                            colorScheme="brand"
                          />
                        </Flex>
                      </CardBody>
                    </Card>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    Actions
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {[
                      {
                        icon: Moon,
                        label: 'Freeze physical card',
                        color: 'blue.500',
                        hasToggle: true,
                      },
                      {
                        icon: CreditCard,
                        label: 'Disable contactless',
                        color: 'pink.500',
                      },
                      {
                        icon: CreditCard,
                        label: 'Disable magstripe',
                        color: 'purple.500',
                      },
                      {
                        icon: Grid,
                        label: 'QR Code',
                        color: 'orange.500',
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.label} bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
                              {item.hasToggle ? (
                                <Switch colorScheme="brand" />
                              ) : (
                                <IconButton
                                  icon={
                                    <Text
                                      style={{
                                        transform: 'rotate(180deg)',
                                        display: 'inline-block',
                                      }}
                                    >
                                      →
                                    </Text>
                                  }
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Go to ${item.label}`}
                                />
                              )}
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}

