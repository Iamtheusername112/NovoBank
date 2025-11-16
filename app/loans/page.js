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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Progress,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function LoansPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [loanApplications, setLoanApplications] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const { isOpen: isApplyOpen, onOpen: onApplyOpen, onClose: onApplyClose } = useDisclosure();
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [applicationForm, setApplicationForm] = useState({
    loan_type: 'personal',
    requested_amount: '',
    purpose: '',
    employment_status: '',
    annual_income: '',
  });

  const modalSize = useBreakpointValue({ base: 'full', md: 'lg' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan', icon: DollarSign, description: 'For personal expenses' },
    { value: 'auto', label: 'Auto Loan', icon: TrendingUp, description: 'Vehicle financing' },
    { value: 'home', label: 'Home Loan', icon: FileText, description: 'Mortgage or home equity' },
    { value: 'business', label: 'Business Loan', icon: FileText, description: 'Business financing' },
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

      // Load loan applications
      const { data: applicationsData } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (applicationsData) setLoanApplications(applicationsData);

      // Load active loans
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (loansData) setActiveLoans(loansData);

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

  const handleSubmitApplication = async () => {
    if (!applicationForm.loan_type || !applicationForm.requested_amount || !applicationForm.annual_income) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
      });
      return;
    }

    const requestedAmount = parseFloat(applicationForm.requested_amount);
    const annualIncome = parseFloat(applicationForm.annual_income);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid requested amount',
        status: 'error',
      });
      return;
    }

    if (isNaN(annualIncome) || annualIncome <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid annual income',
        status: 'error',
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('loan_applications')
        .insert({
          user_id: authUser.id,
          loan_type: applicationForm.loan_type,
          requested_amount: requestedAmount,
          purpose: applicationForm.purpose || null,
          employment_status: applicationForm.employment_status || null,
          annual_income: annualIncome,
          status: 'submitted',
        });

      if (error) throw error;

      toast({
        title: 'Application Submitted',
        description: 'Your loan application has been submitted and is under review',
        status: 'success',
      });

      setApplicationForm({
        loan_type: 'personal',
        requested_amount: '',
        purpose: '',
        employment_status: '',
        annual_income: '',
      });

      onApplyClose();
      loadUserData();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit application',
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
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'under_review':
        return Clock;
      case 'submitted':
        return Clock;
      case 'denied':
        return XCircle;
      default:
        return Clock;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateLoanProgress = (loan) => {
    const paid = parseFloat(loan.principal_amount) - parseFloat(loan.current_balance);
    return (paid / parseFloat(loan.principal_amount)) * 100;
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
          <Heading size="md">Loans</Heading>
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
        {/* Apply Button */}
        <Button
          leftIcon={<FileText size={18} />}
          colorScheme="purple"
          size="lg"
          w="full"
          mb={6}
          onClick={onApplyOpen}
        >
          Apply for a Loan
        </Button>

        {/* Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>Applications</Tab>
            <Tab>Active Loans</Tab>
          </TabList>

          <TabPanels>
            {/* Applications Tab */}
            <TabPanel px={0}>
              {loanApplications.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <Text color="gray.500">No loan applications yet</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {loanApplications.map((application) => {
                    const StatusIcon = getStatusIcon(application.status);
                    const loanType = loanTypes.find(t => t.value === application.loan_type);
                    
                    return (
                      <Card key={application.id} variant="outline">
                        <CardBody>
                          <VStack align="stretch" spacing={4}>
                            <Flex justify="space-between" align="start">
                              <VStack align="start" spacing={1}>
                                <HStack>
                                  <Text fontWeight="bold" fontSize="lg">
                                    {loanType?.label || application.loan_type}
                                  </Text>
                                  <Badge colorScheme={getStatusColor(application.status)} fontSize="xs">
                                    {application.status}
                                  </Badge>
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                  Requested: {formatCurrency(application.requested_amount)}
                                </Text>
                                {application.approved_amount && (
                                  <Text fontSize="sm" color="green.600" fontWeight="semibold">
                                    Approved: {formatCurrency(application.approved_amount)}
                                  </Text>
                                )}
                                {application.interest_rate && (
                                  <Text fontSize="sm" color="gray.600">
                                    Interest Rate: {(application.interest_rate * 100).toFixed(2)}%
                                  </Text>
                                )}
                              </VStack>
                              <StatusIcon size={24} color={`var(--chakra-colors-${getStatusColor(application.status)}-500)`} />
                            </Flex>
                            <Divider />
                            <HStack justify="space-between" fontSize="sm">
                              <Text color="gray.600">
                                Applied: {formatDate(application.created_at)}
                              </Text>
                              {application.purpose && (
                                <Text color="gray.600">
                                  Purpose: {application.purpose}
                                </Text>
                              )}
                            </HStack>
                            {application.admin_notes && (
                              <>
                                <Divider />
                                <Text fontSize="sm" color="blue.600">
                                  <strong>Note:</strong> {application.admin_notes}
                                </Text>
                              </>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </VStack>
              )}
            </TabPanel>

            {/* Active Loans Tab */}
            <TabPanel px={0}>
              {activeLoans.length === 0 ? (
                <Card>
                  <CardBody>
                    <VStack py={8} spacing={2}>
                      <Text color="gray.500">No active loans</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {activeLoans.map((loan) => {
                    const progress = calculateLoanProgress(loan);
                    const loanType = loanTypes.find(t => t.value === loan.loan_type);
                    
                    return (
                      <Card key={loan.id} variant="outline">
                        <CardBody>
                          <VStack align="stretch" spacing={4}>
                            <Flex justify="space-between" align="start">
                              <VStack align="start" spacing={1}>
                                <Text fontWeight="bold" fontSize="lg">
                                  {loanType?.label || loan.loan_type}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  Original Amount: {formatCurrency(loan.principal_amount)}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  Current Balance: {formatCurrency(loan.current_balance)}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  Interest Rate: {(loan.interest_rate * 100).toFixed(2)}%
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  Monthly Payment: {formatCurrency(loan.monthly_payment)}
                                </Text>
                              </VStack>
                              <Badge colorScheme={loan.status === 'active' ? 'green' : 'gray'} fontSize="xs">
                                {loan.status}
                              </Badge>
                            </Flex>
                            <Divider />
                            <VStack align="stretch" spacing={2}>
                              <Flex justify="space-between" fontSize="sm">
                                <Text color="gray.600">Payment Progress</Text>
                                <Text fontWeight="semibold">{progress.toFixed(1)}%</Text>
                              </Flex>
                              <Progress value={progress} colorScheme="green" size="lg" borderRadius="full" />
                            </VStack>
                            {loan.next_payment_date && (
                              <HStack justify="space-between" fontSize="sm">
                                <Text color="gray.600">
                                  Next Payment: {formatDate(loan.next_payment_date)}
                                </Text>
                                <Text fontWeight="semibold">
                                  {formatCurrency(loan.monthly_payment)}
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Apply for Loan Modal */}
      <Modal isOpen={isApplyOpen} onClose={onApplyClose} size={modalSize}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Apply for a Loan</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Loan Type *</FormLabel>
                <Select
                  value={applicationForm.loan_type}
                  onChange={(e) => setApplicationForm({ ...applicationForm, loan_type: e.target.value })}
                >
                  {loanTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Requested Amount *</FormLabel>
                <Input
                  type="number"
                  value={applicationForm.requested_amount}
                  onChange={(e) => setApplicationForm({ ...applicationForm, requested_amount: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Purpose</FormLabel>
                <Input
                  value={applicationForm.purpose}
                  onChange={(e) => setApplicationForm({ ...applicationForm, purpose: e.target.value })}
                  placeholder="What will you use this loan for?"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Employment Status</FormLabel>
                <Select
                  value={applicationForm.employment_status}
                  onChange={(e) => setApplicationForm({ ...applicationForm, employment_status: e.target.value })}
                  placeholder="Select employment status"
                >
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                  <option value="student">Student</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Annual Income *</FormLabel>
                <Input
                  type="number"
                  value={applicationForm.annual_income}
                  onChange={(e) => setApplicationForm({ ...applicationForm, annual_income: e.target.value })}
                  placeholder="0.00"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onApplyClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSubmitApplication}>
              Submit Application
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

