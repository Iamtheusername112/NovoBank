'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Card,
  CardBody,
  Button,
  Badge,
  useToast,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  Plus,
  Repeat,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

export default function ScheduledPaymentsPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [scheduledPayments, setScheduledPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    setMounted(true);
    loadScheduledPayments();
  }, []);

  const loadScheduledPayments = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: paymentsData, error } = await supabase
        .from('scheduled_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('next_payment_date', { ascending: true });

      if (error) throw error;
      setScheduledPayments(paymentsData || []);

    } catch (error) {
      console.error('Error loading scheduled payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduled payments',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (payment, newStatus) => {
    try {
      const { error } = await supabase
        .from('scheduled_payments')
        .update({ status: newStatus })
        .eq('id', payment.id);

      if (error) throw error;

      toast({
        title: 'Payment Updated',
        description: `Payment ${newStatus === 'active' ? 'resumed' : 'paused'}`,
        status: 'success',
        duration: 2000,
      });

      loadScheduledPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;

    try {
      const { error } = await supabase
        .from('scheduled_payments')
        .delete()
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({
        title: 'Payment Deleted',
        description: 'Scheduled payment has been cancelled',
        status: 'success',
        duration: 2000,
      });

      onDeleteClose();
      setSelectedPayment(null);
      loadScheduledPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payment',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'paused':
        return 'orange';
      case 'completed':
        return 'blue';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <Box minH="100vh" bg={bgColor} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  const activePayments = scheduledPayments.filter(p => p.status === 'active');
  const pausedPayments = scheduledPayments.filter(p => p.status === 'paused');
  const completedPayments = scheduledPayments.filter(p => p.status === 'completed' || p.status === 'cancelled');

  return (
    <Box minH="100vh" bg={bgColor} pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Box px={4} py={4} bg={cardBg} borderBottom="1px" borderColor="gray.200">
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <IconButton
              icon={<ArrowLeft size={20} />}
              variant="ghost"
              onClick={() => router.back()}
              aria-label="Back"
            />
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              Scheduled Payments
            </Text>
          </HStack>
          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="purple"
            size="sm"
            onClick={() => router.push('/send-money?schedule=true')}
          >
            Schedule Payment
          </Button>
        </Flex>
      </Box>

      <Box px={4} py={4}>
        {/* Active Payments */}
        {activePayments.length > 0 && (
          <Box mb={6}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
              Active Payments
            </Text>
            <VStack spacing={3} align="stretch">
              {activePayments.map((payment) => {
                const daysUntil = getDaysUntil(payment.next_payment_date);
                const isDueSoon = daysUntil >= 0 && daysUntil <= 3;

                return (
                  <Card
                    key={payment.id}
                    bg={cardBg}
                    borderRadius="md"
                    borderLeft={isDueSoon ? '4px solid' : 'none'}
                    borderLeftColor="orange.500"
                  >
                    <CardBody p={4}>
                      <Flex justify="space-between" align="flex-start">
                        <VStack align="flex-start" spacing={2} flex={1}>
                          <HStack spacing={2}>
                            <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                              {payment.recipient_name}
                            </Text>
                            <Badge colorScheme={getStatusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                            {payment.is_recurring && (
                              <Badge colorScheme="purple" variant="outline">
                                <Repeat size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                {payment.frequency}
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                            {formatCurrency(payment.amount)}
                          </Text>
                          <HStack spacing={4} fontSize="sm" color="gray.600">
                            <HStack spacing={1}>
                              <Calendar size={16} />
                              <Text>Next: {formatDate(payment.next_payment_date)}</Text>
                            </HStack>
                            {daysUntil !== null && (
                              <Text>
                                {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days left`}
                              </Text>
                            )}
                          </HStack>
                          {payment.description && (
                            <Text fontSize="sm" color="gray.600">
                              {payment.description}
                            </Text>
                          )}
                        </VStack>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<Text>⋯</Text>}
                            variant="ghost"
                            aria-label="Payment options"
                            fontSize="xl"
                          />
                          <MenuList>
                            <MenuItem
                              icon={<Pause size={16} />}
                              onClick={() => handleToggleStatus(payment, 'paused')}
                            >
                              Pause
                            </MenuItem>
                            <MenuItem
                              icon={<Trash2 size={16} />}
                              onClick={() => {
                                setSelectedPayment(payment);
                                onDeleteOpen();
                              }}
                            >
                              Cancel
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                    </CardBody>
                  </Card>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* Paused Payments */}
        {pausedPayments.length > 0 && (
          <Box mb={6}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
              Paused Payments
            </Text>
            <VStack spacing={3} align="stretch">
              {pausedPayments.map((payment) => (
                <Card key={payment.id} bg={cardBg} borderRadius="md" opacity={0.8}>
                  <CardBody p={4}>
                    <Flex justify="space-between" align="flex-start">
                      <VStack align="flex-start" spacing={2} flex={1}>
                        <HStack spacing={2}>
                          <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                            {payment.recipient_name}
                          </Text>
                          <Badge colorScheme={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                          {formatCurrency(payment.amount)}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Next: {formatDate(payment.next_payment_date)}
                        </Text>
                      </VStack>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<Text>⋯</Text>}
                          variant="ghost"
                          aria-label="Payment options"
                          fontSize="xl"
                        />
                        <MenuList>
                          <MenuItem
                            icon={<Play size={16} />}
                            onClick={() => handleToggleStatus(payment, 'active')}
                          >
                            Resume
                          </MenuItem>
                          <MenuItem
                            icon={<Trash2 size={16} />}
                            onClick={() => {
                              setSelectedPayment(payment);
                              onDeleteOpen();
                            }}
                          >
                            Cancel
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </Box>
        )}

        {/* Completed/Cancelled Payments */}
        {completedPayments.length > 0 && (
          <Box>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
              Completed & Cancelled
            </Text>
            <VStack spacing={3} align="stretch">
              {completedPayments.slice(0, 5).map((payment) => (
                <Card key={payment.id} bg={cardBg} borderRadius="md" opacity={0.6}>
                  <CardBody p={4}>
                    <Flex justify="space-between" align="center">
                      <VStack align="flex-start" spacing={1}>
                        <HStack spacing={2}>
                          <Text fontSize="md" fontWeight="semibold" color="gray.800">
                            {payment.recipient_name}
                          </Text>
                          <Badge colorScheme={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="lg" fontWeight="bold" color="gray.800">
                          {formatCurrency(payment.amount)}
                        </Text>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </Box>
        )}

        {scheduledPayments.length === 0 && (
          <Box textAlign="center" py={12}>
            <Clock size={64} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
            <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={2}>
              No Scheduled Payments
            </Text>
            <Text color="gray.600" mb={4}>
              Schedule a payment to automatically send money
            </Text>
            <Button colorScheme="purple" onClick={() => router.push('/send-money?schedule=true')}>
              Schedule Your First Payment
            </Button>
          </Box>
        )}
      </Box>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cancel Scheduled Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to cancel this scheduled payment to{' '}
              <strong>{selectedPayment?.recipient_name}</strong>?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              No, Keep It
            </Button>
            <Button colorScheme="red" onClick={handleDeletePayment}>
              Yes, Cancel Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}


