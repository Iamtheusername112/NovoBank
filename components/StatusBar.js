'use client';

import { Box, Flex, Text, HStack } from '@chakra-ui/react';
import { Battery, Signal } from 'lucide-react';

export default function StatusBar() {
  return (
    <Box
      px={4}
      py={2}
      bg="white"
      display={{ base: 'flex', md: 'none' }}
      justifyContent="space-between"
      alignItems="center"
    >
      <Text fontSize="sm" fontWeight="medium" color="gray.800">
        08:34
      </Text>
      <HStack spacing={1}>
        <Signal size={14} color="#22c55e" />
        <Text fontSize="xs" color="#22c55e">
          3G
        </Text>
        <Battery size={16} color="#22c55e" />
      </HStack>
    </Box>
  );
}

