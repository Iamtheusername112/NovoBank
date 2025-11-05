'use client';

import { useState } from 'react';
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
} from '@chakra-ui/react';
import {
  Bell,
  Moon,
  Lock,
  Globe,
  Grid,
  Star,
  CreditCard,
} from 'lucide-react';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

export default function ProfilePage() {
  const [darkTheme, setDarkTheme] = useState(false);
  const [personalOffers, setPersonalOffers] = useState(true);
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <HStack justify="space-between" align="center" mb={6}>
          <HStack spacing={3}>
            <Box
              w="50px"
              h="50px"
              borderRadius="full"
              bg="blue.200"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="lg" fontWeight="bold" color="white">
                J
              </Text>
            </Box>
            <VStack align="flex-start" spacing={0}>
              <Text fontSize="xs" color="gray.500">
                Welcome back,
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="brand.600">
                John
              </Text>
            </VStack>
          </HStack>
          <IconButton
            icon={<Bell size={20} />}
            variant="ghost"
            aria-label="Notifications"
          />
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
                          onChange={(e) => setDarkTheme(e.target.checked)}
                          colorScheme="brand"
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
                      { icon: Lock, label: 'Security', color: 'green.500' },
                      { icon: Bell, label: 'Notifications', color: 'blue.500' },
                      { icon: CreditCard, label: 'Google pay', color: 'red.500' },
                      { icon: Globe, label: 'Language', color: 'pink.500' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.label} bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
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
                                aria-label={`Go to ${item.label}`}
                              />
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    Personalization
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {[
                      { icon: Grid, label: 'Main screen', color: 'pink.500' },
                      { icon: Grid, label: 'Widgets', color: 'blue.500' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.label} bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
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
                                aria-label={`Go to ${item.label}`}
                              />
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
                            onChange={(e) => setPersonalOffers(e.target.checked)}
                            colorScheme="brand"
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
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={3}>
                    Actions
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {[
                      {
                        icon: Moon,
                        label: 'Freeze physical card',
                        color: 'blue.500',
                        hasToggle: true,
                      },
                      {
                        icon: CreditCard,
                        label: 'Disable contactless',
                        color: 'pink.500',
                      },
                      {
                        icon: CreditCard,
                        label: 'Disable magstripe',
                        color: 'purple.500',
                      },
                      {
                        icon: Grid,
                        label: 'QR Code',
                        color: 'orange.500',
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.label} bg={cardBg} borderRadius="md">
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <HStack spacing={3}>
                                <Icon size={20} color={item.color} />
                                <Text fontSize="sm" color="gray.800">
                                  {item.label}
                                </Text>
                              </HStack>
                              {item.hasToggle ? (
                                <Switch colorScheme="brand" />
                              ) : (
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
                                  aria-label={`Go to ${item.label}`}
                                />
                              )}
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
      <BottomNavigation />
    </Box>
  );
}

