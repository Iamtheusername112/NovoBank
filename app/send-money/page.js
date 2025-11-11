'use client';

import { useState, useEffect, useMemo } from 'react';
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
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useBreakpointValue,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Select,
  Switch,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepNumber,
  StepIcon,
  StepSeparator,
  StepTitle,
  StepDescription,
  Divider,
  Textarea,
  Tag,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { ArrowLeft, X, ArrowRight, QrCode, Clock } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';

function SendMoneyContent() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.100', 'gray.900');
  
  const [amount, setAmount] = useState('0');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [recipient, setRecipient] = useState({ id: null, name: '', account: '', bank: '' });
  const [accounts, setAccounts] = useState([]);
  const [recipientContacts, setRecipientContacts] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [recipientForm, setRecipientForm] = useState({
    name: '',
    accountNumber: '',
    bankName: '',
  });
  const [recipientErrors, setRecipientErrors] = useState({
    name: '',
    accountNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const [transferPurpose, setTransferPurpose] = useState('personal');
  const [deliverySpeed, setDeliverySpeed] = useState('standard');
  const stepperOrientation = useBreakpointValue({ base: 'vertical', md: 'horizontal' }) || 'vertical';
  const linkAccountDisclosure = useDisclosure();
  const { isOpen: isLinkModalOpen, onOpen: onLinkOpen, onClose: onLinkClose } = linkAccountDisclosure;
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [linkForm, setLinkForm] = useState({
    accountNickname: '',
    accountNumber: '',
    accountType: 'checking',
    currency: 'USD',
    initialBalance: '',
  });
  const [linkErrors, setLinkErrors] = useState({
    bank: '',
    accountNumber: '',
    nickname: '',
  });
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const steps = [
    {
      title: 'Recipient',
      description: 'Choose or add a contact',
    },
    {
      title: 'Details',
      description: 'Amount, source account & options',
    },
    {
      title: 'Review',
      description: 'Confirm and send securely',
    },
  ];

  const deliveryOptions = {
    standard: {
      label: 'Standard (1-2 business days)',
      fee: 0,
      description: 'No additional fees',
    },
    express: {
      label: 'Express (same-day)',
      fee: 1.99,
      description: 'Funds typically arrive by end of day',
    },
    instant: {
      label: 'Instant',
      fee: 4.99,
      description: 'Funds arrive within minutes',
    },
  };

  const purposeOptions = [
    { value: 'personal', label: 'Personal Transfer' },
    { value: 'rent', label: 'Rent or Mortgage' },
    { value: 'bills', label: 'Bills & Utilities' },
    { value: 'family', label: 'Family Support' },
    { value: 'business', label: 'Business Expense' },
  ];

  const currencyOptions = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NGN', 'ZAR', 'INR'];

  const globalBankDirectory = useMemo(
    () => [
      'Bank of America',
      'JPMorgan Chase',
      'Citibank',
      'Wells Fargo',
      'Goldman Sachs',
      'Morgan Stanley',
      'HSBC',
      'Barclays',
      'Lloyds Bank',
      'Santander',
      'Deutsche Bank',
      'BNP Paribas',
      'Credit Suisse',
      'UBS',
      'ING Bank',
      'Rabobank',
      'Societe Generale',
      'Standard Chartered',
      'Royal Bank of Canada',
      'Toronto-Dominion Bank',
      'Scotiabank',
      'Banco do Brasil',
      'Itau Unibanco',
      'Bradesco',
      'Banco Santander Mexico',
      'BBVA',
      'CaixaBank',
      'Intesa Sanpaolo',
      'UniCredit',
      'Banco Popular',
      'Bank Mandiri',
      'Bank Central Asia',
      'Industrial and Commercial Bank of China',
      'China Construction Bank',
      'Bank of China',
      'Agricultural Bank of China',
      'State Bank of India',
      'HDFC Bank',
      'ICICI Bank',
      'Axis Bank',
      'Kotak Mahindra Bank',
      'Bank of Montreal',
      'Australia and New Zealand Banking Group',
      'Commonwealth Bank',
      'Westpac',
      'National Australia Bank',
      'First National Bank (South Africa)',
      'Standard Bank',
      'Nedbank',
      'Absa Bank',
      'Emirates NBD',
      'Qatar National Bank',
      'Mashreq Bank',
      'Banco de Chile',
      'Banco Itau Chile',
      'Bank Rakyat Indonesia',
      'Habib Bank',
      'Kiwibank',
      'Banco Macro',
      'Banorte',
      'Banco do Estado do Rio Grande do Sul',
      'Kenya Commercial Bank',
      'National Bank of Egypt',
      'Ziraat Bank',
      'Danske Bank',
      'Skandinaviska Enskilda Banken',
      'Nordea Bank',
    ],
    []
  );

  const filteredBanks = useMemo(() => {
    if (!bankSearch) {
      return globalBankDirectory;
    }
    const query = bankSearch.toLowerCase();
    return globalBankDirectory.filter((bank) => bank.toLowerCase().includes(query));
  }, [bankSearch, globalBankDirectory]);

  // Schedule payment states
  const { isOpen: isScheduleOpen, onOpen: onScheduleOpen, onClose: onScheduleClose } = useDisclosure();
  const { isOpen: isQROpen, onOpen: onQROpen, onClose: onQRClose } = useDisclosure();
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    is_recurring: false,
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: '',
  });
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    setMounted(true);
    loadAccountsAndRecipients();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('schedule') === 'true') {
        setIsScheduled(true);
      }
    }
  }, []);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  useEffect(() => {
    if (isScheduled && transferNote && !scheduleForm.description) {
      setScheduleForm((prev) => ({
        ...prev,
        description: transferNote,
      }));
    }
  }, [isScheduled, transferNote, scheduleForm.description]);

  const loadAccountsAndRecipients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      setAccounts(accountsData || []);

      // Load saved recipients
      const { data: recipientsData } = await supabase
        .from('recipient_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });

      const mappedRecipients = (recipientsData || []).map((contact) => ({
        id: contact.id,
        name: contact.name,
        account: contact.account_number,
        bank: contact.bank_name || '',
        last_used_at: contact.last_used_at,
      }));

      setRecipientContacts(mappedRecipients);

      if (mappedRecipients.length > 0) {
        const first = mappedRecipients[0];
        setSelectedRecipientId(first.id);
        setRecipient({
          id: first.id,
          name: first.name,
          account: first.account,
          bank: first.bank,
        });
        setIsAddingRecipient(false);
        setRecipientForm({ name: '', accountNumber: '', bankName: '' });
      } else {
        setSelectedRecipientId('');
        setRecipient({ id: null, name: '', account: '', bank: '' });
        setIsAddingRecipient(true);
      }

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setNotifications(notificationsData || []);

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load send money data.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const resetLinkAccountState = () => {
    setBankSearch('');
    setSelectedBank('');
    setLinkForm({
      accountNickname: '',
      accountNumber: '',
      accountType: 'checking',
      currency: 'USD',
      initialBalance: '',
    });
    setLinkErrors({
      bank: '',
      accountNumber: '',
      nickname: '',
    });
  };

  const handleOpenLinkModal = () => {
    resetLinkAccountState();
    onLinkOpen();
  };

  const handleBankSelection = (bankName) => {
    setSelectedBank(bankName);
    setLinkErrors((prev) => ({ ...prev, bank: '' }));
    setLinkForm((prev) => ({
      ...prev,
      accountNickname: prev.accountNickname || bankName,
    }));
  };

  const handleLinkInputChange = (field) => (event) => {
    let value = event.target.value;
    if (field === 'accountNumber') {
      value = value.replace(/\s+/g, '');
    }
    if (field === 'initialBalance' && Number(value) < 0) {
      value = '0';
    }
    setLinkForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'accountNickname') {
      setLinkErrors((prev) => ({ ...prev, nickname: '' }));
    }
    if (field === 'accountNumber') {
      setLinkErrors((prev) => ({ ...prev, accountNumber: '' }));
    }
  };

  const handleCloseLinkModal = () => {
    if (linkingAccount) return;
    resetLinkAccountState();
    onLinkClose();
  };

  const handleSubmitLinkAccount = async () => {
    const nickname = linkForm.accountNickname.trim();
    const accountNumber = linkForm.accountNumber.trim();
    const errors = {
      bank: selectedBank ? '' : 'Select a bank to continue',
      accountNumber: accountNumber ? '' : 'Account number is required',
      nickname: nickname ? '' : 'Nickname is required',
    };
    setLinkErrors(errors);
    if (errors.bank || errors.accountNumber || errors.nickname) {
      return;
    }

    setLinkingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Session expired. Please sign in again.');
      }

      const initialBalanceValue = parseFloat(linkForm.initialBalance || '0') || 0;
      const payload = {
        user_id: user.id,
        account_type: linkForm.accountType,
        account_number: accountNumber,
        account_name: nickname,
        balance: initialBalanceValue,
        currency: linkForm.currency,
        is_primary: accounts.length === 0,
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('Unable to link account right now. Please try again.');
      }

      setAccounts((prev) => [data, ...prev]);
      setSelectedAccount(data.id);
      toast({
        title: 'Bank account linked',
        description: `${nickname} has been added to your wallet.`,
        status: 'success',
        duration: 3000,
      });
      resetLinkAccountState();
      onLinkClose();
    } catch (error) {
      console.error('Link account error:', error);
      toast({
        title: 'Failed to link account',
        description: error.message || 'We could not link this account. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLinkingAccount(false);
    }
  };

  const maskAccountNumber = (value) => {
    if (!value) return '****';
    const trimmed = value.toString().replace(/\s+/g, '');
    const lastFour = trimmed.slice(-4);
    return `**** ${lastFour.padStart(4, '*')}`;
  };

  const handleRecipientSelection = (id) => {
    if (!id) {
      setSelectedRecipientId('');
      setRecipient({ id: null, name: '', account: '', bank: '' });
      setRecipientForm({ name: '', accountNumber: '', bankName: '' });
      setIsAddingRecipient(true);
      return;
    }

    setSelectedRecipientId(id);
    setIsAddingRecipient(false);
    setRecipientErrors({ name: '', accountNumber: '' });

    const selected = recipientContacts.find((contact) => contact.id === id);
    if (selected) {
      setRecipient({
        id: selected.id,
        name: selected.name,
        account: selected.account,
        bank: selected.bank,
      });
      setRecipientForm({ name: '', accountNumber: '', bankName: '' });
    }
  };

  const handleRecipientFieldChange = (field) => (event) => {
    let value = event.target.value;

    if (field === 'accountNumber') {
      value = value.replace(/\s+/g, '');
    }

    if (field === 'name') {
      setRecipientErrors((prev) => ({ ...prev, name: '' }));
    } else if (field === 'accountNumber') {
      setRecipientErrors((prev) => ({ ...prev, accountNumber: '' }));
    }

    setRecipientForm((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      setRecipient({
        id: null,
        name: updated.name,
        account: updated.accountNumber,
        bank: updated.bankName,
      });
      return updated;
    });
  };

  const getOrCreateRecipientContact = async (userId) => {
    const nowIso = new Date().toISOString();

    if (isAddingRecipient || !selectedRecipientId) {
      const name = recipientForm.name.trim();
      const accountNumber = recipientForm.accountNumber.trim();
      const bankName = recipientForm.bankName.trim();

      const errors = {
        name: name ? '' : 'Recipient name is required',
        accountNumber: accountNumber ? '' : 'Account number is required',
      };

      setRecipientErrors(errors);

      if (!name || !accountNumber) {
        throw new Error(errors.name || errors.accountNumber);
      }

      const { data, error } = await supabase
        .from('recipient_contacts')
        .upsert(
          {
            user_id: userId,
            name,
            account_number: accountNumber,
            bank_name: bankName || null,
            last_used_at: nowIso,
          },
          { onConflict: 'user_id,account_number' }
        )
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Unable to save recipient details');
      }

      const mapped = {
        id: data.id,
        name: data.name,
        account: data.account_number,
        bank: data.bank_name || '',
        last_used_at: data.last_used_at,
      };

      setRecipientContacts((prev) => {
        const filtered = prev.filter((contact) => contact.id !== mapped.id);
        return [mapped, ...filtered];
      });

      setSelectedRecipientId(mapped.id);
      setRecipient(mapped);
      setIsAddingRecipient(false);
      setRecipientForm({ name: '', accountNumber: '', bankName: '' });
      setRecipientErrors({ name: '', accountNumber: '' });

      return mapped;
    }

    const existing = recipientContacts.find((contact) => contact.id === selectedRecipientId);
    if (!existing) {
      throw new Error('Recipient not found');
    }

    const { data, error } = await supabase
      .from('recipient_contacts')
      .update({ last_used_at: nowIso })
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    const updated = data
      ? {
          id: data.id,
          name: data.name,
          account: data.account_number,
          bank: data.bank_name || '',
          last_used_at: data.last_used_at,
        }
      : { ...existing, last_used_at: nowIso };

    setRecipientContacts((prev) => {
      const filtered = prev.filter((contact) => contact.id !== updated.id);
      return [updated, ...filtered];
    });

    setRecipient(updated);
    return updated;
  };

  const validateRecipientStep = () => {
    if (isAddingRecipient || !selectedRecipientId) {
      const name = recipientForm.name.trim();
      const accountNumber = recipientForm.accountNumber.trim();
      const bankName = recipientForm.bankName.trim();

      const errors = {
        name: name ? '' : 'Recipient name is required',
        accountNumber: accountNumber ? '' : 'Account number is required',
      };

      setRecipientErrors(errors);

      if (!name || !accountNumber) {
        toast({
          title: 'Recipient details needed',
          description: 'Please provide the recipient name and account number to continue.',
          status: 'warning',
          duration: 3000,
        });
        return false;
      }

      setRecipient({
        id: null,
        name,
        account: accountNumber,
        bank: bankName,
      });

      return true;
    }

    if (!selectedRecipientId) {
      toast({
        title: 'Select a recipient',
        description: 'Choose a saved recipient or add a new one to continue.',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }

    const selected = recipientContacts.find((contact) => contact.id === selectedRecipientId);
    if (!selected) {
      toast({
        title: 'Recipient not found',
        description: 'Please pick a different saved recipient or add a new one.',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }

    setRecipient({
      id: selected.id,
      name: selected.name,
      account: selected.account,
      bank: selected.bank,
    });

    return true;
  };

  const validateTransferDetails = () => {
    const paymentAmount = parseFloat(amount);

    if (!recipient.name) {
      toast({
        title: 'Recipient missing',
        description: 'Please choose who you are sending money to.',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }

    if (!selectedAccount) {
      toast({
        title: 'Choose an account',
        description: 'Select which account to debit for this transfer.',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }

    if (!amount || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter an amount greater than zero.',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateRecipientStep()) {
      return;
    }
    if (currentStep === 2 && !validateTransferDetails()) {
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, totalSteps));
  };

  const handlePreviousStep = () => {
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  };

  const handleConfirmTransfer = async () => {
    if (loading) {
      return;
    }

    if (!validateRecipientStep()) {
      setCurrentStep(1);
      return;
    }

    if (!validateTransferDetails()) {
      setCurrentStep(2);
      return;
    }

    if (isScheduled) {
      await handleSchedulePayment();
    } else {
      await handlePayment();
    }
  };

  const handleAmountInputChange = (value) => {
    const sanitized = value.replace(/[^\d.]/g, '');
    const segments = sanitized.split('.');
    const formatted =
      segments.length > 1
        ? `${segments[0]}.${segments[1].slice(0, 2)}`
        : segments[0];

    if (!formatted) {
      setAmount('0');
      return;
    }

    setAmount(formatted.startsWith('.') ? `0${formatted}` : formatted);
  };

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

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (!selectedAccount || Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: 'Transfer details incomplete',
        description: 'Select an account and enter a valid amount to continue.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User session expired. Please log in again.');
      }

      const account = accounts.find((a) => a.id === selectedAccount);
      if (!account) {
        throw new Error('Payment account not found');
      }

      const fee = deliveryOptions[deliverySpeed]?.fee || 0;
      const totalDebit = paymentAmount + fee;
      const currentBalance = parseFloat(account.balance);

      if (totalDebit > currentBalance) {
        toast({
          title: 'Insufficient funds',
          description: `You need ${formatCurrency(totalDebit)} available including fees.`,
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const recipientContact = await getOrCreateRecipientContact(user.id);
      const purposeLabel =
        purposeOptions.find((option) => option.value === transferPurpose)?.label || 'Transfer';
      const description =
        transferNote?.trim().length > 0
          ? transferNote.trim()
          : `${purposeLabel} to ${recipientContact.name}`;

      const newBalance = currentBalance - totalDebit;
      await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', selectedAccount);

      const transactionsPayload = [
        {
          user_id: user.id,
          amount: -paymentAmount,
          transaction_type: 'sent',
          category: purposeLabel,
          description,
          recipient_name: recipientContact.name,
          recipient_account: recipientContact.account,
          status: 'completed',
        },
      ];

      if (fee > 0) {
        transactionsPayload.push({
          user_id: user.id,
          amount: -fee,
          transaction_type: 'fee',
          category: 'Transfer Fee',
          description: `${deliveryOptions[deliverySpeed].label} surcharge`,
          status: 'completed',
        });
      }

      await supabase.from('transactions').insert(transactionsPayload);

      const formattedAmount = formatCurrency(paymentAmount);
      const formattedTotal = formatCurrency(totalDebit);
      const formattedFee = formatCurrency(fee);

      toast({
        title: 'Transfer scheduled for processing',
        description:
          fee > 0
            ? `${formattedTotal} debited (includes ${formattedFee} transfer fee).`
            : `${formattedAmount} sent to ${recipientContact.name}.`,
        status: 'success',
        duration: 3500,
      });

      setTimeout(() => {
        router.push('/wallet');
      }, 1800);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment failed',
        description: error.message || 'We could not process your transfer. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePayment = async () => {
    if (parseFloat(amount) <= 0 || !selectedAccount) {
      toast({
        title: 'Error',
        description: 'Please enter amount and select account',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const recipientContact = await getOrCreateRecipientContact(user.id);

      // Calculate next payment date
      const startDate = new Date(scheduleForm.start_date);
      let nextPaymentDate = new Date(startDate);

      if (scheduleForm.is_recurring) {
        switch (scheduleForm.frequency) {
          case 'daily':
            nextPaymentDate.setDate(startDate.getDate() + 1);
            break;
          case 'weekly':
            nextPaymentDate.setDate(startDate.getDate() + 7);
            break;
          case 'biweekly':
            nextPaymentDate.setDate(startDate.getDate() + 14);
            break;
          case 'monthly':
            nextPaymentDate.setMonth(startDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextPaymentDate.setMonth(startDate.getMonth() + 3);
            break;
          case 'yearly':
            nextPaymentDate.setFullYear(startDate.getFullYear() + 1);
            break;
        }
      }

      const scheduleDescription =
        scheduleForm.description?.trim() ||
        transferNote?.trim() ||
        `Scheduled payment to ${recipientContact.name}`;

      const { error } = await supabase
        .from('scheduled_payments')
        .insert({
          user_id: user.id,
          recipient_name: recipientContact.name,
          recipient_account: recipientContact.account,
          amount: parseFloat(amount),
          account_id: selectedAccount,
          description: scheduleDescription,
          is_recurring: scheduleForm.is_recurring,
          frequency: scheduleForm.is_recurring ? scheduleForm.frequency : null,
          start_date: scheduleForm.start_date,
          end_date: scheduleForm.end_date || null,
          next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: 'Payment Scheduled',
        description: `Your payment to ${recipientContact.name} has been scheduled successfully.`,
        status: 'success',
        duration: 3000,
      });

      onScheduleClose();
      setTimeout(() => {
        router.push('/scheduled-payments');
      }, 1500);
    } catch (error) {
      console.error('Schedule error:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule payment',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const keypadNumbers = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  // Generate QR code data for payment
  const generateQRData = () => {
    return JSON.stringify({
      type: 'payment_request',
      amount: parseFloat(amount) || 0,
      recipient: recipient.name,
      account: selectedAccount,
      note: transferNote,
      speed: deliverySpeed,
      purpose: transferPurpose,
      timestamp: new Date().toISOString(),
    });
  };

  const getQRImageUrl = (size) => {
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const params = new URLSearchParams({
      size: `${size}x${size}`,
      data: generateQRData(),
      format: 'svg',
      margin: '0',
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const unreadCount = notifications.length + alerts.length;

  if (!mounted) {
    return null;
  }

  const amountValue = parseFloat(amount) || 0;
  const transferFee = deliveryOptions[deliverySpeed]?.fee || 0;
  const totalDebit = amountValue + transferFee;
  const selectedAccountDetails = accounts.find((account) => account.id === selectedAccount);
  const deliveryLabel = deliveryOptions[deliverySpeed]?.label || 'Standard';
  const deliveryDescription = deliveryOptions[deliverySpeed]?.description || '';
  const purposeLabel =
    purposeOptions.find((option) => option.value === transferPurpose)?.label || 'Transfer';

  return (
    <Box
      minH="100vh"
      bg={bgColor}
      pb={{
        base: 'calc(env(safe-area-inset-bottom, 0px) + 240px)',
        md: '160px',
      }}
    >
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
            {isScheduled ? 'Schedule Transfer' : 'Send Money'}
          </Text>
          <HStack spacing={2}>
            <IconButton
              icon={<QrCode size={20} />}
              variant="ghost"
              onClick={onQROpen}
              aria-label="Generate QR code"
            />
            <IconButton
              icon={<Clock size={20} />}
              variant="ghost"
              onClick={() => {
                setIsScheduled(true);
                onScheduleOpen();
              }}
              aria-label="Open schedule settings"
            />
          </HStack>
        </Flex>

        <Box
          bg="white"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.100"
          px={{ base: 4, md: 6 }}
          py={{ base: 4, md: 5 }}
          boxShadow="sm"
        >
          <Stepper
            index={currentStep - 1}
            size="sm"
            colorScheme="purple"
            orientation={stepperOrientation}
            gap="0"
          >
            {steps.map((step, index) => (
              <Step key={step.title} py={stepperOrientation === 'vertical' ? 2 : 0}>
                <StepIndicator>
                  <StepStatus
                    complete={<StepIcon />}
                    incomplete={<StepNumber>{index + 1}</StepNumber>}
                    active={<StepNumber>{index + 1}</StepNumber>}
                  />
                </StepIndicator>

                <Box flexShrink={0} textAlign={stepperOrientation === 'vertical' ? 'left' : 'center'}>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDescription>{step.description}</StepDescription>
                </Box>

                <StepSeparator />
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box mt={6}>
          {currentStep === 1 && (
            <VStack spacing={4} align="stretch">
              <Card bg={cardBg} borderRadius="xl">
                <CardBody p={4}>
                  <VStack align="flex-start" spacing={3}>
                    <Text fontSize="sm" color="gray.500">
                      Current Recipient
                    </Text>
                    <HStack spacing={3} align="center" w="full">
                      <Box
                        w="48px"
                        h="48px"
                        borderRadius="full"
                        bg="purple.300"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          {recipient.name ? recipient.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </Box>
                      <VStack align="flex-start" spacing={1} flex={1}>
                        <Text fontSize="md" fontWeight="bold" color="gray.800">
                          {recipient.name || 'No recipient selected'}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {recipient.account
                            ? maskAccountNumber(recipient.account)
                            : 'Select or add a recipient to continue'}
                        </Text>
                        {recipient.bank && (
                          <Text fontSize="xs" color="gray.500">
                            Bank: {recipient.bank}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              {recipientContacts.length > 0 && (
                <Card bg={cardBg} borderRadius="xl">
                  <CardBody p={4}>
                    <VStack align="stretch" spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="sm" color="gray.600">
                          Saved Recipients
                        </FormLabel>
                        <Select
                          placeholder="Select a saved recipient"
                          value={selectedRecipientId}
                          onChange={(e) => handleRecipientSelection(e.target.value)}
                          size="lg"
                        >
                          {recipientContacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.name} • {maskAccountNumber(contact.account)}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="link"
                        colorScheme="purple"
                        alignSelf="flex-start"
                        onClick={() => {
                          setIsAddingRecipient(true);
                          setSelectedRecipientId('');
                          setRecipient({ id: null, name: '', account: '', bank: '' });
                          setRecipientForm({ name: '', accountNumber: '', bankName: '' });
                          setRecipientErrors({ name: '', accountNumber: '' });
                        }}
                      >
                        + Add new recipient
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {(isAddingRecipient || recipientContacts.length === 0) && (
                <Card bg={cardBg} borderRadius="xl">
                  <CardBody p={4}>
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired isInvalid={Boolean(recipientErrors.name)}>
                        <FormLabel>Recipient Name</FormLabel>
                        <Input
                          value={recipientForm.name}
                          onChange={handleRecipientFieldChange('name')}
                          placeholder="Enter recipient full name"
                          size="lg"
                        />
                        <FormErrorMessage>{recipientErrors.name}</FormErrorMessage>
                      </FormControl>
                      <FormControl isRequired isInvalid={Boolean(recipientErrors.accountNumber)}>
                        <FormLabel>Account Number</FormLabel>
                        <Input
                          value={recipientForm.accountNumber}
                          onChange={handleRecipientFieldChange('accountNumber')}
                          placeholder="Enter bank account number"
                          size="lg"
                        />
                        <FormErrorMessage>{recipientErrors.accountNumber}</FormErrorMessage>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Bank Name</FormLabel>
                        <Input
                          value={recipientForm.bankName}
                          onChange={handleRecipientFieldChange('bankName')}
                          placeholder="Optional"
                          size="lg"
                        />
                        <FormHelperText color="gray.500">
                          Helps you recognise this recipient next time.
                        </FormHelperText>
                      </FormControl>
                      {recipientContacts.length > 0 && (
                        <Button
                          variant="ghost"
                          colorScheme="gray"
                          onClick={() => {
                            setIsAddingRecipient(false);
                            setRecipientForm({ name: '', accountNumber: '', bankName: '' });
                            setRecipientErrors({ name: '', accountNumber: '' });
                            if (recipientContacts.length > 0) {
                              handleRecipientSelection(recipientContacts[0].id);
                            } else {
                              setRecipient({ id: null, name: '', account: '', bank: '' });
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>
          )}

          {currentStep === 2 && (
            <VStack spacing={4} align="stretch">
              {accounts.length === 0 ? (
                <Card bg={cardBg} borderRadius="xl">
                  <CardBody p={4}>
                    <VStack align="stretch" spacing={3}>
                      <Text fontWeight="semibold" color="gray.700">
                        Link a bank account to continue
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        We build a secure connection to your financial institution so you can fund transfers safely.
                      </Text>
                      <Button colorScheme="purple" onClick={handleOpenLinkModal}>
                        Link bank account
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <Card bg={cardBg} borderRadius="xl">
                  <CardBody p={4}>
                    <VStack align="stretch" spacing={3}>
                      <FormControl>
                        <FormLabel fontSize="sm" color="gray.600">
                          Pay From
                        </FormLabel>
                        <Select
                          value={selectedAccount}
                          onChange={(e) => setSelectedAccount(e.target.value)}
                          size="lg"
                        >
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.account_name} • {formatCurrency(account.balance)}
                            </option>
                          ))}
                        </Select>
                        {selectedAccountDetails && (
                          <FormHelperText>
                            Available balance: {formatCurrency(selectedAccountDetails.balance)}
                          </FormHelperText>
                        )}
                      </FormControl>
                      <Button variant="outline" colorScheme="purple" onClick={handleOpenLinkModal}>
                        Link another bank account
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              <Card bg={cardBg} borderRadius="xl">
                <CardBody p={4}>
                  <VStack spacing={5} align="stretch">
                    <FormControl>
                      <FormLabel>Transfer Amount</FormLabel>
                      <Input
                        value={amount}
                        onChange={(event) => handleAmountInputChange(event.target.value)}
                        size="lg"
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                      <FormHelperText>
                        Daily transfer limit: {formatCurrency(10000)}
                      </FormHelperText>
                    </FormControl>

                    <Text fontSize="4xl" fontWeight="semibold" color="gray.700" textAlign="center">
                      {formatCurrency(amountValue)}
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
                </CardBody>
              </Card>

              <Card bg={cardBg} borderRadius="xl">
                <CardBody p={4}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Transfer Speed</FormLabel>
                      <Select
                        value={deliverySpeed}
                        onChange={(event) => setDeliverySpeed(event.target.value)}
                        size="lg"
                      >
                        {Object.entries(deliveryOptions).map(([value, option]) => (
                          <option key={value} value={value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <FormHelperText>{deliveryDescription}</FormHelperText>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Purpose</FormLabel>
                      <Select
                        value={transferPurpose}
                        onChange={(event) => setTransferPurpose(event.target.value)}
                        size="lg"
                      >
                        {purposeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Memo (optional)</FormLabel>
                      <Textarea
                        value={transferNote}
                        onChange={(event) => setTransferNote(event.target.value)}
                        placeholder="Add a note that will appear on your receipt"
                        resize="none"
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb="0">Schedule this transfer</FormLabel>
                      <Switch
                        colorScheme="purple"
                        isChecked={isScheduled}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setIsScheduled(checked);
                          if (checked) {
                            setScheduleForm((prev) => ({
                              ...prev,
                              description: transferNote || prev.description,
                            }));
                            onScheduleOpen();
                          }
                        }}
                      />
                    </FormControl>

                    {isScheduled && (
                      <VStack align="stretch" spacing={3}>
                        <HStack spacing={2}>
                          <Tag colorScheme="purple">Start: {scheduleForm.start_date}</Tag>
                          {scheduleForm.is_recurring ? (
                            <Tag colorScheme="purple" variant="subtle">
                              {scheduleForm.frequency?.toUpperCase()}
                            </Tag>
                          ) : (
                            <Tag colorScheme="purple" variant="subtle">
                              One-time
                            </Tag>
                          )}
                        </HStack>
                        <Button variant="outline" colorScheme="purple" onClick={onScheduleOpen}>
                          Review schedule details
                        </Button>
                      </VStack>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
          )}

          {currentStep === 3 && (
            <VStack spacing={4} align="stretch">
              <Card bg={cardBg} borderRadius="xl">
                <CardBody p={4}>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="sm" color="gray.500">
                      Recipient
                    </Text>
                    <HStack spacing={3}>
                      <Box
                        w="48px"
                        h="48px"
                        borderRadius="full"
                        bg="purple.300"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          {recipient.name ? recipient.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </Box>
                      <VStack align="flex-start" spacing={0}>
                        <Text fontWeight="bold" color="gray.800">
                          {recipient.name || 'Recipient pending'}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {recipient.account ? maskAccountNumber(recipient.account) : 'Account TBD'}
                        </Text>
                        {recipient.bank && (
                          <Text fontSize="xs" color="gray.500">
                            Bank: {recipient.bank}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderRadius="xl">
                <CardBody p={4}>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text color="gray.600">Sending</Text>
                      <Text fontWeight="semibold">{formatCurrency(amountValue)}</Text>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text color="gray.600">{deliveryLabel}</Text>
                      <Text fontWeight="semibold">
                        {transferFee > 0 ? formatCurrency(transferFee) : 'No fee'}
                      </Text>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text fontWeight="bold" color="gray.700">
                        Total debited
                      </Text>
                      <Text fontWeight="bold" color="gray.800">
                        {formatCurrency(totalDebit)}
                      </Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderRadius="xl">
                <CardBody p={4}>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="sm" color="gray.500">
                      Transfer Details
                    </Text>
                    {selectedAccountDetails && (
                      <HStack justify="space-between" align="flex-start">
                        <Text color="gray.600">From account</Text>
                        <VStack spacing={0} align="flex-end">
                          <Text fontWeight="semibold" color="gray.700">
                            {selectedAccountDetails.account_name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            Available: {formatCurrency(selectedAccountDetails.balance)}
                          </Text>
                        </VStack>
                      </HStack>
                    )}
                    <HStack justify="space-between">
                      <Text color="gray.600">Purpose</Text>
                      <Tag colorScheme="purple" variant="subtle">
                        {purposeLabel}
                      </Tag>
                    </HStack>
                    {transferNote && (
                      <Box>
                        <Text color="gray.600" mb={1}>
                          Memo
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          {transferNote}
                        </Text>
                      </Box>
                    )}
                    <Box>
                      <Text color="gray.600" mb={1}>
                        Delivery speed
                      </Text>
                      <Text fontSize="sm" color="gray.700">
                        {deliveryLabel}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {deliveryDescription}
                      </Text>
                    </Box>
                    {isScheduled ? (
                      <Box>
                        <Text color="gray.600" mb={1}>
                          Schedule
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          Starts {scheduleForm.start_date}
                          {scheduleForm.is_recurring
                            ? ` • Repeats ${scheduleForm.frequency}`
                            : ' • One-time'}
                        </Text>
                        {scheduleForm.end_date && (
                          <Text fontSize="xs" color="gray.500">
                            Ends {scheduleForm.end_date}
                          </Text>
                        )}
                      </Box>
                    ) : (
                      <Text fontSize="sm" color="gray.600">
                        This transfer will be processed immediately.
                      </Text>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              <Alert status="info" variant="subtle" borderRadius="xl">
                <AlertIcon />
                Review the information carefully. Transfers may not be reversible once submitted.
              </Alert>
            </VStack>
          )}
        </Box>
      </Box>

      <Box px={4} py={2}>
        <Alert status="warning" variant="left-accent" borderRadius="lg">
          <AlertIcon />
          For your security, large transfers may require additional verification or temporary holds.
        </Alert>
      </Box>

      <Box
        position="fixed"
        bottom={{ base: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', md: 12 }}
        left={{ base: 0, md: '50%' }}
        right={{ base: 0, md: 'auto' }}
        transform={{ base: 'none', md: 'translateX(-50%)' }}
        maxW={{ base: '100%', md: '520px' }}
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        px={4}
        py={4}
        boxShadow={{ base: 'lg', md: '2xl' }}
        zIndex={120}
      >
        <Flex justify="space-between" align="center" gap={4}>
          <Button
            variant="ghost"
            onClick={handlePreviousStep}
            isDisabled={currentStep === 1}
          >
            Back
          </Button>
          {currentStep < totalSteps ? (
            <Button
              colorScheme="purple"
              onClick={handleNextStep}
              isDisabled={currentStep === 2 && (accounts.length === 0 || !selectedAccount)}
            >
              Continue
            </Button>
          ) : (
            <Button
              colorScheme="purple"
              onClick={handleConfirmTransfer}
              isLoading={loading}
              rightIcon={<ArrowRight size={18} />}
            >
              {isScheduled ? 'Schedule Transfer' : 'Confirm Transfer'}
            </Button>
          )}
        </Flex>
        <Text mt={2} fontSize="xs" color="gray.500" textAlign="center">
          Protected by multi-factor authentication and bank-grade encryption.
        </Text>
      </Box>

      {/* Schedule Payment Modal */}
      <Modal isOpen={isScheduleOpen} onClose={onScheduleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schedule Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="full">
                <Text fontSize="sm" color="gray.600">Amount</Text>
                <Text fontSize="2xl" fontWeight="bold">{formatCurrency(parseFloat(amount) || 0)}</Text>
              </Box>
              <Box w="full">
                <Text fontSize="sm" color="gray.600">Recipient</Text>
                <Text fontSize="lg" fontWeight="semibold">{recipient.name}</Text>
              </Box>
              <FormControl>
                <FormLabel>Recurring Payment</FormLabel>
                <Switch
                  isChecked={scheduleForm.is_recurring}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_recurring: e.target.checked })}
                />
              </FormControl>
              {scheduleForm.is_recurring && (
                <FormControl>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </FormControl>
              )}
              <FormControl>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={scheduleForm.start_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              {scheduleForm.is_recurring && (
                <FormControl>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Input
                    type="date"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                    min={scheduleForm.start_date}
                  />
                </FormControl>
              )}
              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input
                  placeholder="e.g., Monthly rent payment"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onScheduleClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSchedulePayment} isLoading={loading}>
              Schedule Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={isQROpen} onClose={onQRClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>QR Code Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Share this QR code to receive payment
              </Text>
              <Box p={4} bg="white" borderRadius="md" display="flex" justifyContent="center">
                <Image
                  src={getQRImageUrl(256)}
                  alt="Payment QR code"
                  width={256}
                  height={256}
                />
              </Box>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Amount: {formatCurrency(parseFloat(amount) || 0)}
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onQRClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Link Bank Account Modal */}
      <Modal isOpen={isLinkModalOpen} onClose={handleCloseLinkModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Link an external bank account</ModalHeader>
          <ModalCloseButton isDisabled={linkingAccount} />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired isInvalid={Boolean(linkErrors.bank)}>
                <FormLabel>Search worldwide banks</FormLabel>
                <Input
                  placeholder="Type bank name (e.g. HSBC, HDFC, Santander)"
                  value={bankSearch}
                  onChange={(event) => setBankSearch(event.target.value)}
                  size="lg"
                />
                <Box
                  mt={3}
                  maxH="200px"
                  overflowY="auto"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={2}
                >
                  <VStack align="stretch" spacing={1}>
                    {filteredBanks.length === 0 && (
                      <Text fontSize="sm" color="gray.500" px={2} py={2}>
                        No banks match your search. Try a different name.
                      </Text>
                    )}
                    {filteredBanks.map((bank) => (
                      <Button
                        key={bank}
                        variant={selectedBank === bank ? 'solid' : 'ghost'}
                        colorScheme={selectedBank === bank ? 'purple' : 'gray'}
                        justifyContent="flex-start"
                        onClick={() => handleBankSelection(bank)}
                      >
                        {bank}
                      </Button>
                    ))}
                  </VStack>
                </Box>
                <FormErrorMessage>{linkErrors.bank}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={Boolean(linkErrors.nickname)}>
                <FormLabel>Account nickname</FormLabel>
                <Input
                  placeholder="e.g. HSBC Checking"
                  value={linkForm.accountNickname}
                  onChange={handleLinkInputChange('accountNickname')}
                  size="lg"
                />
                <FormErrorMessage>{linkErrors.nickname}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={Boolean(linkErrors.accountNumber)}>
                <FormLabel>Account number</FormLabel>
                <Input
                  placeholder="Enter account number"
                  value={linkForm.accountNumber}
                  onChange={handleLinkInputChange('accountNumber')}
                  size="lg"
                />
                <FormHelperText>We never share this information without your consent.</FormHelperText>
                <FormErrorMessage>{linkErrors.accountNumber}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Account type</FormLabel>
                <Select
                  value={linkForm.accountType}
                  onChange={handleLinkInputChange('accountType')}
                  size="lg"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit</option>
                  <option value="investment">Investment</option>
                </Select>
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={linkForm.currency}
                    onChange={handleLinkInputChange('currency')}
                    size="lg"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Current balance (optional)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={linkForm.initialBalance}
                    onChange={handleLinkInputChange('initialBalance')}
                    placeholder="0.00"
                  />
                </FormControl>
              </HStack>

              <Text fontSize="sm" color="gray.500">
                By linking this account you authorise NovoBank to initiate transfers and display balances on your dashboard.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseLinkModal} isDisabled={linkingAccount}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleSubmitLinkAccount} isLoading={linkingAccount}>
              Link account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}

export default function SendMoneyPage() {
  return <SendMoneyContent />;
}
