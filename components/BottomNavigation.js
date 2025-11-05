'use client';

import { Box, Flex, IconButton, Text } from '@chakra-ui/react';
import { Wallet, Star, BarChart3, User, Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
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

