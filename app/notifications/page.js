'use client';

import { Box, Text, VStack } from '@chakra-ui/react';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

export default function NotificationsPage() {
  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={6}>
          Notifications
        </Text>
        <VStack spacing={4} align="stretch">
          <Text color="gray.600" textAlign="center" mt={8}>
            No notifications
          </Text>
        </VStack>
      </Box>
      <BottomNavigation />
    </Box>
  );
}

