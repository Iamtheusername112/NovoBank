'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Input,
  Select,
  Textarea,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Badge,
  IconButton,
  useBreakpointValue,
  Heading,
  Divider,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  Upload,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function DisputesPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isDisputeOpen, onOpen: onDisputeOpen, onClose: onDisputeClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [disputeForm, setDisputeForm] = useState({
    transaction_id: '',
    dispute_type: 'fraudulent',
    reason: '',
    evidence_urls: [],
  });

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const modalSize = useBreakpointValue({ base: 'full', md: 'lg' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  const disputeTypes = [
    { value: 'fraudulent', label: 'Fraudulent Transaction' },
    { value: 'unauthorized', label: 'Unauthorized Charge' },
    { value: 'duplicate', label: 'Duplicate Charge' },
    { value: 'incorrect_amount', label: 'Incorrect Amount' },
    { value: 'merchant_error', label: 'Merchant Error' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadUserData();
      loadNotificationCounts();
    }
  }, [mounted]);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsData) setTransactions(transactionsData);

      // Load disputes
      const { data: disputesData } = await supabase
        .from('transaction_disputes')
        .select('*, transactions(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (disputesData) setDisputes(disputesData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        status: 'error',
      });
    }
  };

  const loadNotificationCounts = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      const { data: alerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      setUnreadNotificationCount(notifications?.length || 0);
      setUnreadAlertCount(alerts?.length || 0);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${authUser.id}/disputes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dispute-evidence')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, return object URL as fallback
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
          console.warn('Dispute-evidence bucket not found. Please create it in Supabase Dashboard > Storage.');
          return URL.createObjectURL(file);
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('dispute-evidence')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      // Fallback: return object URL if storage fails
      return URL.createObjectURL(file);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputeForm.transaction_id || !disputeForm.reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('transaction_disputes')
        .insert({
          user_id: authUser.id,
          transaction_id: disputeForm.transaction_id,
          dispute_type: disputeForm.dispute_type,
          reason: disputeForm.reason,
          evidence_urls: disputeForm.evidence_urls,
          status: 'submitted',
        });

      if (error) throw error;

      toast({
        title: 'Dispute Submitted',
        description: 'Your dispute has been submitted and is under review',
        status: 'success',
      });

      setDisputeForm({
        transaction_id: '',
        dispute_type: 'fraudulent',
        reason: '',
        evidence_urls: [],
      });
      setSelectedTransaction(null);

      onDisputeClose();
      loadUserData();
    } catch (error) {
      console.error('Error submitting dispute:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit dispute',
        status: 'error',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'green';
      case 'under_review':
        return 'blue';
      case 'submitted':
        return 'yellow';
      case 'denied':
        return 'red';
      case 'resolved':
        return 'purple';
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!mounted) return null;

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Flex
        px={4}
        py={4}
        bg="white"
        borderBottom="1px solid"
        borderColor="gray.200"
        align="center"
        justify="space-between"
      >
        <HStack spacing={3}>
          <IconButton
            icon={<ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />}
            onClick={() => router.back()}
            variant="ghost"
            aria-label="Back"
          />
          <Heading size="md">Transaction Disputes</Heading>
        </HStack>
        <HStack spacing={2}>
          {isMobile ? (
            <IconButton
              icon={<MessageCircle size={20} />}
              onClick={onContactOpen}
              variant="ghost"
              aria-label="Contact Us"
            />
          ) : (
            <Button size="sm" variant="outline" onClick={onContactOpen}>
              Contact Us
            </Button>
          )}
          <NotificationBell count={unreadNotificationCount + unreadAlertCount} />
        </HStack>
      </Flex>

      <Box px={4} py={6}>
        {/* File Dispute Button */}
        <Button
          leftIcon={<AlertTriangle size={18} />}
          colorScheme="red"
          size="lg"
          w="full"
          mb={6}
          onClick={onDisputeOpen}
        >
          File a Dispute
        </Button>

        {/* Active Disputes */}
        <Card mb={6}>
          <CardBody>
            <Heading size="sm" mb={4}>Your Disputes</Heading>
            {disputes.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="gray.500">No disputes filed</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {disputes.map((dispute) => (
                  <Card key={dispute.id} variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <Flex justify="space-between" align="start">
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <Text fontWeight="semibold">
                                {disputeTypes.find(t => t.value === dispute.dispute_type)?.label || dispute.dispute_type}
                              </Text>
                              <Badge colorScheme={getStatusColor(dispute.status)} fontSize="xs">
                                {dispute.status}
                              </Badge>
                            </HStack>
                            {dispute.transactions && (
                              <Text fontSize="sm" color="gray.600">
                                Transaction: {formatCurrency(dispute.transactions.amount)} - {dispute.transactions.description}
                              </Text>
                            )}
                            <Text fontSize="sm" color="gray.600">
                              Filed: {formatDate(dispute.created_at)}
                            </Text>
                          </VStack>
                        </Flex>
                        <Divider />
                        <Text fontSize="sm">
                          <strong>Reason:</strong> {dispute.reason}
                        </Text>
                        {dispute.admin_notes && (
                          <>
                            <Divider />
                            <Text fontSize="sm" color="blue.600">
                              <strong>Admin Response:</strong> {dispute.admin_notes}
                            </Text>
                          </>
                        )}
                        {dispute.resolution_date && (
                          <Text fontSize="xs" color="gray.500">
                            Resolved: {formatDate(dispute.resolution_date)}
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      {/* File Dispute Modal */}
      <Modal isOpen={isDisputeOpen} onClose={onDisputeClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>File a Dispute</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Select Transaction *</FormLabel>
                <Select
                  value={disputeForm.transaction_id}
                  onChange={(e) => {
                    const transaction = transactions.find(t => t.id === e.target.value);
                    setSelectedTransaction(transaction);
                    setDisputeForm({ ...disputeForm, transaction_id: e.target.value });
                  }}
                  placeholder="Choose a transaction"
                >
                  {transactions
                    .filter(t => t.amount < 0) // Only show debits
                    .map((transaction) => (
                      <option key={transaction.id} value={transaction.id}>
                        {formatCurrency(transaction.amount)} - {transaction.description} - {formatDate(transaction.created_at)}
                      </option>
                    ))}
                </Select>
              </FormControl>

              {selectedTransaction && (
                <Card variant="outline" w="full">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontWeight="semibold">Transaction Details</Text>
                      <Text fontSize="sm">Amount: {formatCurrency(selectedTransaction.amount)}</Text>
                      <Text fontSize="sm">Description: {selectedTransaction.description}</Text>
                      <Text fontSize="sm">Date: {formatDate(selectedTransaction.created_at)}</Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              <FormControl>
                <FormLabel>Dispute Type *</FormLabel>
                <Select
                  value={disputeForm.dispute_type}
                  onChange={(e) => setDisputeForm({ ...disputeForm, dispute_type: e.target.value })}
                >
                  {disputeTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Reason for Dispute *</FormLabel>
                <Textarea
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  placeholder="Please provide details about why you're disputing this transaction..."
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Upload Evidence (Optional)</FormLabel>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    try {
                      const urls = await Promise.all(files.map(file => handleFileUpload(file)));
                      setDisputeForm({
                        ...disputeForm,
                        evidence_urls: [...disputeForm.evidence_urls, ...urls],
                      });
                      toast({
                        title: 'Files uploaded',
                        status: 'success',
                      });
                    } catch (error) {
                      toast({
                        title: 'Upload failed',
                        description: 'Failed to upload files',
                        status: 'error',
                      });
                    }
                  }}
                />
                {disputeForm.evidence_urls.length > 0 && (
                  <VStack align="start" mt={2} spacing={1}>
                    {disputeForm.evidence_urls.map((url, index) => (
                      <Text key={index} fontSize="xs" color="green.600">
                        ✓ File {index + 1} uploaded
                      </Text>
                    ))}
                  </VStack>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDisputeClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleSubmitDispute}>
              Submit Dispute
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

