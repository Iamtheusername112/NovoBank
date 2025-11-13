'use client';

import { useState, useEffect } from 'react';
import { Box, Text, VStack, Button, HStack, useDisclosure, IconButton, Flex } from '@chakra-ui/react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import ContactUsModal from '@/components/ContactUsModal';

export default function FavoritesPage() {
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
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Favorites
          </Text>
          <IconButton
            icon={<MessageCircle size={20} />}
            variant="ghost"
            colorScheme="purple"
            aria-label="Contact Us"
            onClick={onContactOpen}
          />
        </Flex>
        <VStack spacing={4} align="stretch">
          <Text color="gray.600" textAlign="center" mt={8}>
            No favorites yet
          </Text>
        </VStack>
      </Box>
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}

