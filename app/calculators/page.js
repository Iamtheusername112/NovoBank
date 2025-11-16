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
  IconButton,
  useBreakpointValue,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  SimpleGrid,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Calculator,
  TrendingUp,
  PiggyBank,
  CreditCard,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function CalculatorsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  // Loan Calculator
  const [loanCalc, setLoanCalc] = useState({
    principal: '',
    interest_rate: '',
    term_years: '',
  });

  // Savings Calculator
  const [savingsCalc, setSavingsCalc] = useState({
    initial_amount: '',
    monthly_contribution: '',
    interest_rate: '',
    years: '',
  });

  // Debt Payoff Calculator
  const [debtCalc, setDebtCalc] = useState({
    total_debt: '',
    monthly_payment: '',
    interest_rate: '',
  });

  const isMobile = useBreakpointValue({ base: true, md: false });

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
    } catch (error) {
      console.error('Error loading data:', error);
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

  const calculateLoan = () => {
    const principal = parseFloat(loanCalc.principal) || 0;
    const rate = parseFloat(loanCalc.interest_rate) || 0;
    const years = parseFloat(loanCalc.term_years) || 0;

    if (principal <= 0 || rate <= 0 || years <= 0) {
      return { monthly: 0, total: 0, interest: 0 };
    }

    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    const total = monthlyPayment * numPayments;
    const interest = total - principal;

    return {
      monthly: monthlyPayment,
      total: total,
      interest: interest,
    };
  };

  const calculateSavings = () => {
    const initial = parseFloat(savingsCalc.initial_amount) || 0;
    const monthly = parseFloat(savingsCalc.monthly_contribution) || 0;
    const rate = parseFloat(savingsCalc.interest_rate) || 0;
    const years = parseFloat(savingsCalc.years) || 0;

    if (years <= 0) {
      return { final: initial, contributions: 0, interest: 0 };
    }

    const monthlyRate = rate / 100 / 12;
    const numMonths = years * 12;
    
    // Future value of initial amount
    const futureValueInitial = initial * Math.pow(1 + monthlyRate, numMonths);
    
    // Future value of monthly contributions
    const futureValueContributions = monthly * 
      ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate);
    
    const final = futureValueInitial + futureValueContributions;
    const contributions = initial + (monthly * numMonths);
    const interest = final - contributions;

    return {
      final: final,
      contributions: contributions,
      interest: interest,
    };
  };

  const calculateDebtPayoff = () => {
    const debt = parseFloat(debtCalc.total_debt) || 0;
    const monthly = parseFloat(debtCalc.monthly_payment) || 0;
    const rate = parseFloat(debtCalc.interest_rate) || 0;

    if (debt <= 0 || monthly <= 0 || rate < 0) {
      return { months: 0, total: 0, interest: 0 };
    }

    const monthlyRate = rate / 100 / 12;
    
    if (monthlyRate === 0) {
      const months = Math.ceil(debt / monthly);
      return {
        months: months,
        total: debt,
        interest: 0,
      };
    }

    // Calculate months to pay off
    const months = -Math.log(1 - (debt * monthlyRate) / monthly) / Math.log(1 + monthlyRate);
    const total = monthly * Math.ceil(months);
    const interest = total - debt;

    return {
      months: Math.ceil(months),
      total: total,
      interest: interest,
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const loanResult = calculateLoan();
  const savingsResult = calculateSavings();
  const debtResult = calculateDebtPayoff();

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
          <Heading size="md">Financial Calculators</Heading>
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
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>Loan</Tab>
            <Tab>Savings</Tab>
            <Tab>Debt Payoff</Tab>
          </TabList>

          <TabPanels>
            {/* Loan Calculator */}
            <TabPanel px={0}>
              <Card>
                <CardBody>
                  <VStack spacing={6}>
                    <VStack spacing={4} w="full">
                      <FormControl>
                        <FormLabel>Loan Amount</FormLabel>
                        <Input
                          type="number"
                          value={loanCalc.principal}
                          onChange={(e) => setLoanCalc({ ...loanCalc, principal: e.target.value })}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Annual Interest Rate (%)</FormLabel>
                        <Input
                          type="number"
                          value={loanCalc.interest_rate}
                          onChange={(e) => setLoanCalc({ ...loanCalc, interest_rate: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Loan Term (Years)</FormLabel>
                        <Input
                          type="number"
                          value={loanCalc.term_years}
                          onChange={(e) => setLoanCalc({ ...loanCalc, term_years: e.target.value })}
                          placeholder="0"
                        />
                      </FormControl>
                    </VStack>

                    {(loanCalc.principal && loanCalc.interest_rate && loanCalc.term_years) && (
                      <>
                        <Divider />
                        <VStack spacing={3} w="full" align="stretch">
                          <Flex justify="space-between">
                            <Text fontWeight="semibold">Monthly Payment:</Text>
                            <Text fontSize="lg" fontWeight="bold" color="purple.600">
                              {formatCurrency(loanResult.monthly)}
                            </Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text>Total Amount Paid:</Text>
                            <Text fontWeight="semibold">{formatCurrency(loanResult.total)}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text>Total Interest:</Text>
                            <Text fontWeight="semibold" color="red.500">
                              {formatCurrency(loanResult.interest)}
                            </Text>
                          </Flex>
                        </VStack>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Savings Calculator */}
            <TabPanel px={0}>
              <Card>
                <CardBody>
                  <VStack spacing={6}>
                    <VStack spacing={4} w="full">
                      <FormControl>
                        <FormLabel>Initial Amount</FormLabel>
                        <Input
                          type="number"
                          value={savingsCalc.initial_amount}
                          onChange={(e) => setSavingsCalc({ ...savingsCalc, initial_amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Monthly Contribution</FormLabel>
                        <Input
                          type="number"
                          value={savingsCalc.monthly_contribution}
                          onChange={(e) => setSavingsCalc({ ...savingsCalc, monthly_contribution: e.target.value })}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Annual Interest Rate (%)</FormLabel>
                        <Input
                          type="number"
                          value={savingsCalc.interest_rate}
                          onChange={(e) => setSavingsCalc({ ...savingsCalc, interest_rate: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Years to Save</FormLabel>
                        <Input
                          type="number"
                          value={savingsCalc.years}
                          onChange={(e) => setSavingsCalc({ ...savingsCalc, years: e.target.value })}
                          placeholder="0"
                        />
                      </FormControl>
                    </VStack>

                    {(savingsCalc.years && (savingsCalc.initial_amount || savingsCalc.monthly_contribution)) && (
                      <>
                        <Divider />
                        <VStack spacing={3} w="full" align="stretch">
                          <Flex justify="space-between">
                            <Text fontWeight="semibold">Final Amount:</Text>
                            <Text fontSize="lg" fontWeight="bold" color="green.600">
                              {formatCurrency(savingsResult.final)}
                            </Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text>Total Contributions:</Text>
                            <Text fontWeight="semibold">{formatCurrency(savingsResult.contributions)}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text>Interest Earned:</Text>
                            <Text fontWeight="semibold" color="green.500">
                              {formatCurrency(savingsResult.interest)}
                            </Text>
                          </Flex>
                        </VStack>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Debt Payoff Calculator */}
            <TabPanel px={0}>
              <Card>
                <CardBody>
                  <VStack spacing={6}>
                    <VStack spacing={4} w="full">
                      <FormControl>
                        <FormLabel>Total Debt Amount</FormLabel>
                        <Input
                          type="number"
                          value={debtCalc.total_debt}
                          onChange={(e) => setDebtCalc({ ...debtCalc, total_debt: e.target.value })}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Monthly Payment</FormLabel>
                        <Input
                          type="number"
                          value={debtCalc.monthly_payment}
                          onChange={(e) => setDebtCalc({ ...debtCalc, monthly_payment: e.target.value })}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Annual Interest Rate (%)</FormLabel>
                        <Input
                          type="number"
                          value={debtCalc.interest_rate}
                          onChange={(e) => setDebtCalc({ ...debtCalc, interest_rate: e.target.value })}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </FormControl>
                    </VStack>

                    {(debtCalc.total_debt && debtCalc.monthly_payment) && (
                      <>
                        <Divider />
                        <VStack spacing={3} w="full" align="stretch">
                          <Flex justify="space-between">
                            <Text fontWeight="semibold">Months to Pay Off:</Text>
                            <Text fontSize="lg" fontWeight="bold" color="purple.600">
                              {debtResult.months} {debtResult.months === 1 ? 'month' : 'months'}
                            </Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text>Total Amount Paid:</Text>
                            <Text fontWeight="semibold">{formatCurrency(debtResult.total)}</Text>
                          </Flex>
                          <Flex justify="space-between">
                            <Text>Total Interest:</Text>
                            <Text fontWeight="semibold" color="red.500">
                              {formatCurrency(debtResult.interest)}
                            </Text>
                          </Flex>
                          {debtResult.months > 0 && (
                            <Alert status="info" borderRadius="md" mt={2}>
                              <AlertIcon />
                              <Text fontSize="sm">
                                Pay off in {Math.floor(debtResult.months / 12)} years and {debtResult.months % 12} months
                              </Text>
                            </Alert>
                          )}
                        </VStack>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

