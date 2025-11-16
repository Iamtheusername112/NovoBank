'use client';

import { useState, useEffect, useRef } from 'react';
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Select,
  FormControl,
  FormLabel,
  Image,
  Spinner,
  Divider,
  Input,
  useBreakpointValue,
  Alert,
  AlertIcon,
  Badge,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
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
  QrCode,
  Snowflake,
  Wifi,
  Shield,
  ChevronRight,
  Trash2,
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
  const [language, setLanguage] = useState('en');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingCard, setUpdatingCard] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();
  const { isOpen: isSecurityOpen, onOpen: onSecurityOpen, onClose: onSecurityClose } = useDisclosure();
  const { isOpen: isLanguageOpen, onOpen: onLanguageOpen, onClose: onLanguageClose } = useDisclosure();
  const { isOpen: isQROpen, onOpen: onQROpen, onClose: onQROClose } = useDisclosure();
  const { isOpen: isGooglePayOpen, onOpen: onGooglePayOpen, onClose: onGooglePayClose } = useDisclosure();
  const { isOpen: isAddCardOpen, onOpen: onAddCardOpen, onClose: onAddCardClose } = useDisclosure();
  const { isOpen: isDeleteCardOpen, onOpen: onDeleteCardOpen, onClose: onDeleteCardClose } = useDisclosure();
  const cancelRef = useRef();
  const [cardToDelete, setCardToDelete] = useState(null);
  const [newCard, setNewCard] = useState({
    card_holder_name: '',
    card_number: '',
    expiry_date: '',
    card_type: 'DEBIT',
    gradient_type: 'purple',
  });

  const [addingCard, setAddingCard] = useState(false);
  const modalSize = useBreakpointValue({ base: 'full', md: 'md' });

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

      // Load user settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading settings:', settingsError);
      } else if (settingsData) {
        setSettings(settingsData);
        setDarkTheme(settingsData.dark_mode_enabled || false);
        setPersonalOffers(settingsData.personal_offers_enabled !== false); // Default to true
        setLanguage(settingsData.language || 'en');
      }

      // Load cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Error loading cards:', cardsError);
      } else {
        setCards(cardsData || []);
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

  const saveSettings = async (updates) => {
    if (!user) return;

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Update local state
      setSettings(prev => ({ ...prev, ...updates }));
      
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDarkThemeChange = async (checked) => {
    setDarkTheme(checked);
    await saveSettings({ dark_mode_enabled: checked });
    // Note: Actual theme switching would require Chakra UI ColorMode setup
    toast({
      title: 'Theme preference saved',
      description: 'Theme change will take effect on next app update',
      status: 'info',
      duration: 2000,
    });
  };

  const handlePersonalOffersChange = async (checked) => {
    setPersonalOffers(checked);
    await saveSettings({ personal_offers_enabled: checked });
  };

  const handleLanguageChange = async (newLanguage) => {
    setLanguage(newLanguage);
    await saveSettings({ language: newLanguage });
    onLanguageClose();
  };

  const handleCardToggle = async (cardId, field, value) => {
    if (!user) return;

    setUpdatingCard(cardId);
    try {
      const { error } = await supabase
        .from('cards')
        .update({ [field]: value })
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setCards(prev => prev.map(card => 
        card.id === cardId ? { ...card, [field]: value } : card
      ));

      toast({
        title: 'Card updated',
        description: `Card ${field === 'is_frozen' ? (value ? 'frozen' : 'unfrozen') : field.replace('is_', '').replace('_enabled', '') + ' ' + (value ? 'enabled' : 'disabled')}`,
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card settings',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setUpdatingCard(null);
    }
  };

  const handleDeleteCardClick = (cardId) => {
    setCardToDelete(cardId);
    onDeleteCardOpen();
  };

  const handleDeleteCardConfirm = async () => {
    if (!user || !cardToDelete) return;

    setUpdatingCard(cardToDelete);
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setCards(prev => prev.filter(card => card.id !== cardToDelete));

      // Clear selected card if it was deleted
      if (selectedCardId === cardToDelete) {
        setSelectedCardId(null);
      }

      toast({
        title: 'Card removed',
        description: 'The card has been successfully removed',
        status: 'success',
        duration: 2000,
      });

      onDeleteCardClose();
      setCardToDelete(null);
    } catch (error) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove card',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setUpdatingCard(null);
    }
  };

  const generateQRCode = () => {
    if (!profile || !user) return null;
    
    const qrData = JSON.stringify({
      type: 'payment_receive',
      user_id: user.id,
      email: profile.email,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      timestamp: new Date().toISOString(),
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
    return qrUrl;
  };

  const getCardholderName = (card) => {
    if (card?.card_holder_name?.trim()) {
      return card.card_holder_name;
    }
    const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    return userName || 'CARDHOLDER NAME';
  };

  const getCardGradient = (gradientType, cardType = 'DEBIT') => {
    // American Express has a distinctive blue design - classic Amex blue
    if (cardType === 'AMEX') {
      return 'linear(to-br, #006FCF, #0052A3, #003087)'; // Real Amex blue gradient
    }
    
    // Visa has a distinctive blue/white design - classic Visa blue
    if (cardType === 'VISA') {
      return 'linear(to-br, #1434CB, #0F2A7F, #0A1F4D)'; // Real Visa blue gradient
    }
    
    // Mastercard has a distinctive red/orange design - classic Mastercard colors
    if (cardType === 'MASTERCARD') {
      return 'linear(to-br, #EB001B, #F79E1B)'; // Real Mastercard red/orange gradient
    }
    
    const gradients = {
      purple: 'linear(to-r, purple.500, pink.400, blue.400)',
      blue: 'linear(to-r, blue.500, cyan.400, indigo.400)',
      pink: 'linear(to-r, pink.500, rose.400, purple.400)',
      orange: 'linear(to-r, orange.500, red.400, yellow.400)',
      green: 'linear(to-r, green.500, emerald.400, teal.400)',
    };
    return gradients[gradientType] || gradients.purple;
  };

  const isAmexCard = (cardType) => {
    return cardType === 'AMEX' || cardType === 'AMERICAN_EXPRESS';
  };

  const isCreditCard = (cardType) => {
    return cardType === 'CREDIT' || cardType === 'VISA' || cardType === 'MASTERCARD';
  };

  const formatCardNumberDisplay = (number, cardType = 'DEBIT') => {
    if (!number) {
      return cardType === 'AMEX' ? '•••• •••••• •••••' : '•••• •••• •••• ••••';
    }
    const digits = number.replace(/\D/g, '');
    if (digits.length === 0) {
      return cardType === 'AMEX' ? '•••• •••••• •••••' : '•••• •••• •••• ••••';
    }
    
    if (cardType === 'AMEX') {
      // Amex format: XXXX XXXXXX XXXXX
      const formatted = formatCardNumber(number, 'AMEX');
      const masked = formatted.slice(0, -5).replace(/\d/g, '•') + formatted.slice(-5);
      return masked;
    } else {
      // Standard format
      const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
      const masked = formatted.slice(0, -4).replace(/\d/g, '•') + formatted.slice(-4);
      return masked.padEnd(19, '•').slice(0, 19);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatCardNumber = (value, cardType = 'DEBIT') => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    if (cardType === 'AMEX') {
      // Amex format: XXXX XXXXXX XXXXX (15 digits)
      if (digits.length <= 4) {
        return digits;
      } else if (digits.length <= 10) {
        return `${digits.slice(0, 4)} ${digits.slice(4)}`;
      } else {
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10, 15)}`;
      }
    } else {
      // Standard format: XXXX XXXX XXXX XXXX (16 digits)
      const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
      return formatted.slice(0, 19); // Max 16 digits + 3 spaces
    }
  };

  const formatExpiryDate = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as MM/YY
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleAddCard = async () => {
    if (!user || !profile) return;

    // Validation
    if (!newCard.card_holder_name.trim()) {
      toast({
        title: 'Error',
        description: 'Card holder name is required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const cardNumberDigits = newCard.card_number.replace(/\D/g, '');
    const requiredLength = isAmexCard(newCard.card_type) ? 15 : 16;
    
    if (!newCard.card_number || cardNumberDigits.length < requiredLength) {
      toast({
        title: 'Error',
        description: isAmexCard(newCard.card_type) 
          ? 'Please enter a valid 15-digit American Express card number'
          : 'Please enter a valid 16-digit card number',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!newCard.expiry_date || newCard.expiry_date.length < 5) {
      toast({
        title: 'Error',
        description: 'Please enter a valid expiry date (MM/YY)',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setAddingCard(true);
    try {
      // Format card number (remove spaces)
      const cardNumberDigits = newCard.card_number.replace(/\D/g, '');
      
      const { data: createdCard, error } = await supabase
        .from('cards')
        .insert([
          {
            user_id: user.id,
            card_holder_name: newCard.card_holder_name.trim(),
            card_number: cardNumberDigits,
            expiry_date: newCard.expiry_date,
            card_type: newCard.card_type,
            gradient_type: newCard.gradient_type,
            balance: 0,
            is_frozen: false,
            is_contactless_enabled: true,
            is_magstripe_enabled: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Card Added',
        description: 'Your card has been added successfully',
        status: 'success',
        duration: 3000,
      });

      // Reset form
      setNewCard({
        card_holder_name: '',
        card_number: '',
        expiry_date: '',
        card_type: 'DEBIT',
        gradient_type: 'purple',
      });

      // Reload cards
      await loadUserData();
      onAddCardClose();
    } catch (error) {
      console.error('Error adding card:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add card. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setAddingCard(false);
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

  const primaryCard = cards.find(c => !c.is_frozen) || cards[0];
  const isCardFrozen = primaryCard?.is_frozen || false;
  const isContactlessEnabled = primaryCard?.is_contactless_enabled !== false;
  const isMagstripeEnabled = primaryCard?.is_magstripe_enabled !== false;

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
  ];

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
                          onChange={(e) => handleDarkThemeChange(e.target.checked)}
                          colorScheme="brand"
                          isDisabled={savingSettings}
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
                      { icon: Lock, label: 'Security', color: 'green.500', action: onSecurityOpen },
                      { icon: Bell, label: 'Notifications', color: 'blue.500', action: () => router.push('/notifications') },
                      { icon: CreditCard, label: 'Google Pay', color: 'red.500', action: onGooglePayOpen },
                      { icon: Globe, label: 'Language', color: 'pink.500', action: onLanguageOpen },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card 
                          key={item.label} 
                          bg={cardBg} 
                          borderRadius="md"
                          cursor="pointer"
                          onClick={item.action}
                          _hover={{ bg: 'gray.50' }}
                        >
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
                              <ChevronRight size={20} color="#9ca3af" />
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                    <Card bg={cardBg} borderRadius="md" cursor="pointer" onClick={onContactOpen} _hover={{ bg: 'gray.50' }}>
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
                          <ChevronRight size={20} color="#9ca3af" />
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
                      { icon: Grid, label: 'Main screen', color: 'pink.500', action: () => router.push('/wallet') },
                      { icon: Grid, label: 'Widgets', color: 'blue.500', action: () => router.push('/widgets') },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card 
                          key={item.label} 
                          bg={cardBg} 
                          borderRadius="md"
                          cursor="pointer"
                          onClick={item.action}
                          _hover={{ bg: 'gray.50' }}
                        >
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
                              <ChevronRight size={20} color="#9ca3af" />
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
                            onChange={(e) => handlePersonalOffersChange(e.target.checked)}
                            colorScheme="brand"
                            isDisabled={savingSettings}
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
                  <HStack justify="space-between" align="center" mb={3}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                      {cards.length > 0 ? 'Card Actions' : 'Cards'}
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      leftIcon={<CreditCard size={16} />}
                      onClick={onAddCardOpen}
                    >
                      Add Card
                    </Button>
                  </HStack>
                </Box>

                {cards.length === 0 ? (
                  <Card bg={cardBg} borderRadius="md" border="2px dashed" borderColor="gray.300">
                    <CardBody>
                      <VStack spacing={3} py={4}>
                        <CreditCard size={48} color="#9ca3af" />
                        <Text textAlign="center" color="gray.500">
                          No cards found
                        </Text>
                        <Text fontSize="xs" textAlign="center" color="gray.400">
                          Add a card to get started
                        </Text>
                        <Button
                          size="sm"
                          colorScheme="purple"
                          onClick={onAddCardOpen}
                        >
                          Add Your First Card
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                ) : (
                  <>
                    <Box>
                      <VStack spacing={2} align="stretch">
                        <Card bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Snowflake size={20} color="#3b82f6" />
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" color="gray.800" fontWeight="semibold">
                                    Freeze physical card
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {primaryCard?.card_number?.slice(-4) ? `Card ending in ${primaryCard.card_number.slice(-4)}` : 'Primary card'}
                                  </Text>
                                </VStack>
                              </HStack>
                              <Switch
                                isChecked={isCardFrozen}
                                onChange={(e) => handleCardToggle(primaryCard?.id, 'is_frozen', e.target.checked)}
                                colorScheme="brand"
                                isDisabled={!primaryCard || updatingCard === primaryCard?.id}
                              />
                            </Flex>
                          </CardBody>
                        </Card>

                        <Card bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Wifi size={20} color="#ec4899" />
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" color="gray.800" fontWeight="semibold">
                                    Contactless payments
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {primaryCard?.card_number?.slice(-4) ? `Card ending in ${primaryCard.card_number.slice(-4)}` : 'Primary card'}
                                  </Text>
                                </VStack>
                              </HStack>
                              <Switch
                                isChecked={isContactlessEnabled}
                                onChange={(e) => handleCardToggle(primaryCard?.id, 'is_contactless_enabled', e.target.checked)}
                                colorScheme="brand"
                                isDisabled={!primaryCard || updatingCard === primaryCard?.id}
                              />
                            </Flex>
                          </CardBody>
                        </Card>

                        <Card bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <CreditCard size={20} color="#9c27b0" />
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" color="gray.800" fontWeight="semibold">
                                    Magstripe payments
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {primaryCard?.card_number?.slice(-4) ? `Card ending in ${primaryCard.card_number.slice(-4)}` : 'Primary card'}
                                  </Text>
                                </VStack>
                              </HStack>
                              <Switch
                                isChecked={isMagstripeEnabled}
                                onChange={(e) => handleCardToggle(primaryCard?.id, 'is_magstripe_enabled', e.target.checked)}
                                colorScheme="brand"
                                isDisabled={!primaryCard || updatingCard === primaryCard?.id}
                              />
                            </Flex>
                          </CardBody>
                        </Card>

                        <Card bg={cardBg} borderRadius="md" cursor="pointer" onClick={onQROpen} _hover={{ bg: 'gray.50' }}>
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <QrCode size={20} color="#f97316" />
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" color="gray.800" fontWeight="semibold">
                                    Payment QR Code
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    Show QR code to receive payments
                                  </Text>
                                </VStack>
                              </HStack>
                              <ChevronRight size={20} color="#9ca3af" />
                            </Flex>
                          </CardBody>
                        </Card>
                      </VStack>
                    </Box>

                    {cards.length > 1 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                          All Cards
                        </Text>
                        <VStack spacing={0} align="stretch" position="relative">
                          {cards.map((card, index) => {
                            const isAmex = isAmexCard(card.card_type);
                            const isSelected = selectedCardId === card.id;
                            // Calculate z-index: selected card is highest, then by original index
                            const zIndex = isSelected ? 1000 : cards.length - index;
                            // Calculate transform: selected card is full size and slightly elevated
                            const transform = isSelected 
                              ? 'scale(1) translateY(-10px)' 
                              : index === 0 && !selectedCardId 
                                ? 'scale(1)' 
                                : 'scale(0.95)';
                            // Calculate margin: cards stack halfway (about 50% overlap)
                            const marginTop = index === 0 ? 0 : isSelected ? 0 : '-120px';
                            // Calculate opacity: selected card is fully visible, others slightly dimmed
                            const opacity = card.is_frozen ? 0.6 : isSelected ? 1 : 0.9;
                            
                            return (
                              <Card
                                key={card.id}
                                bgGradient={!isAmex && card.card_type !== 'VISA' && card.card_type !== 'MASTERCARD' ? getCardGradient(card.gradient_type || 'purple', card.card_type) : undefined}
                                bg={
                                  isAmex ? undefined :
                                  card.card_type === 'VISA' ? '#1434CB' :
                                  card.card_type === 'MASTERCARD' ? '#EB001B' :
                                  undefined
                                }
                                css={{
                                  ...(isAmex && {
                                    background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #2C3E50 100%) !important',
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px) !important',
                                  }),
                                  transition: 'all 0.3s ease-in-out',
                                  cursor: 'pointer',
                                }}
                                border={isAmex ? '2px solid rgba(255,255,255,0.2)' : 'none'}
                                color="white"
                                borderRadius="xl"
                                overflow="hidden"
                                position="relative"
                                minH={isSelected ? "240px" : "200px"}
                                boxShadow={isSelected ? "2xl" : "lg"}
                                transform={transform}
                                zIndex={zIndex}
                                mt={marginTop}
                                opacity={opacity}
                                onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                                _hover={{
                                  transform: isSelected ? 'scale(1) translateY(-10px)' : 'scale(0.98) translateY(-5px)',
                                  boxShadow: 'xl',
                                }}
                              >
                                <CardBody p={6} position="relative">
                                  {/* Amex Card Design */}
                                  {isAmex ? (
                                    <>
                                      {/* Decorative Top Border */}
                                      <Box position="absolute" top={0} left={0} right={0} h="6px" overflow="hidden">
                                        <Flex justify="space-between" align="center" h="100%">
                                          {[...Array(20)].map((_, i) => (
                                            <Box key={i} w="6px" h="100%" bg="white" opacity={0.15} transform="rotate(45deg)" />
                                          ))}
                                        </Flex>
                                      </Box>
                                      
                                      {/* Decorative Bottom Border */}
                                      <Box position="absolute" bottom={0} left={0} right={0} h="6px" overflow="hidden">
                                        <Flex justify="space-between" align="center" h="100%">
                                          {[...Array(20)].map((_, i) => (
                                            <Box key={i} w="6px" h="100%" bg="white" opacity={0.15} transform="rotate(45deg)" />
                                          ))}
                                        </Flex>
                                      </Box>
                                      
                                      {/* Background Pattern */}
                                      <Box 
                                        position="absolute" 
                                        top={0} 
                                        left={0} 
                                        right={0} 
                                        bottom={0} 
                                        opacity={0.05}
                                        fontSize="xs"
                                        color="white"
                                        overflow="hidden"
                                        pointerEvents="none"
                                      >
                                        <Text 
                                          position="absolute"
                                          top="50%"
                                          left="50%"
                                          transform="translate(-50%, -50%) rotate(-45deg)"
                                          whiteSpace="nowrap"
                                          letterSpacing="widest"
                                        >
                                          AMERICAN EXPRESS WORLD SERVICE • AMERICAN EXPRESS WORLD SERVICE
                                        </Text>
                                      </Box>
                                      
                                      {/* Chip - Top Left */}
                                      <Box position="absolute" top={3} left={3}>
                                        <Box
                                          w="36px"
                                          h="28px"
                                          bg="linear-gradient(135deg, #C0C0C0 0%, #808080 100%)"
                                          borderRadius="md"
                                          border="1px solid rgba(255,255,255,0.3)"
                                          position="relative"
                                          overflow="hidden"
                                        >
                                          <Box
                                            position="absolute"
                                            top="2px"
                                            left="2px"
                                            right="2px"
                                            bottom="2px"
                                            border="1px solid rgba(0,0,0,0.2)"
                                            borderRadius="sm"
                                          />
                                          <Box
                                            position="absolute"
                                            top="5px"
                                            left="5px"
                                            w="5px"
                                            h="5px"
                                            bg="rgba(0,0,0,0.3)"
                                            borderRadius="sm"
                                          />
                                        </Box>
                                      </Box>
                                      
                                      {/* AMERICAN EXPRESS - Centered Top */}
                                      <VStack spacing={0} mt={6} mb={2}>
                                        <Text 
                                          fontSize="lg" 
                                          fontWeight="bold" 
                                          letterSpacing="widest"
                                          color="white"
                                          textAlign="center"
                                        >
                                          AMERICAN EXPRESS
                                        </Text>
                                        <Text 
                                          fontSize="xs" 
                                          fontWeight="medium" 
                                          letterSpacing="wide"
                                          color="white"
                                          opacity={0.9}
                                          mt={1}
                                        >
                                          PLATINUM
                                        </Text>
                                      </VStack>
                                      
                                      {/* Centurion Logo - Center Right */}
                                      <Box position="absolute" top={10} right={4}>
                                        <Box
                                          w="50px"
                                          h="50px"
                                          borderRadius="full"
                                          bg="white"
                                          opacity={0.95}
                                          display="flex"
                                          alignItems="center"
                                          justifyContent="center"
                                          boxShadow="0 2px 8px rgba(0,0,0,0.2)"
                                        >
                                          <Box
                                            w="42px"
                                            h="42px"
                                            borderRadius="full"
                                            bg="linear-gradient(135deg, #006FCF 0%, #003087 100%)"
                                            position="relative"
                                            overflow="hidden"
                                          >
                                            <Box
                                              position="absolute"
                                              top="6px"
                                              right="6px"
                                              w="16px"
                                              h="24px"
                                              bg="white"
                                              borderRadius="full"
                                              transform="rotate(-20deg)"
                                            />
                                            <Box
                                              position="absolute"
                                              top="10px"
                                              right="10px"
                                              w="10px"
                                              h="16px"
                                              bg="#006FCF"
                                              borderRadius="full"
                                            />
                                          </Box>
                                        </Box>
                                        {/* MEMBER SINCE */}
                                        <VStack spacing={0} mt={1} align="center">
                                          <Text fontSize="xs" color="white" opacity={0.8} letterSpacing="wide">
                                            MEMBER
                                          </Text>
                                          <Text fontSize="xs" color="white" opacity={0.8} letterSpacing="wide">
                                            SINCE
                                          </Text>
                                          <Text fontSize="sm" fontWeight="bold" color="white" mt={0.5}>
                                            {new Date(card.created_at).getFullYear().toString().slice(-2) || new Date().getFullYear().toString().slice(-2)}
                                          </Text>
                                        </VStack>
                                      </Box>
                                      
                                      {/* Card Number - Between center and right */}
                                      <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" mt={-3}>
                                        <Text 
                                          fontSize={isSelected ? "xl" : "lg"}
                                          fontWeight="bold" 
                                          letterSpacing="widest"
                                          color="white"
                                          fontFamily="monospace"
                                        >
                                          {isSelected && card.card_number
                                            ? formatCardNumber(card.card_number, card.card_type)
                                            : card.card_number?.slice(-4) 
                                              ? `•••• •••••• ${card.card_number.slice(-4)}`
                                              : formatCardNumberDisplay(card.card_number, card.card_type)}
                                        </Text>
                                      </Box>
                                      
                                      {/* Cardholder Name - Bottom Left */}
                                      <Box position="absolute" bottom={isSelected ? 8 : 4} left={4}>
                                        <Text 
                                          fontSize="xs" 
                                          fontWeight="semibold" 
                                          color="white"
                                          letterSpacing="wide"
                                          textTransform="uppercase"
                                        >
                                          {getCardholderName(card).toUpperCase()}
                                        </Text>
                                      </Box>
                                      
                                      {/* Valid Thru - Bottom Right */}
                                      <Box position="absolute" bottom={isSelected ? 8 : 4} right={4}>
                                        <HStack spacing={1} align="flex-end">
                                          <Text fontSize="xs" color="white" opacity={0.8}>
                                            VALID
                                          </Text>
                                          <Text fontSize="xs" color="white" opacity={0.8}>
                                            THRU
                                          </Text>
                                          <Text fontSize="sm" fontWeight="semibold" color="white">
                                            {card.expiry_date}
                                          </Text>
                                        </HStack>
                                      </Box>
                                      
                                      {/* Copyright - Bottom Right Corner */}
                                      <Box position="absolute" bottom={1} right={1}>
                                        <Text fontSize="xs" color="white" opacity={0.5}>
                                          © AMEX
                                        </Text>
                                      </Box>
                                      
                                      {/* Full Card Details - Only shown when selected */}
                                      {isSelected && (
                                        <VStack spacing={2} mt={8} align="flex-start" px={4}>
                                          <Divider borderColor="white" opacity={0.3} />
                                          <HStack spacing={4} w="full" justify="space-between">
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Card Balance
                                              </Text>
                                              <Text fontSize="lg" fontWeight="bold" color="white">
                                                {formatCurrency(card.balance || 0)}
                                              </Text>
                                            </VStack>
                                            <VStack align="flex-end" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Status
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_frozen ? "red" : "green"} 
                                                fontSize="xs"
                                              >
                                                {card.is_frozen ? "Frozen" : "Active"}
                                              </Badge>
                                            </VStack>
                                          </HStack>
                                          <HStack spacing={4} w="full" justify="space-between" mt={2}>
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Contactless
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_contactless_enabled ? "green" : "gray"} 
                                                fontSize="xs"
                                              >
                                                {card.is_contactless_enabled ? "Enabled" : "Disabled"}
                                              </Badge>
                                            </VStack>
                                            <VStack align="flex-end" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Magstripe
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_magstripe_enabled ? "green" : "gray"} 
                                                fontSize="xs"
                                              >
                                                {card.is_magstripe_enabled ? "Enabled" : "Disabled"}
                                              </Badge>
                                            </VStack>
                                          </HStack>
                                          <Button
                                            size="sm"
                                            colorScheme="red"
                                            variant="outline"
                                            leftIcon={<Trash2 size={16} />}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCardClick(card.id);
                                            }}
                                            isLoading={updatingCard === card.id}
                                            mt={4}
                                            w="full"
                                          >
                                            Remove Card
                                          </Button>
                                        </VStack>
                                      )}
                                      
                                      {card.is_frozen && !isSelected && (
                                        <Badge colorScheme="blue" mt={2} position="absolute" top={2} right={2}>
                                          FROZEN
                                        </Badge>
                                      )}
                                    </>
                                  ) : card.card_type === 'VISA' ? (
                                    <>
                                      <Flex justify="space-between" align="flex-start" mb={4}>
                                        <Box
                                          w="44px"
                                          h="32px"
                                          bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                                          borderRadius="md"
                                          border="2px solid rgba(255,255,255,0.3)"
                                          position="relative"
                                          overflow="hidden"
                                        >
                                          <Box
                                            position="absolute"
                                            top="2px"
                                            left="2px"
                                            right="2px"
                                            bottom="2px"
                                            border="1px solid rgba(0,0,0,0.2)"
                                            borderRadius="sm"
                                          />
                                          <Box
                                            position="absolute"
                                            top="6px"
                                            left="6px"
                                            w="6px"
                                            h="6px"
                                            bg="rgba(0,0,0,0.3)"
                                            borderRadius="sm"
                                          />
                                        </Box>
                                        <Text fontSize="2xl" fontWeight="bold" letterSpacing="wide" color="white">
                                          VISA
                                        </Text>
                                      </Flex>
                                      <VStack spacing={2} mb={6} align="flex-start">
                                        <Text 
                                          fontSize={isSelected ? "xl" : "lg"}
                                          fontWeight="bold" 
                                          letterSpacing="wide"
                                          color="white"
                                          fontFamily="monospace"
                                        >
                                          {isSelected && card.card_number
                                            ? formatCardNumber(card.card_number, card.card_type)
                                            : card.card_number?.slice(-4) 
                                              ? `•••• •••• •••• ${card.card_number.slice(-4)}`
                                              : formatCardNumberDisplay(card.card_number, card.card_type)}
                                        </Text>
                                      </VStack>
                                      <Flex justify="space-between" align="flex-end" mt="auto">
                                        <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                                          {getCardholderName(card)}
                                        </Text>
                                        <VStack align="flex-end" spacing={0}>
                                          <Text fontSize="xs" opacity={0.8}>
                                            VALID THRU
                                          </Text>
                                          <Text fontSize="sm" fontWeight="semibold">
                                            {card.expiry_date}
                                          </Text>
                                        </VStack>
                                      </Flex>
                                      
                                      {/* Full Card Details - Only shown when selected */}
                                      {isSelected && (
                                        <VStack spacing={2} mt={4} align="flex-start" px={0}>
                                          <Divider borderColor="white" opacity={0.3} />
                                          <HStack spacing={4} w="full" justify="space-between">
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Card Balance
                                              </Text>
                                              <Text fontSize="lg" fontWeight="bold" color="white">
                                                {formatCurrency(card.balance || 0)}
                                              </Text>
                                            </VStack>
                                            <VStack align="flex-end" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Status
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_frozen ? "red" : "green"} 
                                                fontSize="xs"
                                              >
                                                {card.is_frozen ? "Frozen" : "Active"}
                                              </Badge>
                                            </VStack>
                                          </HStack>
                                          <HStack spacing={4} w="full" justify="space-between" mt={2}>
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Contactless
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_contactless_enabled ? "green" : "gray"} 
                                                fontSize="xs"
                                              >
                                                {card.is_contactless_enabled ? "Enabled" : "Disabled"}
                                              </Badge>
                                            </VStack>
                                            <VStack align="flex-end" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Magstripe
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_magstripe_enabled ? "green" : "gray"} 
                                                fontSize="xs"
                                              >
                                                {card.is_magstripe_enabled ? "Enabled" : "Disabled"}
                                              </Badge>
                                            </VStack>
                                          </HStack>
                                          <Button
                                            size="sm"
                                            colorScheme="red"
                                            variant="outline"
                                            leftIcon={<Trash2 size={16} />}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCardClick(card.id);
                                            }}
                                            isLoading={updatingCard === card.id}
                                            mt={4}
                                            w="full"
                                          >
                                            Remove Card
                                          </Button>
                                        </VStack>
                                      )}
                                      
                                      {card.is_contactless_enabled && !isSelected && (
                                        <Box position="absolute" bottom={4} right={6}>
                                          <Wifi size={18} opacity={0.6} />
                                        </Box>
                                      )}
                                      {card.is_frozen && !isSelected && (
                                        <Badge colorScheme="blue" mt={2} position="absolute" top={4} right={4}>
                                          FROZEN
                                        </Badge>
                                      )}
                                    </>
                                  ) : card.card_type === 'MASTERCARD' ? (
                                    <>
                                      <Flex justify="space-between" align="flex-start" mb={4}>
                                        <Box
                                          w="44px"
                                          h="32px"
                                          bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                                          borderRadius="md"
                                          border="2px solid rgba(255,255,255,0.3)"
                                          position="relative"
                                          overflow="hidden"
                                        >
                                          <Box
                                            position="absolute"
                                            top="2px"
                                            left="2px"
                                            right="2px"
                                            bottom="2px"
                                            border="1px solid rgba(0,0,0,0.2)"
                                            borderRadius="sm"
                                          />
                                          <Box
                                            position="absolute"
                                            top="6px"
                                            left="6px"
                                            w="6px"
                                            h="6px"
                                            bg="rgba(0,0,0,0.3)"
                                            borderRadius="sm"
                                          />
                                        </Box>
                                        <HStack spacing={0}>
                                          <Box
                                            w="28px"
                                            h="28px"
                                            borderRadius="full"
                                            bg="#EB001B"
                                            border="2px solid white"
                                          />
                                          <Box
                                            w="28px"
                                            h="28px"
                                            borderRadius="full"
                                            bg="#F79E1B"
                                            border="2px solid white"
                                            ml="-14px"
                                            opacity={0.9}
                                          />
                                        </HStack>
                                      </Flex>
                                      <VStack spacing={2} mb={6} align="flex-start">
                                        <Text 
                                          fontSize={isSelected ? "xl" : "lg"}
                                          fontWeight="bold" 
                                          letterSpacing="wide"
                                          color="white"
                                          fontFamily="monospace"
                                        >
                                          {isSelected && card.card_number
                                            ? formatCardNumber(card.card_number, card.card_type)
                                            : card.card_number?.slice(-4) 
                                              ? `•••• •••• •••• ${card.card_number.slice(-4)}`
                                              : formatCardNumberDisplay(card.card_number, card.card_type)}
                                        </Text>
                                      </VStack>
                                      <Flex justify="space-between" align="flex-end" mt="auto">
                                        <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                                          {getCardholderName(card)}
                                        </Text>
                                        <VStack align="flex-end" spacing={0}>
                                          <Text fontSize="xs" opacity={0.8}>
                                            VALID THRU
                                          </Text>
                                          <Text fontSize="sm" fontWeight="semibold">
                                            {card.expiry_date}
                                          </Text>
                                        </VStack>
                                      </Flex>
                                      
                                      {/* Full Card Details - Only shown when selected */}
                                      {isSelected && (
                                        <VStack spacing={2} mt={4} align="flex-start" px={0}>
                                          <Divider borderColor="white" opacity={0.3} />
                                          <HStack spacing={4} w="full" justify="space-between">
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Card Balance
                                              </Text>
                                              <Text fontSize="lg" fontWeight="bold" color="white">
                                                {formatCurrency(card.balance || 0)}
                                              </Text>
                                            </VStack>
                                            <VStack align="flex-end" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Status
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_frozen ? "red" : "green"} 
                                                fontSize="xs"
                                              >
                                                {card.is_frozen ? "Frozen" : "Active"}
                                              </Badge>
                                            </VStack>
                                          </HStack>
                                          <HStack spacing={4} w="full" justify="space-between" mt={2}>
                                            <VStack align="flex-start" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Contactless
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_contactless_enabled ? "green" : "gray"} 
                                                fontSize="xs"
                                              >
                                                {card.is_contactless_enabled ? "Enabled" : "Disabled"}
                                              </Badge>
                                            </VStack>
                                            <VStack align="flex-end" spacing={1}>
                                              <Text fontSize="xs" color="white" opacity={0.7}>
                                                Magstripe
                                              </Text>
                                              <Badge 
                                                colorScheme={card.is_magstripe_enabled ? "green" : "gray"} 
                                                fontSize="xs"
                                              >
                                                {card.is_magstripe_enabled ? "Enabled" : "Disabled"}
                                              </Badge>
                                            </VStack>
                                          </HStack>
                                          <Button
                                            size="sm"
                                            colorScheme="red"
                                            variant="outline"
                                            leftIcon={<Trash2 size={16} />}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteCardClick(card.id);
                                            }}
                                            isLoading={updatingCard === card.id}
                                            mt={4}
                                            w="full"
                                          >
                                            Remove Card
                                          </Button>
                                        </VStack>
                                      )}
                                      
                                      {card.is_contactless_enabled && !isSelected && (
                                        <Box position="absolute" bottom={4} right={6}>
                                          <Wifi size={18} opacity={0.6} />
                                        </Box>
                                      )}
                                      {card.is_frozen && !isSelected && (
                                        <Badge colorScheme="blue" mt={2} position="absolute" top={4} right={4}>
                                          FROZEN
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Flex justify="space-between" mb={4}>
                                        <CreditCard size={24} />
                                        <HStack spacing={2}>
                                          {card.is_frozen && (
                                            <Snowflake size={20} />
                                          )}
                                          {card.is_contactless_enabled && (
                                            <Wifi size={24} />
                                          )}
                                        </HStack>
                                      </Flex>
                                      <VStack align="flex-start" spacing={2} mt={8}>
                                        <Text fontSize="lg" fontWeight="semibold" letterSpacing="wide">
                                          {card.card_number?.slice(-4) 
                                            ? `•••• •••• •••• ${card.card_number.slice(-4)}`
                                            : formatCardNumberDisplay(card.card_number, card.card_type)}
                                        </Text>
                                        <Text fontSize="sm" opacity={0.9}>
                                          Card Balance: {formatCurrency(card.balance || 0)}
                                        </Text>
                                        {card.card_type && !isAmex && !isCreditCard(card.card_type) && (
                                          <Text fontSize="md" fontWeight="semibold" mt={2}>
                                            {card.card_type} CARD
                                          </Text>
                                        )}
                                        {(card.card_type === 'VISA' || card.card_type === 'MASTERCARD') && (
                                          <Text fontSize="md" fontWeight="semibold" mt={2}>
                                            CREDIT CARD
                                          </Text>
                                        )}
                                        <HStack spacing={4} mt={4} w="full" justify="space-between">
                                          <Text fontSize="sm">
                                            {getCardholderName(card)}
                                          </Text>
                                          <Text fontSize="sm">
                                            {card.expiry_date}
                                          </Text>
                                        </HStack>
                                        {card.is_frozen && (
                                          <Badge colorScheme="blue" mt={2}>
                                            FROZEN
                                          </Badge>
                                        )}
                                        <Button
                                          size="sm"
                                          colorScheme="red"
                                          variant="outline"
                                          leftIcon={<Trash2 size={16} />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCard(card.id);
                                          }}
                                          isLoading={updatingCard === card.id}
                                          mt={4}
                                          w="full"
                                        >
                                          Remove Card
                                        </Button>
                                      </VStack>
                                    </>
                                  )}
                                </CardBody>
                              </Card>
                            );
                          })}
                        </VStack>
                      </Box>
                    )}

                    {cards.length === 1 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                          Your Card
                        </Text>
                        {(() => {
                          const isAmex = isAmexCard(primaryCard?.card_type);
                          return (
                            <Card
                              bgGradient={!isAmex && primaryCard?.card_type !== 'VISA' && primaryCard?.card_type !== 'MASTERCARD' ? getCardGradient(primaryCard?.gradient_type || 'purple', primaryCard?.card_type) : undefined}
                              bg={
                                isAmex ? undefined :
                                primaryCard?.card_type === 'VISA' ? '#1434CB' :
                                primaryCard?.card_type === 'MASTERCARD' ? '#EB001B' :
                                undefined
                              }
                              css={{
                                ...(isAmex && {
                                  background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #2C3E50 100%) !important',
                                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px) !important',
                                })
                              }}
                              border={isAmex ? '2px solid rgba(255,255,255,0.2)' : 'none'}
                              color="white"
                              borderRadius="xl"
                              overflow="hidden"
                              position="relative"
                              minH="200px"
                              boxShadow="lg"
                              opacity={primaryCard?.is_frozen ? 0.6 : 1}
                            >
                              <CardBody p={6} position="relative">
                                {/* Amex Card Design */}
                                {isAmex ? (
                                  <>
                                    <Flex justify="space-between" align="flex-start" mb={6}>
                                      <Box>
                                        <Text fontSize="2xl" fontWeight="bold" letterSpacing="wider" color="white">
                                          AMERICAN
                                        </Text>
                                        <Text fontSize="2xl" fontWeight="bold" letterSpacing="wider" color="white" mt={-1}>
                                          EXPRESS
                                        </Text>
                                      </Box>
                                      <Box
                                        w="36px"
                                        h="36px"
                                        borderRadius="full"
                                        bg="white"
                                        opacity={0.2}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                      >
                                        <Text fontSize="xl" color="white" fontWeight="bold">•</Text>
                                      </Box>
                                    </Flex>
                                    <VStack spacing={1} mb={6}>
                                      <Text 
                                        fontSize="xl" 
                                        fontWeight="bold" 
                                        letterSpacing="widest"
                                        color="white"
                                        textAlign="center"
                                        fontFamily="monospace"
                                      >
                                        {primaryCard?.card_number?.slice(-4) 
                                          ? `•••• •••••• ${primaryCard.card_number.slice(-4)}`
                                          : formatCardNumberDisplay(primaryCard?.card_number, primaryCard?.card_type)}
                                      </Text>
                                    </VStack>
                                    <Flex justify="space-between" align="flex-end" mt="auto">
                                      <VStack align="flex-start" spacing={0}>
                                        <Text fontSize="xs" opacity={0.7} mb={1}>
                                          CARDMEMBER SINCE
                                        </Text>
                                        <Text fontSize="sm" fontWeight="semibold">
                                          {new Date(primaryCard?.created_at).getFullYear().toString().slice(-2) || new Date().getFullYear().toString().slice(-2)}
                                        </Text>
                                      </VStack>
                                      <VStack align="flex-end" spacing={0}>
                                        <Text fontSize="xs" opacity={0.7} mb={1}>
                                          {getCardholderName(primaryCard).toUpperCase()}
                                        </Text>
                                        <HStack spacing={2}>
                                          <Text fontSize="xs" opacity={0.7}>
                                            VALID THRU
                                          </Text>
                                          <Text fontSize="sm" fontWeight="semibold">
                                            {primaryCard?.expiry_date}
                                          </Text>
                                        </HStack>
                                      </VStack>
                                    </Flex>
                                    {primaryCard?.is_frozen && (
                                      <Badge colorScheme="blue" mt={2} position="absolute" top={4} right={4}>
                                        FROZEN
                                      </Badge>
                                    )}
                                  </>
                                ) : primaryCard?.card_type === 'VISA' ? (
                                  <>
                                    <Flex justify="space-between" align="flex-start" mb={4}>
                                      <Box
                                        w="44px"
                                        h="32px"
                                        bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                                        borderRadius="md"
                                        border="2px solid rgba(255,255,255,0.3)"
                                        position="relative"
                                        overflow="hidden"
                                      >
                                        <Box
                                          position="absolute"
                                          top="2px"
                                          left="2px"
                                          right="2px"
                                          bottom="2px"
                                          border="1px solid rgba(0,0,0,0.2)"
                                          borderRadius="sm"
                                        />
                                        <Box
                                          position="absolute"
                                          top="6px"
                                          left="6px"
                                          w="6px"
                                          h="6px"
                                          bg="rgba(0,0,0,0.3)"
                                          borderRadius="sm"
                                        />
                                      </Box>
                                      <Text fontSize="2xl" fontWeight="bold" letterSpacing="wide" color="white">
                                        VISA
                                      </Text>
                                    </Flex>
                                    <VStack spacing={2} mb={6} align="flex-start">
                                      <Text 
                                        fontSize="lg" 
                                        fontWeight="bold" 
                                        letterSpacing="wide"
                                        color="white"
                                        fontFamily="monospace"
                                      >
                                        {primaryCard?.card_number?.slice(-4) 
                                          ? `•••• •••• •••• ${primaryCard.card_number.slice(-4)}`
                                          : formatCardNumberDisplay(primaryCard?.card_number, primaryCard?.card_type)}
                                      </Text>
                                    </VStack>
                                    <Flex justify="space-between" align="flex-end" mt="auto">
                                      <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                                        {getCardholderName(primaryCard)}
                                      </Text>
                                      <VStack align="flex-end" spacing={0}>
                                        <Text fontSize="xs" opacity={0.8}>
                                          VALID THRU
                                        </Text>
                                        <Text fontSize="sm" fontWeight="semibold">
                                          {primaryCard?.expiry_date}
                                        </Text>
                                      </VStack>
                                    </Flex>
                                    {primaryCard?.is_contactless_enabled && (
                                      <Box position="absolute" bottom={4} right={6}>
                                        <Wifi size={18} opacity={0.6} />
                                      </Box>
                                    )}
                                    {primaryCard?.is_frozen && (
                                      <Badge colorScheme="blue" mt={2} position="absolute" top={4} right={4}>
                                        FROZEN
                                      </Badge>
                                    )}
                                  </>
                                ) : primaryCard?.card_type === 'MASTERCARD' ? (
                                  <>
                                    <Flex justify="space-between" align="flex-start" mb={4}>
                                      <Box
                                        w="44px"
                                        h="32px"
                                        bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                                        borderRadius="md"
                                        border="2px solid rgba(255,255,255,0.3)"
                                        position="relative"
                                        overflow="hidden"
                                      >
                                        <Box
                                          position="absolute"
                                          top="2px"
                                          left="2px"
                                          right="2px"
                                          bottom="2px"
                                          border="1px solid rgba(0,0,0,0.2)"
                                          borderRadius="sm"
                                        />
                                        <Box
                                          position="absolute"
                                          top="6px"
                                          left="6px"
                                          w="6px"
                                          h="6px"
                                          bg="rgba(0,0,0,0.3)"
                                          borderRadius="sm"
                                        />
                                      </Box>
                                      <HStack spacing={0}>
                                        <Box
                                          w="28px"
                                          h="28px"
                                          borderRadius="full"
                                          bg="#EB001B"
                                          border="2px solid white"
                                        />
                                        <Box
                                          w="28px"
                                          h="28px"
                                          borderRadius="full"
                                          bg="#F79E1B"
                                          border="2px solid white"
                                          ml="-14px"
                                          opacity={0.9}
                                        />
                                      </HStack>
                                    </Flex>
                                    <VStack spacing={2} mb={6} align="flex-start">
                                      <Text 
                                        fontSize="lg" 
                                        fontWeight="bold" 
                                        letterSpacing="wide"
                                        color="white"
                                        fontFamily="monospace"
                                      >
                                        {primaryCard?.card_number?.slice(-4) 
                                          ? `•••• •••• •••• ${primaryCard.card_number.slice(-4)}`
                                          : formatCardNumberDisplay(primaryCard?.card_number, primaryCard?.card_type)}
                                      </Text>
                                    </VStack>
                                    <Flex justify="space-between" align="flex-end" mt="auto">
                                      <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                                        {getCardholderName(primaryCard)}
                                      </Text>
                                      <VStack align="flex-end" spacing={0}>
                                        <Text fontSize="xs" opacity={0.8}>
                                          VALID THRU
                                        </Text>
                                        <Text fontSize="sm" fontWeight="semibold">
                                          {primaryCard?.expiry_date}
                                        </Text>
                                      </VStack>
                                    </Flex>
                                    {primaryCard?.is_contactless_enabled && (
                                      <Box position="absolute" bottom={4} right={6}>
                                        <Wifi size={18} opacity={0.6} />
                                      </Box>
                                    )}
                                    {primaryCard?.is_frozen && (
                                      <Badge colorScheme="blue" mt={2} position="absolute" top={4} right={4}>
                                        FROZEN
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Flex justify="space-between" mb={4}>
                                      <CreditCard size={24} />
                                      <HStack spacing={2}>
                                        {primaryCard?.is_frozen && (
                                          <Snowflake size={20} />
                                        )}
                                        {primaryCard?.is_contactless_enabled && (
                                          <Wifi size={24} />
                                        )}
                                      </HStack>
                                    </Flex>
                                    <VStack align="flex-start" spacing={2} mt={8}>
                                      <Text fontSize="lg" fontWeight="semibold" letterSpacing="wide">
                                        {primaryCard?.card_number?.slice(-4) 
                                          ? `•••• •••• •••• ${primaryCard.card_number.slice(-4)}`
                                          : formatCardNumberDisplay(primaryCard?.card_number, primaryCard?.card_type)}
                                      </Text>
                                      <Text fontSize="sm" opacity={0.9}>
                                        Card Balance: {formatCurrency(primaryCard?.balance || 0)}
                                      </Text>
                                      {primaryCard?.card_type && !isAmex && !isCreditCard(primaryCard.card_type) && (
                                        <Text fontSize="md" fontWeight="semibold" mt={2}>
                                          {primaryCard.card_type} CARD
                                        </Text>
                                      )}
                                      {(primaryCard?.card_type === 'VISA' || primaryCard?.card_type === 'MASTERCARD') && (
                                        <Text fontSize="md" fontWeight="semibold" mt={2}>
                                          CREDIT CARD
                                        </Text>
                                      )}
                                      <HStack spacing={4} mt={4} w="full" justify="space-between">
                                        <Text fontSize="sm">
                                          {primaryCard?.card_holder_name}
                                        </Text>
                                        <Text fontSize="sm">
                                          {primaryCard?.expiry_date}
                                        </Text>
                                      </HStack>
                                      {primaryCard?.is_frozen && (
                                        <Badge colorScheme="blue" mt={2}>
                                          FROZEN
                                        </Badge>
                                      )}
                                    </VStack>
                                  </>
                                )}
                              </CardBody>
                            </Card>
                          );
                        })()}
                      </Box>
                    )}
                  </>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Security Modal */}
      <Modal isOpen={isSecurityOpen} onClose={onSecurityClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Security Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Card bg="gray.50">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                      Account Security
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Manage your account security settings and preferences
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <VStack spacing={3} align="stretch">
                <Card bg="white">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        Two-Factor Authentication
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Add an extra layer of security to your account
                      </Text>
                      <Button size="sm" colorScheme="purple" variant="outline" mt={2}>
                        Enable 2FA
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="white">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        Change PIN
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        Update your PIN for secure access
                      </Text>
                      <Button size="sm" colorScheme="purple" variant="outline" mt={2}>
                        Change PIN
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="white">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        Security Questions
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {profile?.security_question_1 ? 'Update your security questions' : 'Set up security questions for account recovery'}
                      </Text>
                      <Button size="sm" colorScheme="purple" variant="outline" mt={2}>
                        {profile?.security_question_1 ? 'Update Questions' : 'Set Up Questions'}
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="white">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        Login Activity
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        View recent login attempts and sessions
                      </Text>
                      <Button size="sm" colorScheme="purple" variant="outline" mt={2}>
                        View Activity
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onSecurityClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Language Selection Modal */}
      <Modal isOpen={isLanguageOpen} onClose={onLanguageClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Language</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={2} align="stretch">
              {languages.map((lang) => (
                <Card
                  key={lang.code}
                  bg={language === lang.code ? 'purple.50' : 'white'}
                  border={language === lang.code ? '2px solid' : '1px solid'}
                  borderColor={language === lang.code ? 'purple.500' : 'gray.200'}
                  cursor="pointer"
                  onClick={() => handleLanguageChange(lang.code)}
                  _hover={{ bg: language === lang.code ? 'purple.50' : 'gray.50' }}
                >
                  <CardBody py={3}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight={language === lang.code ? 'semibold' : 'normal'}>
                        {lang.name}
                      </Text>
                      {language === lang.code && (
                        <Text fontSize="sm" color="purple.600">✓</Text>
                      )}
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onLanguageClose}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={isQROpen} onClose={onQROClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Payment QR Code</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Show this QR code to receive payments
              </Text>
              <Box display="flex" justifyContent="center" p={4} bg="white" borderRadius="md">
                {generateQRCode() ? (
                  <Image
                    src={generateQRCode()}
                    alt="Payment QR Code"
                    maxW="300px"
                    maxH="300px"
                  />
                ) : (
                  <Spinner size="xl" />
                )}
              </Box>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                {profile?.first_name || profile?.email || 'User'} • {profile?.email}
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onQROClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Google Pay Modal */}
      <Modal isOpen={isGooglePayOpen} onClose={onGooglePayClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Google Pay Setup</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Card bg="gray.50">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                      Add Card to Google Pay
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Link your NovaBank card to Google Pay for easy payments
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              {cards.length > 0 ? (
                <VStack spacing={2} align="stretch">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                    Select a card to add:
                  </Text>
                  {cards.map((card) => (
                    <Card key={card.id} bg="white" cursor="pointer" _hover={{ bg: 'gray.50' }}>
                      <CardBody>
                        <HStack justify="space-between">
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                              {getCardholderName(card)}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {card.card_number?.slice(-4) ? `**** **** **** ${card.card_number.slice(-4)}` : card.card_number}
                            </Text>
                          </VStack>
                          <HStack spacing={2}>
                            <Button size="sm" colorScheme="purple" variant="outline">
                              Add
                            </Button>
                            <IconButton
                              icon={<Trash2 size={16} />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCardClick(card.id);
                              }}
                              isLoading={updatingCard === card.id}
                              aria-label="Remove card"
                            />
                          </HStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              ) : (
                <VStack spacing={3} py={4}>
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    No cards available. Please add a card first.
                  </Text>
                  <Button size="sm" colorScheme="purple" onClick={() => {
                    onGooglePayClose();
                    onAddCardOpen();
                  }}>
                    Add Card
                  </Button>
                </VStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onGooglePayClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Card Modal */}
      <Modal isOpen={isAddCardOpen} onClose={onAddCardClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Card</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Card Preview */}
              <Card
                bgGradient={!isAmexCard(newCard.card_type) && newCard.card_type !== 'VISA' && newCard.card_type !== 'MASTERCARD' ? getCardGradient(newCard.gradient_type, newCard.card_type) : undefined}
                color="white"
                borderRadius="xl"
                overflow="hidden"
                position="relative"
                minH="220px"
                boxShadow="xl"
                bg={
                  isAmexCard(newCard.card_type) ? undefined :
                  newCard.card_type === 'VISA' ? '#1434CB' :
                  newCard.card_type === 'MASTERCARD' ? '#EB001B' :
                  undefined
                }
                border={isAmexCard(newCard.card_type) ? '2px solid rgba(255,255,255,0.2)' : 'none'}
                css={{
                  ...(isAmexCard(newCard.card_type) && {
                    background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #2C3E50 100%) !important',
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px) !important',
                  })
                }}
              >
                <CardBody p={6} position="relative">
                  {/* Amex Card Design */}
                  {isAmexCard(newCard.card_type) ? (
                    <>
                      {/* Decorative Top Border */}
                      <Box position="absolute" top={0} left={0} right={0} h="8px" overflow="hidden">
                        <Flex justify="space-between" align="center" h="100%">
                          {[...Array(20)].map((_, i) => (
                            <Box key={i} w="8px" h="100%" bg="white" opacity={0.15} transform="rotate(45deg)" />
                          ))}
                        </Flex>
                      </Box>
                      
                      {/* Decorative Bottom Border */}
                      <Box position="absolute" bottom={0} left={0} right={0} h="8px" overflow="hidden">
                        <Flex justify="space-between" align="center" h="100%">
                          {[...Array(20)].map((_, i) => (
                            <Box key={i} w="8px" h="100%" bg="white" opacity={0.15} transform="rotate(45deg)" />
                          ))}
                        </Flex>
                      </Box>
                      
                      {/* Background Pattern */}
                      <Box 
                        position="absolute" 
                        top={0} 
                        left={0} 
                        right={0} 
                        bottom={0} 
                        opacity={0.05}
                        fontSize="xs"
                        color="white"
                        overflow="hidden"
                        pointerEvents="none"
                      >
                        <Text 
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%) rotate(-45deg)"
                          whiteSpace="nowrap"
                          letterSpacing="widest"
                        >
                          AMERICAN EXPRESS WORLD SERVICE • AMERICAN EXPRESS WORLD SERVICE • AMERICAN EXPRESS WORLD SERVICE
                        </Text>
                      </Box>
                      
                      {/* Chip - Top Left */}
                      <Box position="absolute" top={4} left={4}>
                        <Box
                          w="40px"
                          h="32px"
                          bg="linear-gradient(135deg, #C0C0C0 0%, #808080 100%)"
                          borderRadius="md"
                          border="1px solid rgba(255,255,255,0.3)"
                          position="relative"
                          overflow="hidden"
                        >
                          <Box
                            position="absolute"
                            top="2px"
                            left="2px"
                            right="2px"
                            bottom="2px"
                            border="1px solid rgba(0,0,0,0.2)"
                            borderRadius="sm"
                          />
                          <Box
                            position="absolute"
                            top="6px"
                            left="6px"
                            w="6px"
                            h="6px"
                            bg="rgba(0,0,0,0.3)"
                            borderRadius="sm"
                          />
                        </Box>
                      </Box>
                      
                      {/* AMERICAN EXPRESS - Centered Top */}
                      <VStack spacing={0} mt={8} mb={2}>
                        <Text 
                          fontSize="xl" 
                          fontWeight="bold" 
                          letterSpacing="widest"
                          color="white"
                          textAlign="center"
                        >
                          AMERICAN EXPRESS
                        </Text>
                        {newCard.card_type === 'AMEX' && (
                          <Text 
                            fontSize="sm" 
                            fontWeight="medium" 
                            letterSpacing="wide"
                            color="white"
                            opacity={0.9}
                            mt={1}
                          >
                            PLATINUM
                          </Text>
                        )}
                      </VStack>
                      
                      {/* Centurion Logo - Center Right */}
                      <Box position="absolute" top={12} right={6}>
                        <Box
                          w="60px"
                          h="60px"
                          borderRadius="full"
                          bg="white"
                          opacity={0.95}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          boxShadow="0 2px 8px rgba(0,0,0,0.2)"
                        >
                          {/* Centurion Profile Silhouette */}
                          <Box
                            w="50px"
                            h="50px"
                            borderRadius="full"
                            bg="linear-gradient(135deg, #006FCF 0%, #003087 100%)"
                            position="relative"
                            overflow="hidden"
                          >
                            {/* Simplified Centurion Head Profile */}
                            <Box
                              position="absolute"
                              top="8px"
                              right="8px"
                              w="20px"
                              h="30px"
                              bg="white"
                              borderRadius="full"
                              transform="rotate(-20deg)"
                            />
                            <Box
                              position="absolute"
                              top="12px"
                              right="12px"
                              w="12px"
                              h="20px"
                              bg="#006FCF"
                              borderRadius="full"
                            />
                          </Box>
                        </Box>
                        {/* MEMBER SINCE */}
                        <VStack spacing={0} mt={2} align="center">
                          <Text fontSize="xs" color="white" opacity={0.8} letterSpacing="wide">
                            MEMBER
                          </Text>
                          <Text fontSize="xs" color="white" opacity={0.8} letterSpacing="wide">
                            SINCE
                          </Text>
                          <Text fontSize="sm" fontWeight="bold" color="white" mt={1}>
                            {new Date().getFullYear().toString().slice(-2)}
                          </Text>
                        </VStack>
                      </Box>
                      
                      {/* Card Number - Between center and right (shows actual number as user types) */}
                      <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" mt={-4}>
                        <Text 
                          fontSize="xl" 
                          fontWeight="bold" 
                          letterSpacing="widest"
                          color="white"
                          fontFamily="monospace"
                        >
                          {newCard.card_number ? formatCardNumber(newCard.card_number, newCard.card_type) : '•••• •••••• •••••'}
                        </Text>
                      </Box>
                      
                      {/* Cardholder Name - Bottom Left */}
                      <Box position="absolute" bottom={6} left={6}>
                        <Text 
                          fontSize="sm" 
                          fontWeight="semibold" 
                          color="white"
                          letterSpacing="wide"
                          textTransform="uppercase"
                        >
                          {newCard.card_holder_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim().toUpperCase() || 'CARDHOLDER NAME'}
                        </Text>
                      </Box>
                      
                      {/* Valid Thru - Bottom Right */}
                      <Box position="absolute" bottom={6} right={6}>
                        <HStack spacing={2} align="flex-end">
                          <Text fontSize="xs" color="white" opacity={0.8}>
                            VALID
                          </Text>
                          <Text fontSize="xs" color="white" opacity={0.8}>
                            THRU
                          </Text>
                          <Text fontSize="sm" fontWeight="semibold" color="white">
                            {newCard.expiry_date || 'MM/YY'}
                          </Text>
                        </HStack>
                      </Box>
                      
                      {/* Copyright - Bottom Right Corner */}
                      <Box position="absolute" bottom={2} right={2}>
                        <Text fontSize="xs" color="white" opacity={0.5}>
                          © AMEX
                        </Text>
                      </Box>
                    </>
                  ) : newCard.card_type === 'VISA' ? (
                    <>
                      {/* Visa Card Design */}
                      <Flex justify="space-between" align="flex-start" mb={4}>
                        {/* Chip */}
                        <Box
                          w="48px"
                          h="36px"
                          bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                          borderRadius="md"
                          border="2px solid rgba(255,255,255,0.3)"
                          position="relative"
                          overflow="hidden"
                        >
                          <Box
                            position="absolute"
                            top="2px"
                            left="2px"
                            right="2px"
                            bottom="2px"
                            border="1px solid rgba(0,0,0,0.2)"
                            borderRadius="sm"
                          />
                          <Box
                            position="absolute"
                            top="8px"
                            left="8px"
                            w="8px"
                            h="8px"
                            bg="rgba(0,0,0,0.3)"
                            borderRadius="sm"
                          />
                        </Box>
                        {/* Visa Logo - Top Right */}
                        <Box>
                          <Text fontSize="3xl" fontWeight="bold" letterSpacing="wide" color="white">
                            VISA
                          </Text>
                        </Box>
                      </Flex>
                      
                      {/* Card Number - Large */}
                      <VStack spacing={2} mb={6} align="flex-start">
                        <Text 
                          fontSize="xl" 
                          fontWeight="bold" 
                          letterSpacing="wide"
                          color="white"
                          fontFamily="monospace"
                        >
                          {formatCardNumberDisplay(newCard.card_number, newCard.card_type)}
                        </Text>
                      </VStack>
                      
                      {/* Cardholder Name and Expiry - Bottom */}
                      <Flex justify="space-between" align="flex-end" mt="auto">
                        <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                          {newCard.card_holder_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim().toUpperCase() || 'CARDHOLDER NAME'}
                        </Text>
                        <VStack align="flex-end" spacing={0}>
                          <Text fontSize="xs" opacity={0.8}>
                            VALID THRU
                          </Text>
                          <Text fontSize="sm" fontWeight="semibold">
                            {newCard.expiry_date || 'MM/YY'}
                          </Text>
                        </VStack>
                      </Flex>
                      
                      {/* Contactless Symbol - Bottom Right */}
                      <Box position="absolute" bottom={4} right={6}>
                        <Wifi size={20} opacity={0.6} />
                      </Box>
                    </>
                  ) : newCard.card_type === 'MASTERCARD' ? (
                    <>
                      {/* Mastercard Card Design */}
                      <Flex justify="space-between" align="flex-start" mb={4}>
                        {/* Chip */}
                        <Box
                          w="48px"
                          h="36px"
                          bg="linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                          borderRadius="md"
                          border="2px solid rgba(255,255,255,0.3)"
                          position="relative"
                          overflow="hidden"
                        >
                          <Box
                            position="absolute"
                            top="2px"
                            left="2px"
                            right="2px"
                            bottom="2px"
                            border="1px solid rgba(0,0,0,0.2)"
                            borderRadius="sm"
                          />
                          <Box
                            position="absolute"
                            top="8px"
                            left="8px"
                            w="8px"
                            h="8px"
                            bg="rgba(0,0,0,0.3)"
                            borderRadius="sm"
                          />
                        </Box>
                        {/* Mastercard Logo - Top Right */}
                        <HStack spacing={1}>
                          <Box
                            w="32px"
                            h="32px"
                            borderRadius="full"
                            bg="#EB001B"
                            border="2px solid white"
                          />
                          <Box
                            w="32px"
                            h="32px"
                            borderRadius="full"
                            bg="#F79E1B"
                            border="2px solid white"
                            ml="-16px"
                            opacity={0.9}
                          />
                        </HStack>
                      </Flex>
                      
                      {/* Card Number - Large */}
                      <VStack spacing={2} mb={6} align="flex-start">
                        <Text 
                          fontSize="xl" 
                          fontWeight="bold" 
                          letterSpacing="wide"
                          color="white"
                          fontFamily="monospace"
                        >
                          {formatCardNumberDisplay(newCard.card_number, newCard.card_type)}
                        </Text>
                      </VStack>
                      
                      {/* Cardholder Name and Expiry - Bottom */}
                      <Flex justify="space-between" align="flex-end" mt="auto">
                        <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                          {newCard.card_holder_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim().toUpperCase() || 'CARDHOLDER NAME'}
                        </Text>
                        <VStack align="flex-end" spacing={0}>
                          <Text fontSize="xs" opacity={0.8}>
                            VALID THRU
                          </Text>
                          <Text fontSize="sm" fontWeight="semibold">
                            {newCard.expiry_date || 'MM/YY'}
                          </Text>
                        </VStack>
                      </Flex>
                      
                      {/* Contactless Symbol - Bottom Right */}
                      <Box position="absolute" bottom={4} right={6}>
                        <Wifi size={20} opacity={0.6} />
                      </Box>
                    </>
                  ) : (
                    <>
                      {/* Standard Card Design */}
                      <Flex justify="space-between" mb={4}>
                        <CreditCard size={24} />
                        <Wifi size={24} />
                      </Flex>
                      <VStack align="flex-start" spacing={2} mt={8}>
                        <Text 
                          fontSize="lg" 
                          fontWeight="semibold" 
                          letterSpacing="wide"
                        >
                          {formatCardNumberDisplay(newCard.card_number, newCard.card_type)}
                        </Text>
                        <Text fontSize="sm" opacity={0.9}>
                          Card Balance: $0.00
                        </Text>
                        {newCard.card_type && !isAmexCard(newCard.card_type) && !isCreditCard(newCard.card_type) && (
                          <Text fontSize="md" fontWeight="semibold" mt={2}>
                            {newCard.card_type} CARD
                          </Text>
                        )}
                        {(newCard.card_type === 'VISA' || newCard.card_type === 'MASTERCARD') && (
                          <Text fontSize="md" fontWeight="semibold" mt={2}>
                            CREDIT CARD
                          </Text>
                        )}
                        <HStack spacing={4} mt={4} w="full" justify="space-between">
                          <Text fontSize="sm">
                            {newCard.card_holder_name || 'Card Holder Name'}
                          </Text>
                          <Text fontSize="sm">
                            {newCard.expiry_date || 'MM/YY'}
                          </Text>
                        </HStack>
                      </VStack>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card bg="gray.50">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                      Card Information
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Enter your card details to add it to your account
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <FormControl isRequired>
                <FormLabel>Card Holder Name</FormLabel>
                <Input
                  placeholder="John Doe"
                  value={newCard.card_holder_name}
                  onChange={(e) => setNewCard({ ...newCard, card_holder_name: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Card Number</FormLabel>
                <Input
                  placeholder={isAmexCard(newCard.card_type) ? "1234 567890 12345" : "1234 5678 9012 3456"}
                  value={newCard.card_number}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value, newCard.card_type);
                    setNewCard({ ...newCard, card_number: formatted });
                  }}
                  maxLength={isAmexCard(newCard.card_type) ? 17 : 19}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {isAmexCard(newCard.card_type) 
                    ? 'Enter 15-digit American Express card number'
                    : 'Enter 16-digit card number'}
                </Text>
              </FormControl>

              <HStack spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel>Expiry Date</FormLabel>
                  <Input
                    placeholder="MM/YY"
                    value={newCard.expiry_date}
                    onChange={(e) => {
                      const formatted = formatExpiryDate(e.target.value);
                      setNewCard({ ...newCard, expiry_date: formatted });
                    }}
                    maxLength={5}
                  />
                </FormControl>

                <FormControl flex={1}>
                  <FormLabel>Card Type</FormLabel>
                  <Select
                    value={newCard.card_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setNewCard({ 
                        ...newCard, 
                        card_type: newType,
                        // Reset gradient for Amex (it has its own design)
                        gradient_type: newType === 'AMEX' ? 'blue' : newCard.gradient_type
                      });
                    }}
                  >
                    <option value="DEBIT">Debit Card</option>
                    <option value="CREDIT">Credit Card</option>
                    <option value="VISA">Visa Credit Card</option>
                    <option value="MASTERCARD">Mastercard Credit Card</option>
                    <option value="AMEX">American Express</option>
                  </Select>
                </FormControl>
              </HStack>

              {!isAmexCard(newCard.card_type) && !isCreditCard(newCard.card_type) && (
                <FormControl>
                  <FormLabel>Card Design</FormLabel>
                  <Select
                    value={newCard.gradient_type}
                    onChange={(e) => setNewCard({ ...newCard, gradient_type: e.target.value })}
                  >
                    <option value="purple">Purple</option>
                    <option value="blue">Blue</option>
                    <option value="pink">Pink</option>
                    <option value="orange">Orange</option>
                    <option value="green">Green</option>
                  </Select>
                </FormControl>
              )}

              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="xs">
                  Your card will be added securely. Make sure all information is correct.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddCardClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleAddCard}
              isLoading={addingCard}
            >
              Add Card
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Card Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteCardOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteCardClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Card
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to remove this card? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteCardClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteCardConfirm}
                ml={3}
                isLoading={updatingCard === cardToDelete}
              >
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}
