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
  Switch,
  Divider,
  Tag,
  TagLabel,
  TagCloseButton,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  CreditCard,
  Shield,
  Globe,
  MapPin,
  DollarSign,
  Lock,
  Unlock,
  Plus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function CardControlsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardControls, setCardControls] = useState([]);
  const [travelNotifications, setTravelNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);

  const { isOpen: isControlsOpen, onOpen: onControlsOpen, onClose: onControlsClose } = useDisclosure();
  const { isOpen: isTravelOpen, onOpen: onTravelOpen, onClose: onTravelClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [controlsForm, setControlsForm] = useState({
    daily_spending_limit: '',
    monthly_spending_limit: '',
    blocked_merchant_categories: [],
    blocked_countries: [],
    allowed_countries: [],
    require_approval_for_large_transactions: false,
    large_transaction_threshold: '',
    is_location_based_enabled: false,
    allowed_locations: [],
  });

  const [travelForm, setTravelForm] = useState({
    card_id: '',
    destination_country: '',
    start_date: '',
    end_date: '',
  });

  const [newCategory, setNewCategory] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const merchantCategories = [
    'Grocery Stores',
    'Gas Stations',
    'Restaurants',
    'Entertainment',
    'Travel',
    'Online Shopping',
    'ATM Withdrawals',
    'Gambling',
    'Adult Content',
    'Cash Advances',
  ];

  const countries = [
    'US', 'CA', 'MX', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE',
    'AU', 'NZ', 'JP', 'CN', 'KR', 'IN', 'BR', 'AR', 'CL', 'ZA',
  ];

  const modalSize = useBreakpointValue({ base: 'full', md: 'lg' });
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

      // Load cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (cardsData) {
        setCards(cardsData);
        if (cardsData.length > 0 && !selectedCard) {
          setSelectedCard(cardsData[0]);
        }
      }

      // Load card controls
      const { data: controlsData } = await supabase
        .from('card_controls')
        .select('*, cards(*)')
        .in('card_id', cardsData?.map(c => c.id) || []);

      if (controlsData) {
        setCardControls(controlsData);
        // Set form if controls exist for selected card
        if (selectedCard) {
          const control = controlsData.find(c => c.card_id === selectedCard.id);
          if (control) {
            setControlsForm({
              daily_spending_limit: control.daily_spending_limit?.toString() || '',
              monthly_spending_limit: control.monthly_spending_limit?.toString() || '',
              blocked_merchant_categories: control.blocked_merchant_categories || [],
              blocked_countries: control.blocked_countries || [],
              allowed_countries: control.allowed_countries || [],
              require_approval_for_large_transactions: control.require_approval_for_large_transactions || false,
              large_transaction_threshold: control.large_transaction_threshold?.toString() || '',
              is_location_based_enabled: control.is_location_based_enabled || false,
              allowed_locations: control.allowed_locations || [],
            });
          }
        }
      }

      // Load travel notifications
      const { data: travelData } = await supabase
        .from('travel_notifications')
        .select('*, cards(*)')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (travelData) setTravelNotifications(travelData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
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

  const handleSaveControls = async () => {
    if (!selectedCard) {
      toast({
        title: 'Error',
        description: 'Please select a card',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const controlData = {
        card_id: selectedCard.id,
        daily_spending_limit: controlsForm.daily_spending_limit ? parseFloat(controlsForm.daily_spending_limit) : null,
        monthly_spending_limit: controlsForm.monthly_spending_limit ? parseFloat(controlsForm.monthly_spending_limit) : null,
        blocked_merchant_categories: controlsForm.blocked_merchant_categories,
        blocked_countries: controlsForm.blocked_countries,
        allowed_countries: controlsForm.allowed_countries.length > 0 ? controlsForm.allowed_countries : null,
        require_approval_for_large_transactions: controlsForm.require_approval_for_large_transactions,
        large_transaction_threshold: controlsForm.large_transaction_threshold ? parseFloat(controlsForm.large_transaction_threshold) : null,
        is_location_based_enabled: controlsForm.is_location_based_enabled,
        allowed_locations: controlsForm.allowed_locations,
      };

      // Check if controls exist
      const existingControl = cardControls.find(c => c.card_id === selectedCard.id);

      if (existingControl) {
        const { error } = await supabase
          .from('card_controls')
          .update(controlData)
          .eq('id', existingControl.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('card_controls')
          .insert(controlData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Card controls updated',
        status: 'success',
      });

      onControlsClose();
      loadUserData();
    } catch (error) {
      console.error('Error saving controls:', error);
      toast({
        title: 'Error',
        description: 'Failed to save controls',
        status: 'error',
      });
    }
  };

  const handleAddTravelNotification = async () => {
    if (!travelForm.card_id || !travelForm.destination_country || !travelForm.start_date || !travelForm.end_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('travel_notifications')
        .insert({
          user_id: authUser.id,
          card_id: travelForm.card_id,
          destination_country: travelForm.destination_country,
          start_date: travelForm.start_date,
          end_date: travelForm.end_date,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Travel notification added',
        status: 'success',
      });

      setTravelForm({
        card_id: '',
        destination_country: '',
        start_date: '',
        end_date: '',
      });

      onTravelClose();
      loadUserData();
    } catch (error) {
      console.error('Error adding travel notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to add travel notification',
        status: 'error',
      });
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

  const formatCardNumber = (number) => {
    return `•••• •••• •••• ${number.slice(-4)}`;
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
          <Heading size="md">Card Controls</Heading>
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
        {/* Card Selection */}
        {cards.length > 0 && (
          <Card mb={6}>
            <CardBody>
              <FormControl mb={4}>
                <FormLabel>Select Card</FormLabel>
                <Select
                  value={selectedCard?.id || ''}
                  onChange={(e) => {
                    const card = cards.find(c => c.id === e.target.value);
                    setSelectedCard(card);
                    const control = cardControls.find(c => c.card_id === card.id);
                    if (control) {
                      setControlsForm({
                        daily_spending_limit: control.daily_spending_limit?.toString() || '',
                        monthly_spending_limit: control.monthly_spending_limit?.toString() || '',
                        blocked_merchant_categories: control.blocked_merchant_categories || [],
                        blocked_countries: control.blocked_countries || [],
                        allowed_countries: control.allowed_countries || [],
                        require_approval_for_large_transactions: control.require_approval_for_large_transactions || false,
                        large_transaction_threshold: control.large_transaction_threshold?.toString() || '',
                        is_location_based_enabled: control.is_location_based_enabled || false,
                        allowed_locations: control.allowed_locations || [],
                      });
                    } else {
                      setControlsForm({
                        daily_spending_limit: '',
                        monthly_spending_limit: '',
                        blocked_merchant_categories: [],
                        blocked_countries: [],
                        allowed_countries: [],
                        require_approval_for_large_transactions: false,
                        large_transaction_threshold: '',
                        is_location_based_enabled: false,
                        allowed_locations: [],
                      });
                    }
                  }}
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {formatCardNumber(card.card_number)} - {card.card_holder_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </CardBody>
          </Card>
        )}

        {/* Spending Limits */}
        <Card mb={6}>
          <CardBody>
            <Heading size="sm" mb={4}>Spending Limits</Heading>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">Daily Limit</Text>
                  <Text fontSize="sm" color="gray.600">
                    {controlsForm.daily_spending_limit 
                      ? formatCurrency(parseFloat(controlsForm.daily_spending_limit))
                      : 'No limit'}
                  </Text>
                </VStack>
                <Button size="sm" onClick={onControlsOpen}>
                  Edit
                </Button>
              </HStack>
              <Divider />
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">Monthly Limit</Text>
                  <Text fontSize="sm" color="gray.600">
                    {controlsForm.monthly_spending_limit 
                      ? formatCurrency(parseFloat(controlsForm.monthly_spending_limit))
                      : 'No limit'}
                  </Text>
                </VStack>
                <Button size="sm" onClick={onControlsOpen}>
                  Edit
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Travel Notifications */}
        <Card mb={6}>
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Travel Notifications</Heading>
              <Button size="sm" colorScheme="purple" onClick={onTravelOpen}>
                Add Travel
              </Button>
            </Flex>
            {travelNotifications.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No active travel notifications</Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {travelNotifications.map((travel) => (
                  <Flex
                    key={travel.id}
                    justify="space-between"
                    align="center"
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold" fontSize="sm">
                        {travel.destination_country}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {formatDate(travel.start_date)} - {formatDate(travel.end_date)}
                      </Text>
                    </VStack>
                    <Badge colorScheme="green" fontSize="xs">Active</Badge>
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Blocked Categories */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Blocked Merchant Categories</Heading>
            {controlsForm.blocked_merchant_categories.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No categories blocked</Text>
            ) : (
              <HStack spacing={2} flexWrap="wrap">
                {controlsForm.blocked_merchant_categories.map((category) => (
                  <Tag key={category} colorScheme="red">
                    <TagLabel>{category}</TagLabel>
                  </Tag>
                ))}
              </HStack>
            )}
            <Button size="sm" mt={4} onClick={onControlsOpen}>
              Manage Categories
            </Button>
          </CardBody>
        </Card>
      </Box>

      {/* Controls Modal */}
      <Modal isOpen={isControlsOpen} onClose={onControlsClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Card Controls</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6}>
              {/* Spending Limits */}
              <VStack spacing={4} align="stretch" w="full">
                <Heading size="sm">Spending Limits</Heading>
                <FormControl>
                  <FormLabel>Daily Spending Limit</FormLabel>
                  <Input
                    type="number"
                    value={controlsForm.daily_spending_limit}
                    onChange={(e) => setControlsForm({ ...controlsForm, daily_spending_limit: e.target.value })}
                    placeholder="No limit"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Monthly Spending Limit</FormLabel>
                  <Input
                    type="number"
                    value={controlsForm.monthly_spending_limit}
                    onChange={(e) => setControlsForm({ ...controlsForm, monthly_spending_limit: e.target.value })}
                    placeholder="No limit"
                  />
                </FormControl>
              </VStack>

              <Divider />

              {/* Large Transaction Approval */}
              <VStack spacing={4} align="stretch" w="full">
                <FormControl>
                  <HStack>
                    <Switch
                      isChecked={controlsForm.require_approval_for_large_transactions}
                      onChange={(e) => setControlsForm({ ...controlsForm, require_approval_for_large_transactions: e.target.checked })}
                    />
                    <FormLabel mb={0}>Require approval for large transactions</FormLabel>
                  </HStack>
                </FormControl>
                {controlsForm.require_approval_for_large_transactions && (
                  <FormControl>
                    <FormLabel>Large Transaction Threshold</FormLabel>
                    <Input
                      type="number"
                      value={controlsForm.large_transaction_threshold}
                      onChange={(e) => setControlsForm({ ...controlsForm, large_transaction_threshold: e.target.value })}
                      placeholder="0.00"
                    />
                  </FormControl>
                )}
              </VStack>

              <Divider />

              {/* Blocked Categories */}
              <VStack spacing={4} align="stretch" w="full">
                <Heading size="sm">Blocked Merchant Categories</Heading>
                <HStack>
                  <Select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Select category"
                  >
                    {merchantCategories
                      .filter(cat => !controlsForm.blocked_merchant_categories.includes(cat))
                      .map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newCategory && !controlsForm.blocked_merchant_categories.includes(newCategory)) {
                        setControlsForm({
                          ...controlsForm,
                          blocked_merchant_categories: [...controlsForm.blocked_merchant_categories, newCategory],
                        });
                        setNewCategory('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {controlsForm.blocked_merchant_categories.map((category) => (
                    <Tag key={category} colorScheme="red">
                      <TagLabel>{category}</TagLabel>
                      <TagCloseButton
                        onClick={() => {
                          setControlsForm({
                            ...controlsForm,
                            blocked_merchant_categories: controlsForm.blocked_merchant_categories.filter(c => c !== category),
                          });
                        }}
                      />
                    </Tag>
                  ))}
                </HStack>
              </VStack>

              <Divider />

              {/* Blocked Countries */}
              <VStack spacing={4} align="stretch" w="full">
                <Heading size="sm">Blocked Countries</Heading>
                <HStack>
                  <Select
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="Select country"
                  >
                    {countries
                      .filter(country => !controlsForm.blocked_countries.includes(country))
                      .map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newCountry && !controlsForm.blocked_countries.includes(newCountry)) {
                        setControlsForm({
                          ...controlsForm,
                          blocked_countries: [...controlsForm.blocked_countries, newCountry],
                        });
                        setNewCountry('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {controlsForm.blocked_countries.map((country) => (
                    <Tag key={country} colorScheme="red">
                      <TagLabel>{country}</TagLabel>
                      <TagCloseButton
                        onClick={() => {
                          setControlsForm({
                            ...controlsForm,
                            blocked_countries: controlsForm.blocked_countries.filter(c => c !== country),
                          });
                        }}
                      />
                    </Tag>
                  ))}
                </HStack>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onControlsClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSaveControls}>
              Save Controls
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Travel Notification Modal */}
      <Modal isOpen={isTravelOpen} onClose={onTravelClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Travel Notification</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Card</FormLabel>
                <Select
                  value={travelForm.card_id}
                  onChange={(e) => setTravelForm({ ...travelForm, card_id: e.target.value })}
                  placeholder="Select card"
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {formatCardNumber(card.card_number)} - {card.card_holder_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Destination Country</FormLabel>
                <Select
                  value={travelForm.destination_country}
                  onChange={(e) => setTravelForm({ ...travelForm, destination_country: e.target.value })}
                  placeholder="Select country"
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={travelForm.start_date}
                  onChange={(e) => setTravelForm({ ...travelForm, start_date: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>End Date</FormLabel>
                <Input
                  type="date"
                  value={travelForm.end_date}
                  onChange={(e) => setTravelForm({ ...travelForm, end_date: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTravelClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddTravelNotification}>
              Add Notification
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

