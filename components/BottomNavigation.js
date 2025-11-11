'use client';

import { Box, Flex, IconButton, Text, Badge } from '@chakra-ui/react';
import { Wallet, Star, BarChart3, User, Bell, Building2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function BottomNavigation({ unreadCount = 0 }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Building2, label: 'Accounts', path: '/accounts' },
    { icon: Star, label: 'Favorites', path: '/favorites' },
    { icon: BarChart3, label: 'Statistic', path: '/statistics' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path) => {
    if (path === '/wallet') {
      return pathname === '/wallet';
    }
    return pathname?.startsWith(path);
  };

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      borderTop="1px solid"
      borderColor="gray.200"
      zIndex={1000}
      px={2}
      py={2}
      display={{ base: 'block', md: 'none' }}
    >
      <Flex justify="space-around" align="center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const showBadge =
            item.path === '/notifications' && unreadCount && unreadCount > 0;
          return (
            <Flex
              key={item.path}
              direction="column"
              align="center"
              gap={1}
              cursor="pointer"
              onClick={() => router.push(item.path)}
              flex={1}
            >
              <Box position="relative">
                <IconButton
                  icon={<Icon size={20} />}
                  variant="ghost"
                  size="sm"
                  colorScheme={active ? 'brand' : 'gray'}
                  color={active ? 'brand.600' : 'gray.500'}
                  bg={active ? 'brand.50' : 'transparent'}
                  borderRadius="full"
                  aria-label={item.label}
                />
                {showBadge && (
                  <Badge
                    colorScheme="red"
                    borderRadius="full"
                    p="0"
                    minW="10px"
                    h="10px"
                    position="absolute"
                    top="-2px"
                    right="-2px"
                  />
                )}
              </Box>
              {active && (
                <Text fontSize="xs" color="brand.600" fontWeight="medium">
                  {item.label}
                </Text>
              )}
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}

