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
  Select,
  useToast,
  useDisclosure,
  IconButton,
  useBreakpointValue,
  Heading,
  Checkbox,
  Radio,
  RadioGroup,
  Stack,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Download,
  FileText,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function ExportPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

  const [exportForm, setExportForm] = useState({
    data_type: 'transactions',
    account_id: '',
    format: 'csv',
    date_range: 'all',
    start_date: '',
    end_date: '',
    include_categories: true,
    include_balances: true,
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

      // Load accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', authUser.id)
        .order('is_primary', { ascending: false });

      if (accountsData) setAccounts(accountsData);

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

  const handleExport = async () => {
    setExporting(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      let query = supabase
        .from('transactions')
        .select('*, accounts(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: true });

      if (exportForm.account_id) {
        query = query.eq('account_id', exportForm.account_id);
      }

      if (exportForm.date_range === 'custom') {
        if (exportForm.start_date) {
          query = query.gte('created_at', exportForm.start_date);
        }
        if (exportForm.end_date) {
          query = query.lte('created_at', exportForm.end_date);
        }
      } else if (exportForm.date_range === 'month') {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        query = query.gte('created_at', start.toISOString());
      } else if (exportForm.date_range === 'year') {
        const start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        query = query.gte('created_at', start.toISOString());
      }

      const { data: transactions } = await query;

      if (!transactions || transactions.length === 0) {
        toast({
          title: 'No Data',
          description: 'No transactions found for the selected criteria',
          status: 'warning',
        });
        setExporting(false);
        return;
      }

      if (exportForm.format === 'csv') {
        const headers = ['Date', 'Description', 'Category', 'Amount'];
        if (exportForm.include_balances) headers.push('Balance');
        if (exportForm.account_id) headers.push('Account');

        const rows = transactions.map(t => {
          const row = [
            new Date(t.created_at).toLocaleDateString(),
            `"${t.description || ''}"`,
            t.category || '',
            t.amount,
          ];
          if (exportForm.include_balances) {
            row.push(t.accounts?.balance || '');
          }
          if (exportForm.account_id) {
            row.push(t.accounts?.account_name || '');
          }
          return row.join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${exportForm.account_id || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // PDF export (simplified - would need a PDF library in production)
        toast({
          title: 'PDF Export',
          description: 'PDF export coming soon. Please use CSV format.',
          status: 'info',
        });
      }

      toast({
        title: 'Export Complete',
        description: 'Your data has been exported successfully',
        status: 'success',
      });

    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data',
        status: 'error',
      });
    } finally {
      setExporting(false);
    }
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
          <Heading size="md">Export Data</Heading>
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
        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Data Type</FormLabel>
                <Select
                  value={exportForm.data_type}
                  onChange={(e) => setExportForm({ ...exportForm, data_type: e.target.value })}
                >
                  <option value="transactions">Transactions</option>
                  <option value="statements">Account Statements</option>
                  <option value="tax">Tax Documents</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Account (Optional)</FormLabel>
                <Select
                  value={exportForm.account_id}
                  onChange={(e) => setExportForm({ ...exportForm, account_id: e.target.value })}
                  placeholder="All Accounts"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Export Format</FormLabel>
                <RadioGroup
                  value={exportForm.format}
                  onChange={(value) => setExportForm({ ...exportForm, format: value })}
                >
                  <Stack direction="row">
                    <Radio value="csv">CSV</Radio>
                    <Radio value="pdf">PDF</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Date Range</FormLabel>
                <Select
                  value={exportForm.date_range}
                  onChange={(e) => setExportForm({ ...exportForm, date_range: e.target.value })}
                >
                  <option value="all">All Time</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </Select>
              </FormControl>

              {exportForm.date_range === 'custom' && (
                <>
                  <FormControl>
                    <FormLabel>Start Date</FormLabel>
                    <Input
                      type="date"
                      value={exportForm.start_date}
                      onChange={(e) => setExportForm({ ...exportForm, start_date: e.target.value })}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>End Date</FormLabel>
                    <Input
                      type="date"
                      value={exportForm.end_date}
                      onChange={(e) => setExportForm({ ...exportForm, end_date: e.target.value })}
                    />
                  </FormControl>
                </>
              )}

              <Divider />

              <VStack align="stretch" spacing={3}>
                <Text fontWeight="semibold">Export Options</Text>
                <Checkbox
                  isChecked={exportForm.include_categories}
                  onChange={(e) => setExportForm({ ...exportForm, include_categories: e.target.checked })}
                >
                  Include Categories
                </Checkbox>
                <Checkbox
                  isChecked={exportForm.include_balances}
                  onChange={(e) => setExportForm({ ...exportForm, include_balances: e.target.checked })}
                >
                  Include Running Balances
                </Checkbox>
              </VStack>

              <Button
                leftIcon={<Download size={18} />}
                colorScheme="purple"
                size="lg"
                onClick={handleExport}
                isLoading={exporting}
                loadingText="Exporting..."
              >
                Export Data
              </Button>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Exported files can be opened in Excel, Google Sheets, or any spreadsheet application.
                </Text>
              </Alert>
            </VStack>
          </CardBody>
        </Card>
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

