'use client';

import { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Input,
  Button,
  useToast,
} from '@chakra-ui/react';
import { X, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatusBar from '@/components/StatusBar';

export default function AuthPage() {
  const [pin, setPin] = useState('');
  const router = useRouter();
  const toast = useToast();

  const handlePinInput = (value) => {
    if (pin.length < 4) {
      setPin(pin + value);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      // TODO: Validate PIN with Supabase
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
        status: 'success',
        duration: 2000,
      });
      setTimeout(() => {
        router.push('/wallet');
      }, 500);
    } else {
      toast({
        title: 'Invalid PIN',
        description: 'Please enter a 4-digit PIN',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const handleFingerprint = () => {
    // TODO: Implement fingerprint authentication
    toast({
      title: 'Fingerprint authentication',
      description: 'Fingerprint authentication coming soon',
      status: 'info',
      duration: 2000,
    });
  };

  return (
    <Box minH="100vh" bg="gray.100">
      <StatusBar />
      <Flex
        direction="column"
        align="center"
        justify="center"
        minH="calc(100vh - 60px)"
        px={6}
        py={8}
      >
        <VStack spacing={8} w="full" maxW="400px">
          <VStack spacing={4}>
            <Box
              bg="gray.200"
              borderRadius="full"
              p={6}
              onClick={handleFingerprint}
              cursor="pointer"
            >
              <Fingerprint size={48} color="#666" />
            </Box>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              enter pin code or use fingerprint
            </Text>
          </VStack>

          <HStack spacing={2} w="full" justify="center">
            <Input
              value={pin}
              readOnly
              maxLength={4}
              w="200px"
              h="50px"
              bg="gray.200"
              borderRadius="md"
              textAlign="center"
              letterSpacing="8px"
              fontSize="xl"
              fontWeight="bold"
              border="none"
              _focus={{ boxShadow: 'none' }}
            />
            {pin.length > 0 && (
              <IconButton
                icon={<X size={20} />}
                onClick={handleClear}
                borderRadius="full"
                bg="gray.300"
                aria-label="Clear PIN"
              />
            )}
          </HStack>

          <VStack spacing={3} w="full">
            {[1, 2, 3].map((row) => (
              <HStack key={row} spacing={3} justify="center" w="full">
                {[1, 2, 3].map((num) => {
                  const value = (row - 1) * 3 + num;
                  return (
                    <Button
                      key={value}
                      onClick={() => handlePinInput(value.toString())}
                      w="60px"
                      h="60px"
                      borderRadius="full"
                      bg="gray.200"
                      color="gray.800"
                      fontSize="xl"
                      fontWeight="semibold"
                      _hover={{ bg: 'gray.300' }}
                    >
                      {value}
                    </Button>
                  );
                })}
              </HStack>
            ))}
            <HStack spacing={3} justify="center" w="full">
              <Button
                onClick={() => handlePinInput('.')}
                w="60px"
                h="60px"
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
                onClick={() => handlePinInput('0')}
                w="60px"
                h="60px"
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
                w="60px"
                h="60px"
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

          {pin.length === 4 && (
            <Button
              onClick={handleSubmit}
              w="full"
              bg="brand.600"
              color="white"
              _hover={{ bg: 'brand.700' }}
              mt={4}
            >
              Submit
            </Button>
          )}
        </VStack>
      </Flex>
    </Box>
  );
}

