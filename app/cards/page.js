'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Badge,
  Switch,
  Card,
  CardBody,
  useColorModeValue,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Lock,
  Search,
  CreditCard,
  Wifi,
  Snowflake,
  QrCode,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import ContactUsModal from '@/components/ContactUsModal';

const mockCards = [
  {
    id: 1,
    name: 'Mick Gardy',
    balance: 800.12,
    expiry: '12/24',
    number: '1234 5678 9000 0000',
    gradient: 'linear(to-r, purple.500, pink.400, blue.400)',
  },
  {
    id: 2,
    name: 'Mick Gardy',
    balance: 800.12,
    expiry: '12/24',
    number: '1234 5678 9000 0000',
    gradient: 'linear(to-r, purple.500, orange.400)',
  },
  {
    id: 3,
    name: 'Mick Gardy',
    balance: 800.12,
    expiry: '12/24',
    type: 'DEBIT CARD',
    gradient: 'linear(to-r, pink.300, blue.300)',
  },
];

const recentTransactions = [
  { name: 'Ethan', date: 'Yesterday', amount: -100, type: 'outgoing' },
  { name: 'Daniel', date: 'Yesterday', amount: 24, type: 'incoming' },
  { name: 'Ann', date: 'Tuesday', amount: -60, type: 'outgoing' },
];

export default function CardsPage() {
  const [isFrozen, setIsFrozen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  useEffect(() => {
    loadNotificationCounts();
  }, []);

  const loadNotificationCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotificationCount((notificationsData || []).length);

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadAlertCount((alertsData || []).length);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <HStack>
            <IconButton
              icon={<ArrowLeft size={20} />}
              variant="ghost"
              onClick={() => router.back()}
              aria-label="Back"
            />
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              Cards
            </Text>
          </HStack>
          <HStack spacing={2}>
            <IconButton
              icon={<MessageCircle size={20} />}
              variant="ghost"
              colorScheme="purple"
              aria-label="Contact Us"
              onClick={onContactOpen}
            />
            <IconButton
              icon={<Lock size={20} />}
              variant="ghost"
              aria-label="Lock"
            />
            <IconButton
              icon={<Search size={20} />}
              variant="ghost"
              aria-label="Search"
            />
          </HStack>
        </Flex>

        <VStack spacing={4} align="stretch">
          {mockCards.map((card, index) => (
            <Card
              key={card.id}
              bgGradient={card.gradient}
              color="white"
              borderRadius="xl"
              overflow="hidden"
              position="relative"
              minH="200px"
              boxShadow="lg"
              transform={index === 0 ? 'none' : 'scale(0.95)'}
              zIndex={mockCards.length - index}
              mt={index > 0 ? '-100px' : 0}
            >
              <CardBody p={6}>
                <Flex justify="space-between" mb={4}>
                  <CreditCard size={24} />
                  <Wifi size={24} />
                </Flex>
                <VStack align="flex-start" spacing={2} mt={8}>
                  {card.number && (
                    <Text fontSize="lg" fontWeight="semibold">
                      {card.number}
                    </Text>
                  )}
                  {card.balance !== undefined && (
                    <Text fontSize="sm" opacity={0.9}>
                      Your balance: ${card.balance.toFixed(2)}
                    </Text>
                  )}
                  {card.type && (
                    <Text fontSize="lg" fontWeight="semibold">
                      {card.type}
                    </Text>
                  )}
                  <Text fontSize="sm" mt={4}>
                    {card.name} {card.expiry}
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </VStack>

        <Box mt={8}>
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800">
              Send again
            </Text>
            <IconButton
              icon={<ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
              variant="ghost"
              size="sm"
              aria-label="See more"
            />
          </Flex>
          <HStack spacing={4} overflowX="auto" pb={2}>
            {['Ethan', 'Ann', 'Daniel', 'Jack'].map((name) => (
              <VStack key={name} spacing={2} minW="60px">
                <Box
                  w="50px"
                  h="50px"
                  borderRadius="full"
                  bg="gray.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="sm" fontWeight="bold">
                    {name[0]}
                  </Text>
                </Box>
                <Text fontSize="xs" color="gray.600">
                  {name}
                </Text>
              </VStack>
            ))}
          </HStack>
        </Box>

        <Box mt={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800">
              Recent actions
            </Text>
            <IconButton
              icon={<ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
              variant="ghost"
              size="sm"
              aria-label="See more"
            />
          </Flex>
          <VStack spacing={3} align="stretch">
            {recentTransactions.map((transaction, index) => (
              <Card key={index} bg={cardBg} borderRadius="md">
                <CardBody>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box
                        w="40px"
                        h="40px"
                        borderRadius="full"
                        bg="gray.300"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="sm" fontWeight="bold">
                          {transaction.name[0]}
                        </Text>
                      </Box>
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                          {transaction.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {transaction.date}
                        </Text>
                      </VStack>
                    </HStack>
                    <HStack spacing={2}>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        color={transaction.amount > 0 ? 'green.500' : 'red.500'}
                      >
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                      </Text>
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>
      </Box>
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}

