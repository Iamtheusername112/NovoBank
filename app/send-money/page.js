'use client';

import { useState, useRef } from 'react';
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
  useToast,
} from '@chakra-ui/react';
import { ArrowLeft, ChevronDown, CreditCard, X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatusBar from '@/components/StatusBar';

export default function SendMoneyPage() {
  const [amount, setAmount] = useState('100.0');
  const [swipeProgress, setSwipeProgress] = useState(0);
  const swipeProgressRef = useRef(0);
  const router = useRouter();
  const toast = useToast();

  const handleNumberInput = (value) => {
    if (amount === '0' || amount === '0.0') {
      setAmount(value);
    } else {
      setAmount(amount + value);
    }
  };

  const handleDecimal = () => {
    if (!amount.includes('.')) {
      setAmount(amount + '.');
    }
  };

  const handleBackspace = () => {
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount('0');
    }
  };

  const handleSwipeStart = (e) => {
    e.preventDefault();
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    const button = e.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    const maxSwipe = buttonRect.width - 60;

    const handleMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentX = moveEvent.touches
        ? moveEvent.touches[0].clientX
        : moveEvent.clientX;
      const diff = currentX - startX;
      const progress = Math.min(Math.max((diff / maxSwipe) * 100, 0), 100);
      swipeProgressRef.current = progress;
      setSwipeProgress(progress);
    };

    const handleEnd = () => {
      const finalProgress = swipeProgressRef.current;
      if (finalProgress > 80) {
        handlePayment();
        setSwipeProgress(100);
      } else {
        setSwipeProgress(0);
      }
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  const handlePayment = () => {
    toast({
      title: 'Payment Successful',
      description: `$${amount} sent to Ann`,
      status: 'success',
      duration: 3000,
    });
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  const keypadNumbers = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  return (
    <Box minH="100vh" bg="gray.100">
      <StatusBar />
      <Box px={4} py={4}>
        <Flex justify="space-between" align="center" mb={6}>
          <IconButton
            icon={<ArrowLeft size={20} />}
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Back"
          />
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Send Money
          </Text>
          <IconButton
            icon={<Text>[</Text>}
            variant="ghost"
            aria-label="Options"
            fontSize="xl"
          />
        </Flex>

        <Card bg="gray.200" borderRadius="xl" mb={6}>
          <CardBody p={4}>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Box
                  w="50px"
                  h="50px"
                  borderRadius="full"
                  bg="purple.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="lg" fontWeight="bold" color="white">
                    A
                  </Text>
                </Box>
                <VStack align="flex-start" spacing={0}>
                  <Text fontSize="md" fontWeight="bold" color="gray.800">
                    Ann
                  </Text>
                  <HStack spacing={1}>
                    <CreditCard size={12} color="#666" />
                    <Text fontSize="xs" color="gray.600">
                      ... 6301
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
              <ChevronDown size={20} color="#666" />
            </Flex>
          </CardBody>
        </Card>

        <VStack spacing={8} mb={8}>
          <Text fontSize="4xl" fontWeight="light" color="gray.400">
            ${amount}
          </Text>

          <VStack spacing={3} w="full">
            {keypadNumbers.map((row, rowIndex) => (
              <HStack key={rowIndex} spacing={3} justify="center" w="full">
                {row.map((num) => (
                  <Button
                    key={num}
                    onClick={() => handleNumberInput(num.toString())}
                    w="70px"
                    h="70px"
                    borderRadius="full"
                    bg="gray.200"
                    color="gray.800"
                    fontSize="xl"
                    fontWeight="semibold"
                    _hover={{ bg: 'gray.300' }}
                  >
                    {num}
                  </Button>
                ))}
              </HStack>
            ))}
            <HStack spacing={3} justify="center" w="full">
              <Button
                onClick={handleDecimal}
                w="70px"
                h="70px"
                borderRadius="full"
                bg="gray.200"
                color="gray.800"
                fontSize="xl"
                fontWeight="semibold"
                _hover={{ bg: 'gray.300' }}
              >
                .
              </Button>
              <Button
                onClick={() => handleNumberInput('0')}
                w="70px"
                h="70px"
                borderRadius="full"
                bg="gray.200"
                color="gray.800"
                fontSize="xl"
                fontWeight="semibold"
                _hover={{ bg: 'gray.300' }}
              >
                0
              </Button>
              <Button
                onClick={handleBackspace}
                w="70px"
                h="70px"
                borderRadius="full"
                bg="gray.200"
                color="gray.800"
                fontSize="xl"
                _hover={{ bg: 'gray.300' }}
              >
                <X size={24} />
              </Button>
            </HStack>
          </VStack>
        </VStack>

        <Box position="fixed" bottom={4} left={4} right={4} zIndex={100}>
          <Box
            bg="brand.400"
            borderRadius="full"
            h="60px"
            position="relative"
            overflow="hidden"
            onMouseDown={handleSwipeStart}
            onTouchStart={handleSwipeStart}
            cursor="grab"
            _active={{ cursor: 'grabbing' }}
            userSelect="none"
          >
            <Flex
              align="center"
              justify={swipeProgress > 50 ? 'flex-end' : 'flex-start'}
              h="full"
              px={4}
              transition="all 0.1s"
            >
              <Box
                w="50px"
                h="50px"
                borderRadius="full"
                bg="brand.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="absolute"
                left={swipeProgress > 50 ? 'auto' : `${8 + swipeProgress * 0.5}px`}
                right={swipeProgress > 50 ? `${8 + (100 - swipeProgress) * 0.5}px` : 'auto'}
                transition="all 0.1s"
                style={{ transform: `translateX(${swipeProgress * 0.3}px)` }}
              >
                {swipeProgress > 50 ? (
                  <ArrowRight size={24} color="white" />
                ) : (
                  <Box position="relative" w="20px" h="20px">
                    <Box
                      w="2px"
                      h="12px"
                      bg="white"
                      position="absolute"
                      left="4px"
                      top="4px"
                    />
                    <Box
                      w="2px"
                      h="8px"
                      bg="white"
                      position="absolute"
                      left="8px"
                      top="6px"
                    />
                    <Box
                      w="2px"
                      h="16px"
                      bg="white"
                      position="absolute"
                      left="12px"
                      top="2px"
                    />
                  </Box>
                )}
              </Box>
              {swipeProgress < 50 && (
                <Text
                  color="white"
                  fontWeight="semibold"
                  ml="70px"
                  fontSize="md"
                  transition="opacity 0.2s"
                  opacity={swipeProgress > 20 ? 0 : 1}
                >
                  SWIPE TO PAY
                </Text>
              )}
            </Flex>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

