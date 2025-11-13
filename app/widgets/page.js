'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
  Card,
  CardBody,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { Grid, ArrowLeft, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import ContactUsModal from '@/components/ContactUsModal';

const pieData = [
  { name: 'Food', value: 150, color: '#ef4444' },
  { name: 'Transfers', value: 100, color: '#f97316' },
  { name: 'Other', value: 120, color: '#ec4899' },
  { name: 'Shopping', value: 233, color: '#9c27b0' },
];

const barData = [
  { name: 'Other', value: 120, color: '#ec4899' },
  { name: 'Food', value: 150, color: '#ef4444' },
  { name: 'Shopping', value: 233, color: '#9c27b0' },
  { name: 'Transfers', value: 100, color: '#f97316' },
];

export default function WidgetsPage() {
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
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
              Widgets
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
              icon={<Grid size={20} />}
              variant="ghost"
              bg="brand.600"
              color="white"
              aria-label="Grid"
            />
          </HStack>
        </Flex>

        <VStack spacing={4} align="stretch" mb={6}>
          <Card bg={cardBg} borderRadius="xl" boxShadow="md">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="md" fontWeight="semibold" color="gray.800">
                  Statistics
                </Text>
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
                  aria-label="Configure"
                />
              </Flex>
              <Box w="full" h="120px">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <HStack spacing={3} mt={4} flexWrap="wrap">
                {barData.map((item, index) => (
                  <HStack key={index} spacing={1}>
                    <Box w="8px" h="8px" borderRadius="full" bg={item.color} />
                    <Text fontSize="xs" color="gray.600">
                      {item.name} {item.name === 'Shopping' && `$${item.value}`}
                    </Text>
                  </HStack>
                ))}
              </HStack>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderRadius="xl" boxShadow="md">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="md" fontWeight="semibold" color="gray.800">
                  Statistics
                </Text>
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
                  aria-label="Configure"
                />
              </Flex>
              <Box w="full" h="150px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <HStack spacing={3} mt={4} flexWrap="wrap">
                {pieData.map((item, index) => (
                  <HStack key={index} spacing={1}>
                    <Box w="8px" h="8px" borderRadius="full" bg={item.color} />
                    <Text fontSize="xs" color="gray.600">
                      {item.name} {item.name === 'Shopping' && `$${item.value}`}
                    </Text>
                  </HStack>
                ))}
              </HStack>
            </CardBody>
          </Card>
        </VStack>

        <VStack spacing={3} align="stretch">
          <Button
            bg="gray.300"
            color="gray.800"
            _hover={{ bg: 'gray.400' }}
            borderRadius="md"
          >
            Remove all widgets
          </Button>
          <Button
            bg="gray.300"
            color="gray.800"
            _hover={{ bg: 'gray.400' }}
            borderRadius="md"
          >
            add widgets on Your main screen
          </Button>
        </VStack>
      </Box>
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}

