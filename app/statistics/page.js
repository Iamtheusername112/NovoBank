'use client';

import { useState } from 'react';
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
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { Grid, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

const spendingData = [
  { name: 'Shopping', value: 233, color: '#9c27b0' },
  { name: 'Transfers', value: 150, color: '#e0e0e0' },
  { name: 'Other', value: 276.47, color: '#e0e0e0' },
];

const transactions = [
  {
    name: 'Ann',
    time: '08:34',
    amount: -100,
    date: 'Today',
    initial: 'A',
  },
  {
    name: 'Ethan',
    time: '12:00',
    amount: -100,
    date: 'Yesterday',
    initial: 'E',
  },
  {
    name: 'Daniel',
    time: '10:23',
    amount: 24,
    date: 'Yesterday',
    initial: 'D',
  },
];

export default function StatisticsPage() {
  const [timePeriod, setTimePeriod] = useState('week');
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      <Box px={4} py={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Statistic
          </Text>
          <IconButton
            icon={<Grid size={20} />}
            variant="ghost"
            onClick={() => router.push('/widgets')}
            aria-label="Widgets"
          />
        </Flex>

        <HStack spacing={2} mb={6}>
          {['week', 'month', 'year'].map((period) => (
            <Button
              key={period}
              onClick={() => setTimePeriod(period)}
              size="sm"
              bg={timePeriod === period ? 'brand.600' : 'white'}
              color={timePeriod === period ? 'white' : 'gray.600'}
              _hover={{
                bg: timePeriod === period ? 'brand.700' : 'gray.100',
              }}
              textTransform="capitalize"
            >
              {period}
            </Button>
          ))}
        </HStack>

        <Card bg={cardBg} borderRadius="xl" mb={6} boxShadow="md">
          <CardBody>
            <VStack spacing={4}>
              <Box w="full" h="200px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Text fontSize="3xl" fontWeight="bold" color="gray.800">
                $659.47
              </Text>
              <Text fontSize="sm" color="gray.500">
                you spent 10% more than last week
              </Text>
              <VStack spacing={2} align="flex-start" w="full" mt={4}>
                {spendingData.map((item, index) => (
                  <HStack key={index} spacing={2}>
                    <Box
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg={item.color}
                    />
                    <Text fontSize="sm" color="gray.600">
                      {item.name} {item.name === 'Shopping' && `$${item.value}`}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        <VStack spacing={4} align="stretch">
          {['Today', 'Yesterday'].map((dateLabel) => {
            const dateTransactions = transactions.filter(
              (t) => t.date === dateLabel
            );
            if (dateTransactions.length === 0) return null;

            return (
              <Box key={dateLabel}>
                <Text fontSize="md" fontWeight="semibold" color="gray.600" mb={3}>
                  {dateLabel}
                </Text>
                <VStack spacing={2} align="stretch">
                  {dateTransactions.map((transaction, index) => (
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
                                {transaction.initial}
                              </Text>
                            </Box>
                            <VStack align="flex-start" spacing={0}>
                              <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                                {transaction.name}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {transaction.time}
                              </Text>
                            </VStack>
                          </HStack>
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            color={transaction.amount > 0 ? 'green.500' : 'red.500'}
                          >
                            {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                          </Text>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      </Box>
      <BottomNavigation />
    </Box>
  );
}

