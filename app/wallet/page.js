'use client';

import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Card,
  CardBody,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  Lock,
  Search,
  CreditCard,
  Wifi,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

const recentTransactions = [
  { name: 'Ethan', date: 'Yesterday', amount: -100, type: 'outgoing' },
  { name: 'Daniel', date: 'Yesterday', amount: 24, type: 'incoming' },
  { name: 'Ann', date: 'Tuesday', amount: -60, type: 'outgoing' },
];

export default function WalletPage() {
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Cards
          </Text>
          <HStack spacing={2}>
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

        <Card
          bgGradient="linear(to-r, gray.800, purple.500, pink.400, blue.400)"
          color="white"
          borderRadius="xl"
          overflow="hidden"
          mb={6}
          boxShadow="lg"
          minH="220px"
        >
          <CardBody p={6}>
            <Flex justify="space-between" mb={4}>
              <CreditCard size={24} />
              <Wifi size={24} />
            </Flex>
            <VStack align="flex-start" spacing={2} mt={8}>
              <Text fontSize="sm" opacity={0.9}>
                Your balance: $800.12
              </Text>
              <Text fontSize="sm" mt={4}>
                Mick Gardy 12/24
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Box mb={6}>
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
              <VStack
                key={name}
                spacing={2}
                minW="60px"
                cursor="pointer"
                onClick={() => router.push('/send-money')}
              >
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

        <Box>
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
      <BottomNavigation />
    </Box>
  );
}

