'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  HStack,
  VStack,
  Badge,
  Button,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  Tag,
  Divider,
  Stack,
  Tooltip as ChakraTooltip,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  CloseButton,
  useToast,
} from '@chakra-ui/react';
import {
  Users,
  CreditCard,
  DollarSign,
  ShieldAlert,
  RefreshCcw,
  Search,
  Filter,
  Activity,
  Clock,
  Building2,
  ArrowRightLeft,
  Bell,
  Mail,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
  : [];

const StatCard = ({ icon: IconComponent, label, value, helper }) => (
  <Card bg="white" borderRadius="xl" boxShadow="sm">
    <CardBody>
      <HStack justify="space-between" align="flex-start">
        <VStack align="flex-start" spacing={1}>
          <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            {value}
          </Text>
          {helper && (
            <Text fontSize="xs" color="gray.500">
              {helper}
            </Text>
          )}
        </VStack>
        <Box
          w="12"
          h="12"
          borderRadius="full"
          bg="purple.50"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <IconComponent size={22} color="#7c3aed" />
        </Box>
      </HStack>
    </CardBody>
  </Card>
);

const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const getDefaultAccountForm = () => ({
  userId: '',
  accountName: '',
  accountNumber: '',
  accountType: 'checking',
  currency: 'USD',
  initialBalance: '0',
  initialBalancePostedAt: new Date().toISOString().slice(0, 16),
  isPrimary: false,
  bankName: '',
  bankLogo: '',
});

const getDefaultTransactionForm = () => ({
  userId: '',
  accountId: '',
  amount: '',
  description: '',
  postedAt: new Date().toISOString().slice(0, 16),
});

const AdminDashboardComponent = () => {
  const router = useRouter();
  const toast = useToast();

  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState('deposit');
  const [accountForm, setAccountForm] = useState(() => ({ ...getDefaultAccountForm() }));
  const [accountModalLoading, setAccountModalLoading] = useState(false);
  const [transactionForm, setTransactionForm] = useState(() => ({ ...getDefaultTransactionForm() }));
  const [transactionModalLoading, setTransactionModalLoading] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [reviewActionLoading, setReviewActionLoading] = useState({});
  const [reviewModalState, setReviewModalState] = useState({ isOpen: false, action: null, transaction: null });
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [accountStatusLoading, setAccountStatusLoading] = useState({});
  const [inlineNotification, setInlineNotification] = useState(null);
  const [contactResponseModal, setContactResponseModal] = useState({ isOpen: false, contact: null });
  const [contactResponseText, setContactResponseText] = useState('');
  const [contactActionLoading, setContactActionLoading] = useState({});
  const [checkDepositModal, setCheckDepositModal] = useState({ isOpen: false, deposit: null });
  const [checkDepositActionLoading, setCheckDepositActionLoading] = useState({});
  const [checkDepositRejectionReason, setCheckDepositRejectionReason] = useState('');

  const authorizedFetch = useCallback(
    async (url, init = {}) => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        setAuthError('Your session has expired. Please sign in again.');
        setAuthorized(false);
        throw new Error('Session expired. Please sign in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      };

      return fetch(url, { ...init, headers });
    },
    [setAuthError, setAuthorized]
  );

  const showInlineNotification = useCallback((status, title, description) => {
    setInlineNotification({ status, title, description });
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authorizedFetch('/api/admin/overview', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-store',
        },
      });

      if (!response.ok) {
        let message = 'Unable to load admin metrics.';
        try {
          const payload = await response.json();
          if (payload?.error) {
            message = payload.error;
          }
        } catch (parseError) {
          // ignore parse errors; keep default message
        }

        if (response.status === 401) {
          setAuthError('Your session is no longer valid. Please log in again.');
          setAuthorized(false);
        } else if (response.status === 403) {
          setAuthError('You do not have the necessary permissions to access the admin console.');
          setAuthorized(false);
        }

        throw new Error(message);
      }

      const payload = await response.json();
      setData(payload);
      setError('');
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Admin dashboard fetch error:', err);
      const message = err.message || 'Unexpected error loading admin data.';
      setError(message);
      if (!authError) {
        showInlineNotification('error', 'Failed to load dashboard', message);
      }
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, authError, showInlineNotification]);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.push('/login?redirect=/admin');
          return;
        }

        if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
          setAuthError('You do not have the necessary permissions to access the admin console.');
          setAuthorized(false);
          return;
        }

        setAuthorized(true);
        await fetchAdminData();
      } catch (err) {
        console.error('Admin auth check failed:', err);
        setAuthError('Unable to verify admin permissions. Please contact support.');
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAdmin();
  }, [fetchAdminData, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = data?.stats ?? {
    totalUsers: 0,
    newUsers24h: 0,
    totalAccounts: 0,
    totalBalance: 0,
    todaysVolume: 0,
    flaggedCount: 0,
    pendingTransactions: 0,
    blockedAccountsCount: 0,
    unreadContacts: 0,
    unreadNotifications: 0,
  };

  const transactionTrendData = useMemo(() => {
    if (!data?.transactions) return [];

    const buckets = new Map();
    data.transactions.forEach((tx) => {
      if (!tx.created_at) return;
      const date = new Date(tx.created_at);
      const key = date.toISOString().slice(0, 10);
      const entry = buckets.get(key) || { date: key, volume: 0, count: 0 };
      if (tx.status !== 'failed') {
        entry.volume += Math.abs(parseFloat(tx.amount || 0));
        entry.count += 1;
      }
      buckets.set(key, entry);
    });

    const sorted = Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return sorted.slice(-10);
  }, [data?.transactions]);

  const chartHasData = useMemo(
    () => transactionTrendData.some((entry) => entry.volume > 0),
    [transactionTrendData]
  );

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!userSearch.trim()) return data.users;

    const query = userSearch.trim().toLowerCase();
    return data.users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query)
    );
  }, [data?.users, userSearch]);

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (transactionFilter === 'all') return data.transactions;
    if (transactionFilter === 'flagged') return data.flaggedTransactions || [];
    if (transactionFilter === 'pending') {
      return data.transactions.filter((tx) => tx.review_status === 'pending');
    }
    return data.transactions.filter((tx) => tx.status === transactionFilter);
  }, [data?.transactions, data?.flaggedTransactions, transactionFilter]);

  const pendingReviews = data?.pendingReviews ?? [];
  const pendingReviewCount = pendingReviews.length;
  const blockedAccounts = data?.blockedAccounts ?? [];
  const blockedAccountCount = blockedAccounts.length;

  const dismissInlineNotification = useCallback(() => {
    setInlineNotification(null);
  }, []);

  useEffect(() => {
    if (!inlineNotification) return undefined;
    const timer = setTimeout(() => {
      setInlineNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [inlineNotification]);

  const handleAccountFieldChange = (field) => (event) => {
    const value = field === 'isPrimary' ? event.target.checked : event.target.value;
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransactionFieldChange = (field) => (event) => {
    const value = event.target.value;
    if (field === 'userId') {
      setTransactionForm((prev) => ({ ...prev, userId: value, accountId: '' }));
      loadUserAccounts(value);
    } else {
      setTransactionForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const executeReviewAction = useCallback(
    async (transaction, action, reviewNotes) => {
      if (!transaction?.id) return;

      setReviewActionLoading((prev) => ({ ...prev, [transaction.id]: action }));

      try {
        const payload = {
          transaction_id: transaction.id,
          action,
        };

        if (reviewNotes && reviewNotes.trim().length > 0) {
          payload.review_notes = reviewNotes.trim();
        }

        const response = await authorizedFetch('/api/admin/transactions', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let message = 'Unable to update transaction.';
          try {
            const errorPayload = await response.json();
            if (errorPayload?.error) {
              message = errorPayload.error;
            }
          } catch (parseError) {
            // ignore parse errors
          }
          throw new Error(message);
        }

        const successTitle =
          action === 'approve'
            ? 'Transaction approved'
            : action === 'reject'
            ? 'Transaction rejected'
            : 'Account blocked';
        const successStatus = action === 'approve' ? 'success' : action === 'reject' ? 'warning' : 'error';
        showInlineNotification(successStatus, successTitle, '');

        setReviewModalState({ isOpen: false, action: null, transaction: null });
        setReviewNotesInput('');
        await fetchAdminData();
      } catch (err) {
        console.error('Review action failed:', err);
        showInlineNotification('error', 'Action failed', err.message || 'Could not update transaction review status.');
      } finally {
        setReviewActionLoading((prev) => {
          const next = { ...prev };
          delete next[transaction.id];
          return next;
        });
      }
    },
    [authorizedFetch, fetchAdminData, showInlineNotification]
  );

  const handleReviewAction = (transaction, action, existingNotes = '') => {
    if (!transaction) return;
    setReviewNotesInput(existingNotes || transaction.review_notes || '');
    setReviewModalState({ isOpen: true, action, transaction });
  };

  const closeReviewModal = () => {
    if (reviewModalState.transaction) {
      const loadingAction = reviewActionLoading[reviewModalState.transaction.id];
      if (loadingAction) {
        return;
      }
    }
    setReviewModalState({ isOpen: false, action: null, transaction: null });
    setReviewNotesInput('');
  };

  const handleAccountStatusUpdate = useCallback(
    async (userId, status = 'active') => {
      if (!userId) return;

      setAccountStatusLoading((prev) => ({ ...prev, [userId]: status }));
      try {
        const response = await authorizedFetch('/api/admin/account-status', {
          method: 'PATCH',
          body: JSON.stringify({
            user_id: userId,
            account_status: status,
          }),
        });

        if (!response.ok) {
          let message = 'Unable to update account status.';
          try {
            const errorPayload = await response.json();
            if (errorPayload?.error) {
              message = errorPayload.error;
            }
          } catch (parseError) {
            // ignore parse errors
          }
          throw new Error(message);
        }

        showInlineNotification(
          'success',
          status === 'active' ? 'Account unblocked' : 'Status updated',
          ''
        );

        await fetchAdminData();
      } catch (err) {
        console.error('Account status update failed:', err);
        showInlineNotification(
          'error',
          'Action failed',
          err.message || 'Could not update account status.'
        );
      } finally {
        setAccountStatusLoading((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    },
    [authorizedFetch, fetchAdminData, showInlineNotification]
  );

  const handleMarkContactRead = useCallback(
    async (contactId) => {
      setContactActionLoading((prev) => ({ ...prev, [contactId]: 'read' }));
      try {
        const response = await authorizedFetch('/api/admin/contacts', {
          method: 'PATCH',
          body: JSON.stringify({
            contact_id: contactId,
            status: 'read',
          }),
        });

        if (!response.ok) {
          throw new Error('Unable to mark contact as read.');
        }

        showInlineNotification('success', 'Contact marked as read', '');
        await fetchAdminData();
      } catch (err) {
        console.error('Mark contact read error:', err);
        showInlineNotification('error', 'Action failed', err.message || 'Could not mark contact as read.');
      } finally {
        setContactActionLoading((prev) => {
          const next = { ...prev };
          delete next[contactId];
          return next;
        });
      }
    },
    [authorizedFetch, fetchAdminData, showInlineNotification]
  );

  const handleOpenResponseModal = useCallback((contact) => {
    setContactResponseText(contact.admin_response || '');
    setContactResponseModal({ isOpen: true, contact });
  }, []);

  const handleCloseResponseModal = useCallback(() => {
    if (contactResponseModal.contact) {
      const loadingAction = contactActionLoading[contactResponseModal.contact.id];
      if (loadingAction) {
        return;
      }
    }
    setContactResponseModal({ isOpen: false, contact: null });
    setContactResponseText('');
  }, [contactResponseModal, contactActionLoading]);

  const handleSubmitResponse = useCallback(
    async () => {
      if (!contactResponseModal.contact) return;

      const contactId = contactResponseModal.contact.id;
      setContactActionLoading((prev) => ({ ...prev, [contactId]: 'respond' }));

      try {
        const response = await authorizedFetch('/api/admin/contacts', {
          method: 'PATCH',
          body: JSON.stringify({
            contact_id: contactId,
            admin_response: contactResponseText.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Unable to submit response.');
        }

        showInlineNotification('success', 'Response submitted', '');
        handleCloseResponseModal();
        await fetchAdminData();
      } catch (err) {
        console.error('Submit response error:', err);
        showInlineNotification('error', 'Action failed', err.message || 'Could not submit response.');
      } finally {
        setContactActionLoading((prev) => {
          const next = { ...prev };
          delete next[contactId];
          return next;
        });
      }
    },
    [contactResponseModal, contactResponseText, authorizedFetch, fetchAdminData, handleCloseResponseModal, showInlineNotification]
  );

  const handleCheckDepositAction = useCallback(
    async (depositId, action) => {
      setCheckDepositActionLoading((prev) => ({ ...prev, [depositId]: action }));

      try {
        const response = await authorizedFetch('/api/admin/check-deposits', {
          method: 'PATCH',
          body: JSON.stringify({
            deposit_id: depositId,
            action: action,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Unable to process check deposit action.');
        }

        const result = await response.json();
        showInlineNotification(
          'success',
          action === 'completed' ? 'Check deposit completed and account credited' : 'Check deposit updated',
          ''
        );
        await fetchAdminData();
      } catch (err) {
        console.error('Check deposit action error:', err);
        showInlineNotification('error', 'Action failed', err.message || 'Could not process check deposit.');
      } finally {
        setCheckDepositActionLoading((prev) => {
          const next = { ...prev };
          delete next[depositId];
          return next;
        });
      }
    },
    [authorizedFetch, fetchAdminData, showInlineNotification]
  );

  const handleCheckDepositReject = useCallback(
    async (depositId, reason) => {
      const rejectionReason = reason || 'Rejected by administrator';
      setCheckDepositActionLoading((prev) => ({ ...prev, [depositId]: 'reject' }));

      try {
        const response = await authorizedFetch('/api/admin/check-deposits', {
          method: 'PATCH',
          body: JSON.stringify({
            deposit_id: depositId,
            action: 'reject',
            rejection_reason: rejectionReason,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Unable to reject check deposit.');
        }

        showInlineNotification('success', 'Check deposit rejected', '');
        await fetchAdminData();
      } catch (err) {
        console.error('Reject check deposit error:', err);
        showInlineNotification('error', 'Action failed', err.message || 'Could not reject check deposit.');
      } finally {
        setCheckDepositActionLoading((prev) => {
          const next = { ...prev };
          delete next[depositId];
          return next;
        });
      }
    },
    [authorizedFetch, fetchAdminData, showInlineNotification]
  );

  const loadUserAccounts = useCallback(
    async (userId) => {
      if (!userId) {
        setAvailableAccounts([]);
        return;
      }
      setFetchingAccounts(true);
      try {
        const response = await authorizedFetch(`/api/admin/user-accounts?user_id=${userId}`);
        if (!response.ok) {
          throw new Error('Unable to fetch customer accounts.');
        }
        const payload = await response.json();
        setAvailableAccounts(payload.accounts || []);
      } catch (err) {
        console.error('Fetch user accounts error:', err);
        showInlineNotification(
          'error',
          'Failed to load accounts',
          err.message || 'Could not retrieve accounts for this customer.'
        );
        setAvailableAccounts([]);
      } finally {
        setFetchingAccounts(false);
      }
    },
    [authorizedFetch, showInlineNotification]
  );

  const handleCreateAccount = useCallback(async () => {
    if (!accountForm.userId || !accountForm.accountName.trim()) {
      showInlineNotification(
        'warning',
        'Missing details',
        'Select a customer and provide an account name.'
      );
      return;
    }

    const initialBalanceValue = parseFloat(accountForm.initialBalance);
    if (Number.isNaN(initialBalanceValue) || initialBalanceValue < 0) {
      showInlineNotification(
        'warning',
        'Invalid amount',
        'Initial balance must be zero or a positive amount.'
      );
      return;
    }

    let postedAtIso = null;
    if (accountForm.initialBalancePostedAt) {
      const postedDate = new Date(accountForm.initialBalancePostedAt);
      if (Number.isNaN(postedDate.getTime())) {
        showInlineNotification(
          'warning',
          'Invalid date',
          'Choose a valid posting date for the starting balance.'
        );
        return;
      }
      postedAtIso = postedDate.toISOString();
    }

    setAccountModalLoading(true);
    try {
      const payload = {
        user_id: accountForm.userId,
        account_name: accountForm.accountName.trim(),
        account_number: accountForm.accountNumber.trim() || `ACCT-${Date.now()}`,
        account_type: accountForm.accountType,
        currency: accountForm.currency,
        initial_balance: initialBalanceValue,
        initial_balance_posted_at: postedAtIso,
        is_primary: accountForm.isPrimary,
        bank_name: accountForm.bankName.trim() || null,
        bank_logo: accountForm.bankLogo.trim() || null,
      };

      const response = await authorizedFetch('/api/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to create account.');
      }

      showInlineNotification(
        'success',
        'Account created',
        'The account has been added successfully.'
      );

      setAccountForm({ ...getDefaultAccountForm() });
      setIsAccountModalOpen(false);
      fetchAdminData();
    } catch (err) {
      console.error('Create account error:', err);
      showInlineNotification(
        'error',
        'Failed to create account',
        err.message || 'Unable to create account at this time.'
      );
    } finally {
      setAccountModalLoading(false);
    }
  }, [accountForm, authorizedFetch, fetchAdminData, showInlineNotification]);

  const handleProcessTransaction = useCallback(async () => {
    if (!transactionForm.userId || !transactionForm.accountId) {
      showInlineNotification(
        'warning',
        'Select customer and account',
        'Choose a customer and the target account.'
      );
      return;
    }

    const amountValue = parseFloat(transactionForm.amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      showInlineNotification(
        'warning',
        'Invalid amount',
        'Enter an amount greater than zero.'
      );
      return;
    }

    const postedDate = transactionForm.postedAt
      ? new Date(transactionForm.postedAt)
      : new Date();
    if (Number.isNaN(postedDate.getTime())) {
      showInlineNotification(
        'warning',
        'Invalid date',
        'Choose a valid posting date and time.'
      );
      return;
    }

    setTransactionModalLoading(true);
    try {
      const payload = {
        user_id: transactionForm.userId,
        account_id: transactionForm.accountId,
        amount: amountValue,
        type: transactionMode,
        description: transactionForm.description.trim() || null,
        posted_at: postedDate.toISOString(),
      };

      const response = await authorizedFetch('/api/admin/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to process transaction.');
      }

      showInlineNotification(
        'success',
        'Transaction recorded',
        `The ${transactionMode} was applied successfully.`
      );

      setAvailableAccounts((prev) =>
        prev.map((account) =>
          account.id === transactionForm.accountId
            ? { ...account, balance: result.newBalance }
            : account
        )
      );

      setTransactionForm({ ...getDefaultTransactionForm(), postedAt: new Date().toISOString().slice(0, 16) });
      setIsTransactionModalOpen(false);
      fetchAdminData();
    } catch (err) {
      console.error('Process transaction error:', err);
      showInlineNotification(
        'error',
        'Failed to process transaction',
        err.message || 'Unable to complete this operation.'
      );
    } finally {
      setTransactionModalLoading(false);
    }
  }, [transactionForm, transactionMode, authorizedFetch, fetchAdminData, showInlineNotification]);

  const openCreateAccountModal = () => {
    setAccountForm({ ...getDefaultAccountForm(), initialBalancePostedAt: new Date().toISOString().slice(0, 16) });
    setIsAccountModalOpen(true);
  };

  const openTransactionModal = (mode) => {
    setTransactionMode(mode);
    setTransactionForm({ ...getDefaultTransactionForm(), postedAt: new Date().toISOString().slice(0, 16) });
    setAvailableAccounts([]);
    setIsTransactionModalOpen(true);
  };

  const closeAccountModal = () => {
    if (accountModalLoading) return;
    setIsAccountModalOpen(false);
    setAccountForm({ ...getDefaultAccountForm(), initialBalancePostedAt: new Date().toISOString().slice(0, 16) });
  };

  const closeTransactionModal = () => {
    if (transactionModalLoading) return;
    setIsTransactionModalOpen(false);
    setTransactionForm({ ...getDefaultTransactionForm(), postedAt: new Date().toISOString().slice(0, 16) });
    setAvailableAccounts([]);
    setFetchingAccounts(false);
  };

  // Prevent hydration mismatch - check mounted and ensure we're on client before rendering Chakra UI components
  if (typeof window === 'undefined' || !mounted) {
    return null;
  }

  if (checkingAuth || !authorized) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.50">
        <Spinner size="lg" color="purple.500" />
      </Flex>
    );
  }

  if (authError) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.50" px={4}>
        <Card maxW="lg" bg="white" borderRadius="xl" boxShadow="lg">
          <CardBody>
            <VStack spacing={4}>
              <ShieldAlert size={40} color="#7c3aed" />
              <Heading size="md">Access Denied</Heading>
              <Text color="gray.600" textAlign="center">
                {authError}
              </Text>
              <Button colorScheme="purple" onClick={() => router.push('/wallet')}>
                Return to Dashboard
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" pb="96px">
      <Box px={{ base: 4, lg: 8 }} py={6} bg="white" borderBottom="1px solid" borderColor="gray.200">
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
          <VStack align="flex-start" spacing={1}>
            <Heading size="lg" color="gray.800">
              Admin Control Center
            </Heading>
            <Text color="gray.600">
              Operational oversight, risk monitoring, and treasury insights in one place.
            </Text>
            {lastUpdated && (
              <Text fontSize="xs" color="gray.500">
                Last refreshed {formatDate(lastUpdated)}
              </Text>
            )}
          </VStack>
          <HStack spacing={3}>
            {stats.unreadNotifications > 0 && (
              <Box position="relative">
                <Button
                  variant="outline"
                  leftIcon={<Bell size={16} />}
                  onClick={() => {
                    // Scroll to notifications or open notifications panel
                    const tabs = document.querySelector('[role="tablist"]');
                    if (tabs) {
                      const contactTab = Array.from(tabs.children).find((tab) => 
                        tab.textContent?.includes('Contact Submissions')
                      );
                      if (contactTab) contactTab.click();
                    }
                  }}
                >
                  Notifications
                </Button>
                <Badge
                  position="absolute"
                  top="-8px"
                  right="-8px"
                  colorScheme="red"
                  borderRadius="full"
                  fontSize="xs"
                  minW="20px"
                  h="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {stats.unreadNotifications}
                </Badge>
              </Box>
            )}
            <ChakraTooltip label="Refresh metrics from Supabase">
              <Button
                variant="outline"
                leftIcon={<RefreshCcw size={16} />}
                onClick={fetchAdminData}
                isLoading={loading}
              >
                Refresh Data
              </Button>
            </ChakraTooltip>
          </HStack>
        </Flex>
      </Box>

      {inlineNotification && (
        <Box px={{ base: 4, lg: 8 }} mt={4}>
          <Alert
            status={inlineNotification.status}
            borderRadius="lg"
            variant="left-accent"
            alignItems="flex-start"
          >
            <AlertIcon />
            <Box flex="1">
              <Text fontWeight="semibold" color="gray.800">
                {inlineNotification.title}
              </Text>
              {inlineNotification.description && (
                <Text fontSize="sm" color="gray.600">
                  {inlineNotification.description}
                </Text>
              )}
            </Box>
            <CloseButton
              position="relative"
              top={1}
              onClick={dismissInlineNotification}
            />
          </Alert>
        </Box>
      )}

      <Box px={{ base: 4, lg: 8 }} py={6}>
        {error && (
          <Alert status="error" mb={6} borderRadius="lg">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={5}>
          <StatCard
            icon={Users}
            label="Total Customers"
          value={formatNumber(stats.totalUsers)}
            helper={`${stats.newUsers24h} joined last 24h`}
          />
          <StatCard
            icon={CreditCard}
            label="Connected Accounts"
          value={formatNumber(stats.totalAccounts)}
            helper={`${
              stats.totalAccounts > 0 ? (stats.totalBalance / stats.totalAccounts).toFixed(2) : '0.00'
            } avg balance`}
          />
          <StatCard
            icon={DollarSign}
            label="Ledger Balance"
            value={formatCurrency(stats.totalBalance)}
            helper="Across customer accounts"
          />
          <StatCard
            icon={ShieldAlert}
            label="Alerts & Flags"
          value={formatNumber(stats.flaggedCount)}
            helper={`${stats.pendingTransactions} pending • ${stats.blockedAccountsCount} blocked`}
          />
        </SimpleGrid>

        <Box mt={8} />

        <Tabs colorScheme="purple" mt={10}>
          <TabList>
            <Tab>Customers</Tab>
            <Tab>Transactions</Tab>
            <Tab>Operations</Tab>
            <Tab>Check Deposits</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={6}>
              <Stack spacing={4}>
                <Flex
                  direction={{ base: 'column', md: 'row' }}
                  justify="space-between"
                  align={{ base: 'stretch', md: 'center' }}
                  gap={4}
                >
                  <InputGroup maxW={{ base: '100%', md: '320px' }}>
                    <InputLeftElement pointerEvents="none">
                      <Search size={16} color="#9ca3af" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search customers by name or email"
                      bg="white"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                  </InputGroup>
                  <HStack spacing={3}>
                    <Tag colorScheme="purple" variant="subtle">
                      {filteredUsers.length} visible
                    </Tag>
                  </HStack>
                </Flex>

                <Box
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="white"
                  overflow="hidden"
                >
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Customer</Th>
                        <Th>Email</Th>
                        <Th>Joined</Th>
                        <Th isNumeric>Linked Accounts</Th>
                        <Th isNumeric>Total Balance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredUsers.map((user) => (
                        <Tr key={user.id}>
                          <Td fontWeight="semibold" color="gray.800">
                            {user.name}
                          </Td>
                          <Td>{user.email}</Td>
                          <Td>{formatDate(user.created_at)}</Td>
                          <Td isNumeric>{user.accounts_count}</Td>
                          <Td isNumeric>{formatCurrency(user.total_balance)}</Td>
                        </Tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <Tr>
                          <Td colSpan={5}>
                            <Text textAlign="center" color="gray.500" py={4}>
                              No customers match the current filters.
                            </Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Stack>
            </TabPanel>

            <TabPanel px={0} pt={6}>
              <Stack spacing={4}>
                <Flex
                  direction={{ base: 'column', md: 'row' }}
                  justify="space-between"
                  align={{ base: 'stretch', md: 'center' }}
                  gap={4}
                >
                  <HStack spacing={3}>
                    <Filter size={16} color="#7c3aed" />
                    <Text fontWeight="semibold" color="gray.700">
                      Filter transactions
                    </Text>
                  </HStack>
                  <HStack spacing={3}>
                    <Select
                      value={transactionFilter}
                      onChange={(event) => setTransactionFilter(event.target.value)}
                      maxW={{ base: '100%', md: '240px' }}
                      bg="white"
                    >
                      <option value="all">All transactions</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="flagged">Flagged & high value</option>
                    </Select>
                    <Tag colorScheme="purple" variant="subtle">
                      {filteredTransactions.length} items
                    </Tag>
                  </HStack>
                </Flex>

                <Box
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  bg="white"
                  overflow="hidden"
                >
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Reference</Th>
                        <Th>Customer</Th>
                        <Th>Recipient</Th>
                        <Th>Status</Th>
                        <Th>Type</Th>
                        <Th isNumeric>Amount</Th>
                        <Th>Date</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredTransactions.map((tx) => {
                        const isPendingReview = tx.review_status === 'pending';
                        const isRejected = tx.review_status === 'rejected';
                        const isBlocked = tx.review_status === 'blocked';
                        let badgeColor = 'purple';
                        let badgeLabel = tx.status || 'Processing';

                        if (isPendingReview) {
                          badgeColor = 'orange';
                          badgeLabel = 'Pending review';
                        } else if (isBlocked) {
                          badgeColor = 'red';
                          badgeLabel = 'Blocked';
                        } else if (isRejected) {
                          badgeColor = 'red';
                          badgeLabel = 'Rejected';
                        } else if (tx.status === 'completed') {
                          badgeColor = 'green';
                          badgeLabel = 'Completed';
                        } else if (tx.status === 'failed') {
                          badgeColor = 'red';
                          badgeLabel = 'Failed';
                        }

                        return (
                          <Tr key={tx.id}>
                            <Td>{tx.id.slice(0, 8).toUpperCase()}</Td>
                            <Td>
                              <VStack align="flex-start" spacing={0}>
                                <Text fontWeight="semibold" color="gray.800">
                                  {tx.customer}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {tx.customer_email || '—'}
                                </Text>
                              </VStack>
                            </Td>
                            <Td>{tx.recipient_name || '—'}</Td>
                            <Td>
                              <Badge colorScheme={badgeColor}>{badgeLabel}</Badge>
                            </Td>
                            <Td textTransform="capitalize">{tx.transaction_type}</Td>
                            <Td isNumeric>{formatCurrency(tx.amount)}</Td>
                            <Td>{formatDate(tx.created_at)}</Td>
                          </Tr>
                        );
                      })}
                      {filteredTransactions.length === 0 && (
                        <Tr>
                          <Td colSpan={7}>
                            <Text textAlign="center" color="gray.500" py={4}>
                              No transactions match the current filter.
                            </Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Stack>
            </TabPanel>

            <TabPanel px={0} pt={6}>
              <Stack spacing={6}>
                <Card bg="white" borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <HStack justify="space-between" align="center" mb={4}>
                      <VStack align="flex-start" spacing={0}>
                        <Heading size="sm" color="gray.800">
                          Manual adjustments
                        </Heading>
                        <Text fontSize="sm" color="gray.500">
                          Create customer accounts or record deposits and withdrawals with proper authorization.
                        </Text>
                      </VStack>
                      <Badge colorScheme="red" variant="subtle">
                        Admin actions
                      </Badge>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                      <Button
                        leftIcon={<Building2 size={16} />}
                        colorScheme="purple"
                        onClick={openCreateAccountModal}
                      >
                        Create customer account
                      </Button>
                      <Button
                        leftIcon={<DollarSign size={16} />}
                        colorScheme="green"
                        variant="outline"
                        onClick={() => openTransactionModal('deposit')}
                      >
                        Record deposit
                      </Button>
                      <Button
                        leftIcon={<ArrowRightLeft size={16} />}
                        colorScheme="red"
                        variant="outline"
                        onClick={() => openTransactionModal('withdrawal')}
                      >
                        Record withdrawal
                      </Button>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                <Card bg="white" borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <HStack justify="space-between" align="center">
                      <HStack spacing={3}>
                        <Activity size={20} color="#7c3aed" />
                        <Heading size="sm" color="gray.800">
                          High value accounts
                        </Heading>
                      </HStack>
                      <Badge colorScheme="purple" variant="subtle">
                        {data?.accounts?.length || 0} accounts
                      </Badge>
                    </HStack>
                    <Divider my={4} />
                    <VStack align="stretch" spacing={3}>
                      {(data?.accounts || []).map((account) => (
                        <Flex
                          key={account.id}
                          justify="space-between"
                          align={{ base: 'flex-start', md: 'center' }}
                          gap={4}
                          p={3}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="lg"
                        >
                          <VStack align="flex-start" spacing={1}>
                            <HStack spacing={2}>
                              <Box
                                w="40px"
                                h="40px"
                                borderRadius="full"
                                bg="gray.100"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                overflow="hidden"
                              >
                                {account.bank_logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={account.bank_logo}
                                    alt={`${account.bank_name || account.account_name} logo`}
                                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                  />
                                ) : (
                                  <Building2 size={18} color="#6b7280" />
                                )}
                              </Box>
                              <VStack align="flex-start" spacing={0}>
                                <Text fontWeight="semibold" color="gray.800">
                                  {account.account_name}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {account.bank_name || account.account_type.toUpperCase()}
                                </Text>
                              </VStack>
                            </HStack>
                          </VStack>
                          <VStack align="flex-end" spacing={1}>
                            <Text fontSize="sm" color="gray.500">
                              Owner
                            </Text>
                            <Text fontWeight="semibold" color="gray.800">
                              {account.owner_name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {account.owner_email || '—'}
                            </Text>
                          </VStack>
                          <VStack align="flex-end" spacing={1}>
                            <Text fontSize="sm" color="gray.500">
                              Balance
                            </Text>
                            <Text fontSize="lg" fontWeight="bold" color="gray.800">
                              {formatCurrency(account.balance, account.currency || 'USD')}
                            </Text>
                          </VStack>
                        </Flex>
                      ))}
                      {(data?.accounts || []).length === 0 && (
                        <Text textAlign="center" color="gray.500">
                          No linked bank accounts available.
                        </Text>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="white" borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <HStack justify="space-between" align="center">
                      <HStack spacing={3}>
                        <Clock size={18} color="#7c3aed" />
                        <Heading size="sm" color="gray.800">
                          Pending approvals
                        </Heading>
                      </HStack>
                      <Badge colorScheme={pendingReviewCount > 0 ? 'orange' : 'green'} variant="subtle">
                        {pendingReviewCount} waiting
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.500" mt={2} mb={4}>
                      Transactions requiring manual approval before funds are posted to customer accounts.
                    </Text>
                    <VStack align="stretch" spacing={3}>
                      {pendingReviews.length > 0 ? (
                        pendingReviews.map((tx) => {
                          const loadingAction = reviewActionLoading[tx.id];
                          const canApprove = Boolean(tx.account_id);
                          const approveTooltip = canApprove
                            ? ''
                            : 'Cannot approve because this legacy transaction is not linked to an account.';
                          return (
                            <Box
                              key={tx.id}
                              p={3}
                              border="1px solid"
                              borderColor="gray.200"
                              borderRadius="lg"
                            >
                              <Flex
                                direction={{ base: 'column', md: 'row' }}
                                justify="space-between"
                                align={{ base: 'flex-start', md: 'center' }}
                                gap={3}
                              >
                                <VStack align="flex-start" spacing={1}>
                                  <Text fontWeight="semibold" color="gray.800">
                                    {tx.customer}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {tx.customer_email || '—'}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    {tx.description || 'No description provided'}
                                  </Text>
                                </VStack>
                                <VStack align="flex-end" spacing={1}>
                                  <Text fontSize="xs" color="gray.500">
                                    Amount
                                  </Text>
                                  <Text fontWeight="bold" color="gray.800">
                                    {formatCurrency(tx.amount)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {formatDate(tx.created_at)}
                                  </Text>
                                </VStack>
                              </Flex>
                              {tx.review_notes && (
                                <Text fontSize="xs" color="gray.500" mt={2}>
                                  Notes: {tx.review_notes}
                                </Text>
                              )}
                              {!canApprove && (
                                <Text fontSize="xs" color="orange.500" mt={2}>
                                  Approval unavailable: link an account before approving or choose Reject/Block.
                                </Text>
                              )}
                              <HStack justify="flex-end" spacing={2} mt={3}>
                                <ChakraTooltip
                                  label={approveTooltip}
                                  isDisabled={canApprove}
                                  hasArrow
                                  placement="top"
                                >
                                  <Button
                                    size="sm"
                                    colorScheme="green"
                                    variant="solid"
                                    isLoading={loadingAction === 'approve'}
                                    isDisabled={!canApprove || Boolean(loadingAction)}
                                    onClick={() => handleReviewAction(tx, 'approve', tx.review_notes)}
                                  >
                                    Approve
                                  </Button>
                                </ChakraTooltip>
                                <Button
                                  size="sm"
                                  colorScheme="orange"
                                  variant="outline"
                                  isLoading={loadingAction === 'reject'}
                                  isDisabled={Boolean(loadingAction)}
                                  onClick={() => handleReviewAction(tx, 'reject', tx.review_notes)}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  isLoading={loadingAction === 'block'}
                                  isDisabled={Boolean(loadingAction)}
                                  onClick={() => handleReviewAction(tx, 'block', tx.review_notes)}
                                >
                                  Block account
                                </Button>
                              </HStack>
                            </Box>
                          );
                        })
                      ) : (
                        <Text textAlign="center" color="gray.500">
                          All approvals are up to date.
                        </Text>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="white" borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <HStack spacing={3} mb={3} align="center">
                      <ShieldAlert size={18} color="#7c3aed" />
                      <Heading size="sm" color="gray.800">
                        Blocked accounts
                      </Heading>
                      <Badge colorScheme={blockedAccountCount > 0 ? 'red' : 'green'} variant="subtle">
                        {blockedAccountCount}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.500" mb={4}>
                      Accounts that were blocked during transaction review. Unblock them once issues are resolved.
                    </Text>
                    <VStack align="stretch" spacing={3}>
                      {blockedAccounts.length > 0 ? (
                        blockedAccounts.map((account) => (
                          <Box
                            key={account.id}
                            p={3}
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="lg"
                          >
                            <Flex
                              direction={{ base: 'column', md: 'row' }}
                              justify="space-between"
                              align={{ base: 'flex-start', md: 'center' }}
                              gap={3}
                            >
                              <VStack align="flex-start" spacing={1}>
                                <Text fontWeight="semibold" color="gray.800">
                                  {account.first_name} {account.last_name}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {account.email}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  {account.account_status_reason || 'No reason provided'}
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                  Updated {formatDate(account.account_status_updated_at)}
                                </Text>
                              </VStack>
                              <Button
                                size="sm"
                                colorScheme="green"
                                variant="solid"
                                isLoading={accountStatusLoading[account.id] === 'active'}
                                isDisabled={Boolean(accountStatusLoading[account.id])}
                                onClick={() => handleAccountStatusUpdate(account.id, 'active')}
                              >
                                Unblock account
                              </Button>
                            </Flex>
                          </Box>
                        ))
                      ) : (
                        <Text textAlign="center" color="gray.500">
                          No blocked accounts at the moment.
                        </Text>
                      )}
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg="white" borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <HStack spacing={3} mb={3}>
                      <Clock size={18} color="#7c3aed" />
                      <Heading size="sm" color="gray.800">
                        Flagged activity queue
                      </Heading>
                    </HStack>
                    <Text fontSize="sm" color="gray.500" mb={4}>
                      Review transactions that matched risk rules (pending status or amount ≥ $5,000).
                    </Text>
                    <VStack align="stretch" spacing={3}>
                      {(data?.flaggedTransactions || []).map((tx) => (
                        <Flex
                          key={tx.id}
                          justify="space-between"
                          align={{ base: 'flex-start', md: 'center' }}
                          gap={4}
                          p={3}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="lg"
                        >
                          <VStack align="flex-start" spacing={1}>
                            <Text fontWeight="semibold" color="gray.800">
                              {tx.customer}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {tx.id.slice(0, 10).toUpperCase()}
                            </Text>
                          </VStack>
                          <Tag colorScheme="purple" variant="subtle">
                            {tx.review_status === 'pending' ? 'Pending review' : 'High value'}
                          </Tag>
                          <Text fontWeight="bold" color="gray.800">
                            {formatCurrency(tx.amount)}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {formatDate(tx.created_at)}
                          </Text>
                        </Flex>
                      ))}
                      {(data?.flaggedTransactions || []).length === 0 && (
                        <Text textAlign="center" color="gray.500">
                          No active alerts. Your risk queue is clear.
                        </Text>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>
            <TabPanel px={0} pt={6}>
              <Stack spacing={4}>
                <Flex
                  direction={{ base: 'column', md: 'row' }}
                  justify="space-between"
                  align={{ base: 'stretch', md: 'center' }}
                  gap={4}
                >
                  <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                    Contact Submissions ({data?.contactSubmissions?.length || 0})
                  </Text>
                  <HStack spacing={2}>
                    <Badge colorScheme="red" fontSize="sm">
                      {stats.unreadContacts} Unread
                    </Badge>
                  </HStack>
                </Flex>

                {data?.contactSubmissions && data.contactSubmissions.length > 0 ? (
                  <>
                    {/* Desktop Table View */}
                    <Box display={{ base: 'none', md: 'block' }}>
                      <Card bg="white" borderRadius="xl" boxShadow="sm" overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Name</Th>
                              <Th>Email</Th>
                              <Th>Message</Th>
                              <Th>Status</Th>
                              <Th>Date</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {data.contactSubmissions.map((contact) => (
                              <Tr
                                key={contact.id}
                                bg={contact.status === 'unread' ? 'purple.50' : 'white'}
                                _hover={{ bg: 'gray.50' }}
                              >
                                <Td fontWeight="medium">{contact.name}</Td>
                                <Td>{contact.email}</Td>
                                <Td maxW="300px">
                                  <Text fontSize="sm" noOfLines={2}>
                                    {contact.message}
                                  </Text>
                                </Td>
                                <Td>
                                  <Badge
                                    colorScheme={
                                      contact.status === 'unread'
                                        ? 'red'
                                        : contact.status === 'responded'
                                        ? 'green'
                                        : 'gray'
                                    }
                                  >
                                    {contact.status}
                                  </Badge>
                                </Td>
                                <Td fontSize="sm">{formatDate(contact.created_at)}</Td>
                                <Td>
                                  <HStack spacing={2}>
                                    {contact.status === 'unread' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        colorScheme="purple"
                                        onClick={() => handleMarkContactRead(contact.id)}
                                        isLoading={contactActionLoading[contact.id] === 'read'}
                                      >
                                        Mark Read
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      colorScheme="purple"
                                      onClick={() => handleOpenResponseModal(contact)}
                                      isLoading={contactActionLoading[contact.id] === 'respond'}
                                    >
                                      {contact.admin_response ? 'View Response' : 'Respond'}
                                    </Button>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Card>
                    </Box>

                    {/* Mobile Card View */}
                    <Box display={{ base: 'block', md: 'none' }}>
                      <VStack spacing={4} align="stretch">
                        {data.contactSubmissions.map((contact) => (
                          <Card
                            key={contact.id}
                            bg={contact.status === 'unread' ? 'purple.50' : 'white'}
                            borderRadius="xl"
                            boxShadow="sm"
                            borderLeft="4px solid"
                            borderLeftColor={
                              contact.status === 'unread'
                                ? 'red.500'
                                : contact.status === 'responded'
                                ? 'green.500'
                                : 'gray.300'
                            }
                          >
                            <CardBody>
                              <VStack spacing={3} align="stretch">
                                <Flex justify="space-between" align="start" flexWrap="wrap" gap={2}>
                                  <VStack align="flex-start" spacing={1} flex={1}>
                                    <Text fontWeight="bold" fontSize="md" color="gray.800">
                                      {contact.name}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600" wordBreak="break-all">
                                      {contact.email}
                                    </Text>
                                  </VStack>
                                  <Badge
                                    colorScheme={
                                      contact.status === 'unread'
                                        ? 'red'
                                        : contact.status === 'responded'
                                        ? 'green'
                                        : 'gray'
                                    }
                                    fontSize="xs"
                                    textTransform="capitalize"
                                  >
                                    {contact.status}
                                  </Badge>
                                </Flex>

                                <Box>
                                  <Text fontSize="xs" color="gray.500" mb={1}>
                                    Message:
                                  </Text>
                                  <Text fontSize="sm" color="gray.700" noOfLines={3}>
                                    {contact.message}
                                  </Text>
                                </Box>

                                <Text fontSize="xs" color="gray.500">
                                  {formatDate(contact.created_at)}
                                </Text>

                                <Divider />

                                <VStack spacing={2} align="stretch">
                                  {contact.status === 'unread' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      colorScheme="purple"
                                      onClick={() => handleMarkContactRead(contact.id)}
                                      isLoading={contactActionLoading[contact.id] === 'read'}
                                      width="full"
                                    >
                                      Mark Read
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    colorScheme="purple"
                                    onClick={() => handleOpenResponseModal(contact)}
                                    isLoading={contactActionLoading[contact.id] === 'respond'}
                                    width="full"
                                  >
                                    {contact.admin_response ? 'View Response' : 'Respond'}
                                  </Button>
                                </VStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </VStack>
                    </Box>
                  </>
                ) : (
                  <Card bg="white" borderRadius="xl" boxShadow="sm">
                    <CardBody>
                      <VStack spacing={4} py={8}>
                        <Mail size={48} color="#9ca3af" />
                        <Text color="gray.600">No contact submissions yet</Text>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </Stack>
            </TabPanel>
            <TabPanel px={0} pt={6}>
              <Stack spacing={4}>
                <Flex
                  direction={{ base: 'column', md: 'row' }}
                  justify="space-between"
                  align={{ base: 'stretch', md: 'center' }}
                  gap={4}
                >
                  <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                    Check Deposits ({data?.checkDeposits?.length || 0})
                  </Text>
                  <HStack spacing={2}>
                    <Badge colorScheme="orange" fontSize="sm">
                      {data?.checkDeposits?.filter((d) => d.status === 'pending').length || 0} Pending
                    </Badge>
                    <Badge colorScheme="blue" fontSize="sm">
                      {data?.checkDeposits?.filter((d) => d.status === 'processing').length || 0} Processing
                    </Badge>
                  </HStack>
                </Flex>

                {data?.checkDeposits && data.checkDeposits.length > 0 ? (
                  <VStack align="stretch" spacing={4}>
                    {data.checkDeposits.map((deposit) => {
                      const loadingAction = checkDepositActionLoading[deposit.id];
                      const statusColor = {
                        pending: 'orange',
                        processing: 'blue',
                        completed: 'green',
                        rejected: 'red',
                        cancelled: 'gray',
                      }[deposit.status] || 'gray';

                      return (
                        <Card key={deposit.id} bg="white" borderRadius="xl" boxShadow="sm">
                          <CardBody>
                            <Flex
                              direction={{ base: 'column', md: 'row' }}
                              gap={4}
                              align={{ base: 'flex-start', md: 'center' }}
                            >
                              <VStack align="flex-start" spacing={2} flex={1}>
                                <HStack spacing={2}>
                                  <Text fontWeight="semibold" color="gray.800">
                                    {deposit.customer}
                                  </Text>
                                  <Badge colorScheme={statusColor} variant="subtle">
                                    {deposit.status}
                                  </Badge>
                                </HStack>
                                <Text fontSize="sm" color="gray.500">
                                  {deposit.customer_email}
                                </Text>
                                <HStack spacing={4} fontSize="sm" color="gray.600" flexWrap="wrap">
                                  <Text>
                                    <strong>Amount:</strong> {formatCurrency(deposit.amount)}
                                  </Text>
                                  {deposit.check_number && (
                                    <Text>
                                      <strong>Check #:</strong> {deposit.check_number}
                                    </Text>
                                  )}
                                  <Text>
                                    <strong>Deposit Date:</strong> {formatDate(deposit.deposit_date)}
                                  </Text>
                                </HStack>
                                {deposit.rejection_reason && (
                                  <Alert status="error" borderRadius="md" fontSize="sm">
                                    <AlertIcon />
                                    {deposit.rejection_reason}
                                  </Alert>
                                )}
                                <Text fontSize="xs" color="gray.400">
                                  Submitted {formatDate(deposit.created_at)}
                                </Text>
                              </VStack>

                              <VStack spacing={2} align="flex-end">
                                {(deposit.front_image_url || deposit.back_image_url) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCheckDepositModal({ isOpen: true, deposit })}
                                  >
                                    View Images
                                  </Button>
                                )}
                                <HStack spacing={2}>
                                  {deposit.status === 'pending' && (
                                    <>
                                      <Button
                                        size="sm"
                                        colorScheme="green"
                                        isLoading={loadingAction === 'approve'}
                                        isDisabled={Boolean(loadingAction)}
                                        onClick={() => handleCheckDepositAction(deposit.id, 'approve')}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        colorScheme="red"
                                        variant="outline"
                                        isLoading={loadingAction === 'reject'}
                                        isDisabled={Boolean(loadingAction)}
                                        onClick={() => {
                                          const reason = prompt('Enter rejection reason (optional):');
                                          if (reason !== null) {
                                            handleCheckDepositReject(deposit.id, reason);
                                          }
                                        }}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {deposit.status === 'processing' && (
                                    <Button
                                      size="sm"
                                      colorScheme="green"
                                      isLoading={loadingAction === 'completed'}
                                      isDisabled={Boolean(loadingAction)}
                                      onClick={() => handleCheckDepositAction(deposit.id, 'completed')}
                                    >
                                      Complete & Credit Account
                                    </Button>
                                  )}
                                </HStack>
                              </VStack>
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                ) : (
                  <Card bg="white" borderRadius="xl" boxShadow="sm">
                    <CardBody>
                      <Text textAlign="center" color="gray.500">
                        No check deposits found.
                      </Text>
                    </CardBody>
                  </Card>
                )}
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Modal isOpen={isAccountModalOpen} onClose={closeAccountModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create customer account</ModalHeader>
          <ModalCloseButton disabled={accountModalLoading} />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Customer</FormLabel>
                <Select
                  placeholder="Select customer"
                  value={accountForm.userId}
                  onChange={handleAccountFieldChange('userId')}
                >
                  {(data?.users || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.email}
                    </option>
                  ))}
                </Select>
                <FormHelperText>Select an existing user profile.</FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Account name</FormLabel>
                <Input
                  placeholder="e.g. Everyday Checking"
                  value={accountForm.accountName}
                  onChange={handleAccountFieldChange('accountName')}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Account number</FormLabel>
                <Input
                  placeholder="Optional custom account number"
                  value={accountForm.accountNumber}
                  onChange={handleAccountFieldChange('accountNumber')}
                />
                <FormHelperText>Leave blank to auto-generate an account number.</FormHelperText>
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Account type</FormLabel>
                  <Select
                    value={accountForm.accountType}
                    onChange={handleAccountFieldChange('accountType')}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit</option>
                    <option value="investment">Investment</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={accountForm.currency}
                    onChange={handleAccountFieldChange('currency')}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                    <option value="JPY">JPY</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Initial balance</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={accountForm.initialBalance}
                    onChange={handleAccountFieldChange('initialBalance')}
                  />
                  <FormHelperText>Optional starting balance applied immediately.</FormHelperText>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Set as primary</FormLabel>
                  <Switch
                    isChecked={accountForm.isPrimary}
                    onChange={handleAccountFieldChange('isPrimary')}
                    colorScheme="purple"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Initial balance posting date</FormLabel>
                <Input
                  type="datetime-local"
                  value={accountForm.initialBalancePostedAt}
                  onChange={handleAccountFieldChange('initialBalancePostedAt')}
                  max={new Date().toISOString().slice(0, 16)}
                />
                <FormHelperText>When the initial balance should appear in history (defaults to now).</FormHelperText>
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Bank name</FormLabel>
                  <Input
                    placeholder="Optional bank label"
                    value={accountForm.bankName}
                    onChange={handleAccountFieldChange('bankName')}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Bank logo URL</FormLabel>
                  <Input
                    placeholder="https://..."
                    value={accountForm.bankLogo}
                    onChange={handleAccountFieldChange('bankLogo')}
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeAccountModal} disabled={accountModalLoading}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateAccount}
              isLoading={accountModalLoading}
            >
              Create account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isTransactionModalOpen} onClose={closeTransactionModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {transactionMode === 'deposit' ? 'Record deposit' : 'Record withdrawal'}
          </ModalHeader>
          <ModalCloseButton disabled={transactionModalLoading} />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Customer</FormLabel>
                <Select
                  placeholder="Select customer"
                  value={transactionForm.userId}
                  onChange={handleTransactionFieldChange('userId')}
                >
                  {(data?.users || []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.email}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired isDisabled={!transactionForm.userId || fetchingAccounts}>
                <FormLabel>Account</FormLabel>
                <Select
                  placeholder={
                    transactionForm.userId
                      ? fetchingAccounts
                        ? 'Loading accounts...'
                        : availableAccounts.length > 0
                        ? 'Select account'
                        : 'No accounts found'
                      : 'Select customer first'
                  }
                  value={transactionForm.accountId}
                  onChange={handleTransactionFieldChange('accountId')}
                >
                  {availableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} • {formatCurrency(account.balance, account.currency)}
                    </option>
                  ))}
                </Select>
                {fetchingAccounts && (
                  <HStack spacing={2} mt={2}>
                    <Spinner size="sm" color="purple.500" />
                    <Text fontSize="xs" color="gray.500">
                      Loading accounts...
                    </Text>
                  </HStack>
                )}
                {transactionForm.accountId && (
                  <FormHelperText>
                    Current balance:{' '}
                    {formatCurrency(
                      availableAccounts.find((acc) => acc.id === transactionForm.accountId)?.balance ||
                        0
                    )}
                  </FormHelperText>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Amount</FormLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={handleTransactionFieldChange('amount')}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Internal notes</FormLabel>
                <Textarea
                  placeholder="Optional description shown in transaction history"
                  value={transactionForm.description}
                  onChange={handleTransactionFieldChange('description')}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Posting date</FormLabel>
                <Input
                  type="datetime-local"
                  value={transactionForm.postedAt}
                  onChange={handleTransactionFieldChange('postedAt')}
                  max={new Date().toISOString().slice(0, 16)}
                />
                <FormHelperText>
                  Choose when this transaction should appear in history (defaults to now).
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={closeTransactionModal}
              disabled={transactionModalLoading}
            >
              Cancel
            </Button>
            <Button
              colorScheme={transactionMode === 'deposit' ? 'green' : 'red'}
              onClick={handleProcessTransaction}
              isLoading={transactionModalLoading}
            >
              {transactionMode === 'deposit' ? 'Record deposit' : 'Record withdrawal'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={reviewModalState.isOpen} onClose={closeReviewModal} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Transaction ID</FormLabel>
                <Input value={reviewModalState.transaction?.id || ''} isReadOnly />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Action</FormLabel>
                <Select
                  value={reviewModalState.action}
                  onChange={(e) => {
                    const action = e.target.value;
                    setReviewModalState((prev) => ({ ...prev, action }));
                  }}
                >
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="block">Block Account</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Notes (optional)</FormLabel>
                <Textarea
                  placeholder="Add any notes for the review"
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeReviewModal} isDisabled={reviewActionLoading[reviewModalState.transaction?.id]}>
              Cancel
            </Button>
            <Button
              colorScheme={
                reviewModalState.action === 'approve'
                  ? 'green'
                  : reviewModalState.action === 'reject'
                  ? 'orange'
                  : 'red'
              }
              onClick={() => executeReviewAction(reviewModalState.transaction, reviewModalState.action, reviewNotesInput)}
              isLoading={reviewActionLoading[reviewModalState.transaction?.id]}
            >
              {reviewModalState.action}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Contact Response Modal */}
      <Modal isOpen={contactResponseModal.isOpen} onClose={handleCloseResponseModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {contactResponseModal.contact?.admin_response ? 'View Response' : 'Respond to Contact'}
          </ModalHeader>
          <ModalCloseButton isDisabled={contactActionLoading[contactResponseModal.contact?.id]} />
          <ModalBody>
            {contactResponseModal.contact && (
              <VStack spacing={4} align="stretch">
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                    From: {contactResponseModal.contact.name} ({contactResponseModal.contact.email})
                  </Text>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Date: {formatDate(contactResponseModal.contact.created_at)}
                  </Text>
                  <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
                    {contactResponseModal.contact.message}
                  </Text>
                </Box>

                {contactResponseModal.contact.admin_response && (
                  <Box p={4} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                    <Text fontSize="sm" fontWeight="semibold" color="green.700" mb={2}>
                      Your Response:
                    </Text>
                    <Text fontSize="sm" color="green.800" whiteSpace="pre-wrap">
                      {contactResponseModal.contact.admin_response}
                    </Text>
                    {contactResponseModal.contact.responded_at && (
                      <Text fontSize="xs" color="green.600" mt={2}>
                        Responded: {formatDate(contactResponseModal.contact.responded_at)}
                      </Text>
                    )}
                  </Box>
                )}

                {!contactResponseModal.contact.admin_response && (
                  <FormControl>
                    <FormLabel>Your Response</FormLabel>
                    <Textarea
                      placeholder="Type your response here..."
                      value={contactResponseText}
                      onChange={(e) => setContactResponseText(e.target.value)}
                      rows={6}
                      resize="vertical"
                      isDisabled={contactActionLoading[contactResponseModal.contact.id]}
                    />
                    <FormHelperText>
                      This response will be saved and can be viewed later.
                    </FormHelperText>
                  </FormControl>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={handleCloseResponseModal}
              isDisabled={contactActionLoading[contactResponseModal.contact?.id]}
            >
              {contactResponseModal.contact?.admin_response ? 'Close' : 'Cancel'}
            </Button>
            {!contactResponseModal.contact?.admin_response && (
              <Button
                colorScheme="purple"
                onClick={handleSubmitResponse}
                isLoading={contactActionLoading[contactResponseModal.contact?.id]}
                isDisabled={!contactResponseText.trim()}
              >
                Submit Response
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Check Deposit Images Modal */}
      <Modal
        isOpen={checkDepositModal.isOpen}
        onClose={() => setCheckDepositModal({ isOpen: false, deposit: null })}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Check Deposit Images</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {checkDepositModal.deposit && (
              <VStack spacing={4}>
                {checkDepositModal.deposit.front_image_url && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>
                      Front of Check
                    </Text>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={checkDepositModal.deposit.front_image_url}
                      alt="Front of check"
                      style={{ borderRadius: '8px', maxHeight: '400px', objectFit: 'contain', width: '100%' }}
                    />
                  </Box>
                )}
                {checkDepositModal.deposit.back_image_url && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>
                      Back of Check
                    </Text>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={checkDepositModal.deposit.back_image_url}
                      alt="Back of check"
                      style={{ borderRadius: '8px', maxHeight: '400px', objectFit: 'contain', width: '100%' }}
                    />
                  </Box>
                )}
                {!checkDepositModal.deposit.front_image_url && !checkDepositModal.deposit.back_image_url && (
                  <Text color="gray.500">No images available for this deposit.</Text>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setCheckDepositModal({ isOpen: false, deposit: null })}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {loading && (
        <Flex
          position="fixed"
          inset={0}
          bg="blackAlpha.200"
          backdropFilter="blur(2px)"
          align="center"
          justify="center"
          zIndex={2000}
        >
          <Spinner size="xl" color="purple.500" />
        </Flex>
      )}
    </Box>
  );
};

// Prevent SSR to avoid hydration issues
const AdminDashboard = dynamic(() => Promise.resolve(AdminDashboardComponent), {
  ssr: false,
  loading: () => null,
});

// Client component wrapper to prevent SSR
function AdminPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <AdminDashboard />;
}

export default AdminPage;

