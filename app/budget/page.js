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
  Input,
  FormControl,
  FormLabel,
  Select,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  Lightbulb,
  Edit,
  Trash2,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Gas',
  'Subscriptions',
  'Other',
];

const COLORS = ['#9c27b0', '#ec4899', '#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'];

export default function BudgetPage() {
  const router = useRouter();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isAIOpen, onOpen: onAIOpen, onClose: onAIClose } = useDisclosure();
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [newBudget, setNewBudget] = useState({
    category: '',
    monthly_limit: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    setMounted(true);
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Load budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('category', { ascending: true });
      setBudgets(budgetsData || []);

      // Load transactions for this month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });

      setTransactions(transactionsData || []);

      // Find uncategorized transactions
      const uncategorized = (transactionsData || []).filter(
        t => !t.category || t.category === 'Other' || !CATEGORIES.includes(t.category)
      );
      setUncategorizedTransactions(uncategorized);

      // Update budget spending based on transactions
      await updateBudgetSpending(budgetsData || [], transactionsData || []);

      // Generate AI suggestions
      generateAISuggestions(budgetsData || [], transactionsData || []);

    } catch (error) {
      console.error('Error loading budget data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget data',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBudgetSpending = async (budgetsData, transactionsData) => {
    if (!budgetsData || budgetsData.length === 0) return;

    for (const budget of budgetsData) {
      const categorySpending = transactionsData
        .filter(t => t.category === budget.category && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

      if (categorySpending !== parseFloat(budget.current_spending)) {
        await supabase
          .from('budgets')
          .update({ current_spending: categorySpending })
          .eq('id', budget.id);
      }
    }
  };

  const generateAISuggestions = (budgetsData, transactionsData) => {
    const suggestions = [];

    // Calculate total spending
    const totalSpending = transactionsData
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

    // Check for overspending budgets
    budgetsData.forEach(budget => {
      const percentage = (budget.current_spending / budget.monthly_limit) * 100;
      if (percentage > 100) {
        suggestions.push({
          type: 'warning',
          title: `Over Budget: ${budget.category}`,
          message: `You've spent ${formatCurrency(budget.current_spending)} on ${budget.category}, which is ${(percentage - 100).toFixed(0)}% over your budget of ${formatCurrency(budget.monthly_limit)}.`,
          action: 'Consider reducing spending in this category.',
        });
      } else if (percentage > 80) {
        suggestions.push({
          type: 'info',
          title: `Approaching Budget Limit: ${budget.category}`,
          message: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget. ${formatCurrency(budget.monthly_limit - budget.current_spending)} remaining.`,
          action: 'Be mindful of your spending.',
        });
      }
    });

    // Analyze spending patterns
    const categorySpending = {};
    transactionsData.filter(t => t.amount < 0).forEach(t => {
      const category = t.category || 'Other';
      categorySpending[category] = (categorySpending[category] || 0) + Math.abs(parseFloat(t.amount));
    });

    // Find top spending category
    const topCategory = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topCategory && topCategory[1] > totalSpending * 0.3) {
      suggestions.push({
        type: 'info',
        title: 'Spending Pattern Detected',
        message: `${topCategory[0]} accounts for ${((topCategory[1] / totalSpending) * 100).toFixed(0)}% of your spending this month.`,
        action: 'Consider setting a budget for this category.',
      });
    }

    // Check for uncategorized transactions
    if (uncategorizedTransactions.length > 5) {
      suggestions.push({
        type: 'info',
        title: 'Categorize Your Transactions',
        message: `You have ${uncategorizedTransactions.length} uncategorized transactions. Categorizing helps track spending better.`,
        action: 'Review and categorize your transactions.',
      });
    }

    // Savings suggestion
    const income = transactionsData
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    if (income > 0) {
      const savingsRate = ((income - totalSpending) / income) * 100;
      if (savingsRate < 20) {
        suggestions.push({
          type: 'suggestion',
          title: 'Increase Your Savings',
          message: `You're saving ${savingsRate.toFixed(0)}% of your income. Financial experts recommend saving at least 20%.`,
          action: 'Consider setting up automatic transfers to a savings account.',
        });
      } else if (savingsRate >= 20) {
        suggestions.push({
          type: 'success',
          title: 'Great Savings Rate!',
          message: `You're saving ${savingsRate.toFixed(0)}% of your income. Keep it up!`,
          action: 'Consider investing your savings for long-term growth.',
        });
      }
    }

    setAiSuggestions(suggestions);
  };

  const handleAddBudget = async () => {
    if (!newBudget.category || !newBudget.monthly_limit) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if budget already exists for this category/month/year
      const { data: existing } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('category', newBudget.category)
        .eq('month', newBudget.month)
        .eq('year', newBudget.year)
        .single();

      if (existing) {
        toast({
          title: 'Budget Already Exists',
          description: 'A budget for this category already exists for this month',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const { error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category: newBudget.category,
          monthly_limit: parseFloat(newBudget.monthly_limit),
          current_spending: 0,
          month: newBudget.month,
          year: newBudget.year,
        });

      if (error) throw error;

      toast({
        title: 'Budget Created',
        description: 'Your budget has been created successfully',
        status: 'success',
        duration: 3000,
      });

      onAddClose();
      setNewBudget({
        category: '',
        monthly_limit: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
      loadBudgetData();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to create budget',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleEditBudget = (budget) => {
    setSelectedBudget(budget);
    onEditOpen();
  };

  const handleUpdateBudget = async () => {
    if (!selectedBudget || !selectedBudget.monthly_limit) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('budgets')
        .update({ monthly_limit: parseFloat(selectedBudget.monthly_limit) })
        .eq('id', selectedBudget.id);

      if (error) throw error;

      toast({
        title: 'Budget Updated',
        description: 'Your budget has been updated',
        status: 'success',
        duration: 2000,
      });

      onEditClose();
      setSelectedBudget(null);
      loadBudgetData();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to update budget',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      toast({
        title: 'Budget Deleted',
        description: 'Budget has been removed',
        status: 'success',
        duration: 2000,
      });

      loadBudgetData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete budget',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCategorizeTransaction = async (transaction, category) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({
        title: 'Transaction Categorized',
        description: `Transaction categorized as ${category}`,
        status: 'success',
        duration: 2000,
      });

      loadBudgetData();
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to categorize transaction',
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

  const getSuggestionColor = (type) => {
    switch (type) {
      case 'warning':
        return 'red';
      case 'info':
        return 'blue';
      case 'suggestion':
        return 'purple';
      case 'success':
        return 'green';
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

  const budgetChartData = budgets.map(budget => ({
    name: budget.category,
    limit: budget.monthly_limit,
    spent: budget.current_spending,
    remaining: Math.max(0, budget.monthly_limit - budget.current_spending),
  }));

  const categorySpendingData = CATEGORIES.map(category => {
    const spending = transactions
      .filter(t => t.category === category && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    return {
      name: category,
      value: spending,
      color: COLORS[CATEGORIES.indexOf(category) % COLORS.length],
    };
  }).filter(item => item.value > 0);

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
              Budget & Insights
            </Text>
          </HStack>
          <HStack spacing={2}>
            <IconButton
              icon={<Sparkles size={20} />}
              variant="ghost"
              onClick={onAIOpen}
              aria-label="AI Suggestions"
              colorScheme="purple"
            />
            <Button
              leftIcon={<Plus size={16} />}
              colorScheme="purple"
              size="sm"
              onClick={onAddOpen}
            >
              Add Budget
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box px={4} py={4}>
        <Tabs colorScheme="purple">
          <TabList>
            <Tab>Budgets</Tab>
            <Tab>Categorize</Tab>
            <Tab>Analytics</Tab>
          </TabList>

          <TabPanels>
            {/* Budgets Tab */}
            <TabPanel px={0}>
              {budgets.length > 0 ? (
                <VStack spacing={4} align="stretch">
                  {budgets.map((budget) => {
                    const percentage = (budget.current_spending / budget.monthly_limit) * 100;
                    const isOver = budget.current_spending > budget.monthly_limit;
                    const remaining = budget.monthly_limit - budget.current_spending;

                    return (
                      <Card key={budget.id} bg={cardBg} borderRadius="xl" boxShadow="md">
                        <CardBody p={4}>
                          <Flex justify="space-between" align="flex-start" mb={3}>
                            <VStack align="flex-start" spacing={1} flex={1}>
                              <HStack spacing={2}>
                                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                                  {budget.category}
                                </Text>
                                {isOver && (
                                  <Badge colorScheme="red">Over Budget</Badge>
                                )}
                                {percentage > 80 && !isOver && (
                                  <Badge colorScheme="orange">Warning</Badge>
                                )}
                              </HStack>
                              <Text fontSize="sm" color="gray.600">
                                {formatCurrency(budget.current_spending)} / {formatCurrency(budget.monthly_limit)}
                              </Text>
                              <Text fontSize="xs" color={remaining < 0 ? 'red.500' : 'gray.500'}>
                                {remaining < 0 ? `Over by ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} remaining`}
                              </Text>
                            </VStack>
                            <HStack spacing={2}>
                              <IconButton
                                icon={<Edit size={16} />}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditBudget(budget)}
                                aria-label="Edit"
                              />
                              <IconButton
                                icon={<Trash2 size={16} />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDeleteBudget(budget.id)}
                                aria-label="Delete"
                              />
                            </HStack>
                          </Flex>
                          <Progress
                            value={Math.min(percentage, 100)}
                            colorScheme={isOver ? 'red' : percentage > 80 ? 'orange' : 'green'}
                            borderRadius="full"
                            size="lg"
                          />
                        </CardBody>
                      </Card>
                    );
                  })}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Target size={64} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                  <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={2}>
                    No Budgets Yet
                  </Text>
                  <Text color="gray.600" mb={4}>
                    Create a budget to track your spending
                  </Text>
                  <Button colorScheme="purple" onClick={onAddOpen}>
                    Create Budget
                  </Button>
                </Box>
              )}
            </TabPanel>

            {/* Categorize Tab */}
            <TabPanel px={0}>
              {uncategorizedTransactions.length > 0 ? (
                <VStack spacing={3} align="stretch">
                  <Text fontSize="sm" color="gray.600">
                    Categorize your transactions to track spending better
                  </Text>
                  {uncategorizedTransactions.slice(0, 10).map((transaction) => (
                    <Card key={transaction.id} bg={cardBg} borderRadius="md">
                      <CardBody p={4}>
                        <Flex justify="space-between" align="center">
                          <VStack align="flex-start" spacing={1} flex={1}>
                            <Text fontSize="md" fontWeight="semibold" color="gray.800">
                              {transaction.description || transaction.recipient_name || 'Transaction'}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {formatCurrency(Math.abs(transaction.amount))} • {new Date(transaction.created_at).toLocaleDateString()}
                            </Text>
                          </VStack>
                          <Select
                            placeholder="Category"
                            size="sm"
                            w="150px"
                            onChange={(e) => handleCategorizeTransaction(transaction, e.target.value)}
                            defaultValue={transaction.category || 'Other'}
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </Select>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 16px' }} />
                  <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={2}>
                    All Transactions Categorized
                  </Text>
                  <Text color="gray.600">
                    Great job keeping your transactions organized!
                  </Text>
                </Box>
              )}
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                {categorySpendingData.length > 0 && (
                  <Card bg={cardBg} borderRadius="xl" boxShadow="md">
                    <CardBody>
                      <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
                        Spending by Category
                      </Text>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categorySpendingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categorySpendingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                )}

                {budgetChartData.length > 0 && (
                  <Card bg={cardBg} borderRadius="xl" boxShadow="md">
                    <CardBody>
                      <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={4}>
                        Budget vs Spending
                      </Text>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={budgetChartData}>
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="limit" fill="#9c27b0" name="Budget Limit" />
                          <Bar dataKey="spent" fill="#ec4899" name="Spent" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Add Budget Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Budget</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  placeholder="Select category"
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Monthly Limit</FormLabel>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newBudget.monthly_limit}
                  onChange={(e) => setNewBudget({ ...newBudget, monthly_limit: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Month</FormLabel>
                <Select
                  value={newBudget.month}
                  onChange={(e) => setNewBudget({ ...newBudget, month: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    const date = new Date(newBudget.year, month - 1);
                    return (
                      <option key={month} value={month}>
                        {date.toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    );
                  })}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Year</FormLabel>
                <Input
                  type="number"
                  value={newBudget.year}
                  onChange={(e) => setNewBudget({ ...newBudget, year: parseInt(e.target.value) })}
                  min={2020}
                  max={2100}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAddBudget}>
              Create Budget
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Budget</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedBudget && (
              <VStack spacing={4}>
                <Box w="full">
                  <Text fontSize="sm" color="gray.600">Category</Text>
                  <Text fontSize="lg" fontWeight="semibold">{selectedBudget.category}</Text>
                </Box>
                <FormControl>
                  <FormLabel>Monthly Limit</FormLabel>
                  <Input
                    type="number"
                    value={selectedBudget.monthly_limit}
                    onChange={(e) => setSelectedBudget({ ...selectedBudget, monthly_limit: parseFloat(e.target.value) })}
                  />
                </FormControl>
                <Box w="full">
                  <Text fontSize="sm" color="gray.600">Current Spending</Text>
                  <Text fontSize="lg" fontWeight="semibold">{formatCurrency(selectedBudget.current_spending)}</Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleUpdateBudget}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* AI Suggestions Modal */}
      <Modal isOpen={isAIOpen} onClose={onAIClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Sparkles size={20} />
              <Text>AI Insights & Suggestions</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {aiSuggestions.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {aiSuggestions.map((suggestion, index) => (
                  <Card key={index} bg={`${getSuggestionColor(suggestion.type)}.50`} borderLeft="4px solid" borderLeftColor={`${getSuggestionColor(suggestion.type)}.500`}>
                    <CardBody p={4}>
                      <VStack align="flex-start" spacing={2}>
                        <HStack spacing={2}>
                          {suggestion.type === 'warning' && <AlertCircle size={20} color="#ef4444" />}
                          {suggestion.type === 'info' && <Lightbulb size={20} color="#3b82f6" />}
                          {suggestion.type === 'suggestion' && <Sparkles size={20} color="#8b5cf6" />}
                          {suggestion.type === 'success' && <TrendingUp size={20} color="#10b981" />}
                          <Text fontSize="md" fontWeight="semibold" color="gray.800">
                            {suggestion.title}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.700">
                          {suggestion.message}
                        </Text>
                        <Text fontSize="xs" color="gray.600" fontStyle="italic">
                          💡 {suggestion.action}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" py={8}>
                <Lightbulb size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                <Text color="gray.600">
                  No suggestions at this time. Keep up the great work!
                </Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onAIClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation />
    </Box>
  );
}

