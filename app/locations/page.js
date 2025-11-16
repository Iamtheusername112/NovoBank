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
  Input,
  Select,
  useToast,
  useDisclosure,
  IconButton,
  useBreakpointValue,
  Heading,
  Badge,
  Divider,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  MapPin,
  Building2,
  Navigation,
  Phone,
  Clock,
  Wifi,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function LocationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [atms, setAtms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadUserData();
      loadNotificationCounts();
      getUserLocation();
      loadLocations();
    }
  }, [mounted]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  };

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadLocations = async () => {
    try {
      // Load ATMs
      const { data: atmsData } = await supabase
        .from('atm_locations')
        .select('*')
        .order('name', { ascending: true })
        .limit(50);

      if (atmsData) {
        setAtms(atmsData);
      } else {
        // Mock data if no ATMs in database
        setAtms([
          {
            id: '1',
            name: 'Main Street ATM',
            address: '123 Main Street',
            city: 'New York',
            state: 'NY',
            zip_code: '10001',
            latitude: 40.7128,
            longitude: -74.0060,
            is_24_hours: true,
            accepts_deposits: true,
            accepts_withdrawals: true,
            is_accessible: true,
          },
          {
            id: '2',
            name: 'Park Avenue ATM',
            address: '456 Park Avenue',
            city: 'New York',
            state: 'NY',
            zip_code: '10022',
            latitude: 40.7489,
            longitude: -73.9680,
            is_24_hours: false,
            accepts_deposits: true,
            accepts_withdrawals: true,
            is_accessible: false,
          },
        ]);
      }

      // Load Branches
      const { data: branchesData } = await supabase
        .from('branch_locations')
        .select('*')
        .order('name', { ascending: true })
        .limit(50);

      if (branchesData) {
        setBranches(branchesData);
      } else {
        // Mock data if no branches in database
        setBranches([
          {
            id: '1',
            name: 'Downtown Branch',
            address: '789 Broadway',
            city: 'New York',
            state: 'NY',
            zip_code: '10003',
            latitude: 40.7282,
            longitude: -73.9942,
            phone: '(212) 555-0100',
            email: 'downtown@novobank.com',
            hours_monday: '9:00 AM - 5:00 PM',
            hours_tuesday: '9:00 AM - 5:00 PM',
            hours_wednesday: '9:00 AM - 5:00 PM',
            hours_thursday: '9:00 AM - 5:00 PM',
            hours_friday: '9:00 AM - 6:00 PM',
            hours_saturday: '10:00 AM - 2:00 PM',
            hours_sunday: 'Closed',
            services: ['Banking', 'Loans', 'Investments'],
            is_accessible: true,
          },
          {
            id: '2',
            name: 'Uptown Branch',
            address: '321 Fifth Avenue',
            city: 'New York',
            state: 'NY',
            zip_code: '10016',
            latitude: 40.7505,
            longitude: -73.9934,
            phone: '(212) 555-0200',
            email: 'uptown@novobank.com',
            hours_monday: '9:00 AM - 5:00 PM',
            hours_tuesday: '9:00 AM - 5:00 PM',
            hours_wednesday: '9:00 AM - 5:00 PM',
            hours_thursday: '9:00 AM - 5:00 PM',
            hours_friday: '9:00 AM - 6:00 PM',
            hours_saturday: '10:00 AM - 2:00 PM',
            hours_sunday: 'Closed',
            services: ['Banking', 'Loans'],
            is_accessible: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDirections = (location) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const filteredAtms = atms.filter(atm => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        atm.name?.toLowerCase().includes(query) ||
        atm.address?.toLowerCase().includes(query) ||
        atm.city?.toLowerCase().includes(query)
      );
    }
    if (filterType === 'deposits' && !atm.accepts_deposits) return false;
    if (filterType === '24hours' && !atm.is_24_hours) return false;
    if (filterType === 'accessible' && !atm.is_accessible) return false;
    return true;
  }).map(atm => {
    let distance = null;
    if (userLocation && atm.latitude && atm.longitude) {
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        atm.latitude,
        atm.longitude
      );
    }
    return { ...atm, distance };
  }).sort((a, b) => {
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  const filteredBranches = branches.filter(branch => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        branch.name?.toLowerCase().includes(query) ||
        branch.address?.toLowerCase().includes(query) ||
        branch.city?.toLowerCase().includes(query)
      );
    }
    return true;
  }).map(branch => {
    let distance = null;
    if (userLocation && branch.latitude && branch.longitude) {
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        branch.latitude,
        branch.longitude
      );
    }
    return { ...branch, distance };
  }).sort((a, b) => {
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  const getCurrentDayHours = (branch) => {
    const day = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = `hours_${days[day]}`;
    return branch[dayKey] || 'Closed';
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
          <Heading size="md">Find Locations</Heading>
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
        {/* Search */}
        <Card mb={6}>
          <CardBody>
            <VStack spacing={4}>
              <Input
                placeholder="Search by name, address, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {activeTab === 0 && (
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All ATMs</option>
                  <option value="deposits">Accepts Deposits</option>
                  <option value="24hours">24 Hours</option>
                  <option value="accessible">Accessible</option>
                </Select>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>ATMs</Tab>
            <Tab>Branches</Tab>
          </TabList>

          <TabPanels>
            {/* ATMs Tab */}
            <TabPanel px={0}>
              {filteredAtms.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <MapPin size={48} color="gray" />
                      <Text color="gray.500">No ATMs found</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {filteredAtms.map((atm) => (
                    <Card key={atm.id} variant="outline">
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between" align="start">
                            <VStack align="start" spacing={1} flex={1}>
                              <Text fontWeight="bold">{atm.name}</Text>
                              <Text fontSize="sm" color="gray.600">
                                {atm.address}, {atm.city}, {atm.state} {atm.zip_code}
                              </Text>
                              {atm.distance !== null && (
                                <Text fontSize="xs" color="gray.500">
                                  {atm.distance.toFixed(1)} miles away
                                </Text>
                              )}
                            </VStack>
                            <Button
                              size="sm"
                              leftIcon={<Navigation size={16} />}
                              onClick={() => getDirections(atm)}
                            >
                              Directions
                            </Button>
                          </Flex>
                          <Divider />
                          <SimpleGrid columns={2} spacing={2}>
                            {atm.is_24_hours && (
                              <HStack spacing={1}>
                                <Clock size={16} />
                                <Text fontSize="xs">24 Hours</Text>
                              </HStack>
                            )}
                            {atm.accepts_deposits && (
                              <HStack spacing={1}>
                                <DollarSign size={16} />
                                <Text fontSize="xs">Deposits</Text>
                              </HStack>
                            )}
                            {atm.accepts_withdrawals && (
                              <HStack spacing={1}>
                                <DollarSign size={16} />
                                <Text fontSize="xs">Withdrawals</Text>
                              </HStack>
                            )}
                            {atm.is_accessible && (
                              <HStack spacing={1}>
                                <Badge fontSize="xs" colorScheme="green">Accessible</Badge>
                              </HStack>
                            )}
                          </SimpleGrid>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>

            {/* Branches Tab */}
            <TabPanel px={0}>
              {filteredBranches.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <Building2 size={48} color="gray" />
                      <Text color="gray.500">No branches found</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {filteredBranches.map((branch) => (
                    <Card key={branch.id} variant="outline">
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between" align="start">
                            <VStack align="start" spacing={1} flex={1}>
                              <Text fontWeight="bold">{branch.name}</Text>
                              <Text fontSize="sm" color="gray.600">
                                {branch.address}, {branch.city}, {branch.state} {branch.zip_code}
                              </Text>
                              {branch.distance !== null && (
                                <Text fontSize="xs" color="gray.500">
                                  {branch.distance.toFixed(1)} miles away
                                </Text>
                              )}
                            </VStack>
                            <Button
                              size="sm"
                              leftIcon={<Navigation size={16} />}
                              onClick={() => getDirections(branch)}
                            >
                              Directions
                            </Button>
                          </Flex>
                          <Divider />
                          <VStack align="stretch" spacing={2}>
                            {branch.phone && (
                              <HStack spacing={2}>
                                <Phone size={16} />
                                <Text fontSize="sm">{branch.phone}</Text>
                              </HStack>
                            )}
                            <HStack spacing={2}>
                              <Clock size={16} />
                              <Text fontSize="sm">
                                Today: {getCurrentDayHours(branch)}
                              </Text>
                            </HStack>
                            {branch.services && branch.services.length > 0 && (
                              <HStack spacing={2} flexWrap="wrap">
                                {branch.services.map((service, index) => (
                                  <Badge key={index} fontSize="xs" colorScheme="purple">
                                    {service}
                                  </Badge>
                                ))}
                              </HStack>
                            )}
                            {branch.is_accessible && (
                              <Badge fontSize="xs" colorScheme="green" w="fit-content">
                                Accessible
                              </Badge>
                            )}
                          </VStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

