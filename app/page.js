'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Button,
  Container,
  Heading,
  SimpleGrid,
  useColorModeValue,
  Card,
  CardBody,
} from '@chakra-ui/react';
import {
  Shield,
  CreditCard,
  TrendingUp,
  Smartphone,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: Shield,
    title: 'Secure Banking',
    description: 'Bank-level security with end-to-end encryption',
    color: 'purple.500',
  },
  {
    icon: CreditCard,
    title: 'Smart Cards',
    description: 'Manage multiple cards with ease',
    color: 'pink.500',
  },
  {
    icon: TrendingUp,
    title: 'Track Spending',
    description: 'Real-time insights into your finances',
    color: 'blue.500',
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    description: 'Send money instantly with swipe-to-pay',
    color: 'orange.500',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Banking made simple on your phone',
    color: 'green.500',
  },
  {
    icon: Lock,
    title: 'Privacy Protected',
    description: 'Your data is safe and secure with us',
    color: 'red.500',
  },
];

const benefits = [
  'No hidden fees',
  '24/7 customer support',
  'Instant notifications',
  'Budget tracking',
  'Multi-card management',
  'Secure transactions',
];

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const bgGradient = useColorModeValue(
    'linear(to-br, purple.50, pink.50, blue.50)',
    'linear(to-br, gray.900, purple.900)'
  );
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Box minH="100vh" bg={bgGradient}>
      {/* Header */}
      <Box
        as="header"
        py={4}
        px={8}
        bg="white"
        boxShadow="sm"
        position="sticky"
        top={0}
        zIndex={1000}
      >
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <HStack spacing={2}>
              <Box
                w="40px"
                h="40px"
                borderRadius="lg"
                bgGradient="linear(to-br, purple.500, pink.500)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="xl" fontWeight="bold" color="white">
                  N
                </Text>
              </Box>
              <Text fontSize="xl" fontWeight="bold" color="gray.800">
                NovaBank
              </Text>
            </HStack>
            <HStack spacing={4}>
              <Button
                variant="ghost"
                colorScheme="purple"
                onClick={() => router.push('/auth')}
              >
                Sign In
              </Button>
              <Button
                colorScheme="purple"
                bg="purple.600"
                _hover={{ bg: 'purple.700' }}
                onClick={() => router.push('/signup')}
              >
                Get Started
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box py={20} px={8}>
        <Container maxW="container.xl">
          <VStack spacing={8} textAlign="center">
            <Heading
              as="h1"
              size="2xl"
              bgGradient="linear(to-r, purple.600, pink.600)"
              bgClip="text"
              fontWeight="extrabold"
            >
              Banking Made Simple
            </Heading>
            <Text fontSize="xl" color="gray.600" maxW="600px">
              Experience the future of banking with NovaBank. Manage your money,
              track your spending, and send payments with ease - all in one
              beautiful app.
            </Text>
            <HStack spacing={4}>
              <Button
                size="lg"
                colorScheme="purple"
                bg="purple.600"
                _hover={{ bg: 'purple.700' }}
                rightIcon={<ArrowRight />}
                onClick={() => router.push('/signup')}
              >
                Start Banking
              </Button>
              <Button
                size="lg"
                variant="outline"
                colorScheme="purple"
                onClick={() => router.push('/wallet')}
              >
                View Demo
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={16} px={8} bg="white">
        <Container maxW="container.xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading as="h2" size="xl" color="gray.800">
                Everything You Need
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="600px">
                Powerful features designed to make your banking experience
                seamless and secure
              </Text>
            </VStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} w="full">
              {features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <Card
                    key={index}
                    bg={cardBg}
                    borderRadius="xl"
                    boxShadow="md"
                    _hover={{ boxShadow: 'xl', transform: 'translateY(-4px)' }}
                    transition="all 0.3s"
                  >
                    <CardBody p={6}>
                      <VStack spacing={4} align="flex-start">
                        <Box
                          p={3}
                          borderRadius="lg"
                          bg={`${feature.color}20`}
                          color={feature.color}
                        >
                          <FeatureIcon size={24} />
                        </Box>
                        <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                          {feature.title}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {feature.description}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box py={16} px={8} bgGradient="linear(to-br, purple.50, pink.50)">
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            align="center"
            gap={12}
          >
            <Box flex={1}>
              <Heading as="h2" size="xl" color="gray.800" mb={6}>
                Why Choose NovaBank?
              </Heading>
              <Text fontSize="lg" color="gray.600" mb={8}>
                We're committed to providing you with the best banking
                experience. Here's what makes us different:
              </Text>
              <SimpleGrid columns={2} spacing={4}>
                {benefits.map((benefit, index) => (
                  <HStack key={index} spacing={2}>
                    <CheckCircle size={20} color="#9c27b0" />
                    <Text color="gray.700" fontWeight="medium">
                      {benefit}
                    </Text>
                  </HStack>
                ))}
              </SimpleGrid>
            </Box>
            <Box flex={1}>
              <Card
                bgGradient="linear(to-br, purple.600, pink.600)"
                borderRadius="2xl"
                color="white"
                p={8}
                boxShadow="xl"
              >
                <CardBody>
                  <VStack spacing={4} align="flex-start">
                    <Text fontSize="sm" opacity={0.9}>
                      Your balance
                    </Text>
                    <Text fontSize="4xl" fontWeight="bold">
                      $800.12
                    </Text>
                    <Text fontSize="sm" opacity={0.9}>
                      Mick Gardy • 12/24
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={16} px={8} bg="gray.900" color="white">
        <Container maxW="container.xl">
          <VStack spacing={8} textAlign="center">
            <Heading as="h2" size="xl">
              Ready to Get Started?
            </Heading>
            <Text fontSize="lg" color="gray.300" maxW="600px">
              Join thousands of users who trust NovaBank for their banking
              needs. Get started in minutes.
            </Text>
            <HStack spacing={4}>
              <Button
                size="lg"
                colorScheme="purple"
                bg="purple.600"
                _hover={{ bg: 'purple.700' }}
                rightIcon={<ArrowRight />}
                onClick={() => router.push('/signup')}
              >
                Create Account
              </Button>
              <Button
                size="lg"
                variant="outline"
                colorScheme="purple"
                borderColor="purple.600"
                _hover={{ bg: 'purple.600' }}
                onClick={() => router.push('/wallet')}
              >
                Try Demo
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={8} px={8} bg="gray.800" color="gray.300">
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            gap={4}
          >
            <HStack spacing={2}>
              <Box
                w="32px"
                h="32px"
                borderRadius="lg"
                bgGradient="linear(to-br, purple.500, pink.500)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="sm" fontWeight="bold" color="white">
                  N
                </Text>
              </Box>
              <Text fontSize="sm" fontWeight="medium">
                NovaBank
              </Text>
            </HStack>
            <Text fontSize="sm">© 2024 NovaBank. All rights reserved.</Text>
            <HStack spacing={4}>
              <Text fontSize="sm" cursor="pointer" _hover={{ color: 'white' }}>
                Privacy
              </Text>
              <Text fontSize="sm" cursor="pointer" _hover={{ color: 'white' }}>
                Terms
              </Text>
              <Text fontSize="sm" cursor="pointer" _hover={{ color: 'white' }}>
                Support
              </Text>
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
