'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  Card,
  CardBody,
  Badge,
  useDisclosure,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Spinner,
  Flex,
  Divider,
  Alert,
  AlertIcon,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Search, TrendingUp, TrendingDown, DollarSign, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import ContactUsModal from '@/components/ContactUsModal';
import NotificationBell from '@/components/NotificationBell';

export default function InvestPage() {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [investmentAccount, setInvestmentAccount] = useState(null);
  const [primaryAccount, setPrimaryAccount] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();
  const { isOpen: isBuyModalOpen, onOpen: onBuyModalOpen, onClose: onBuyModalClose } = useDisclosure();
  const { isOpen: isFundModalOpen, onOpen: onFundModalOpen, onClose: onFundModalClose } = useDisclosure();
  const { isOpen: isSetupModalOpen, onOpen: onSetupModalOpen, onClose: onSetupModalClose } = useDisclosure();
  const [selectedStock, setSelectedStock] = useState(null);
  const [sharesToBuy, setSharesToBuy] = useState(1.0);
  const [buying, setBuying] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [selectedSourceAccount, setSelectedSourceAccount] = useState(null);
  const toast = useToast();

  const modalSize = useBreakpointValue({ base: 'full', md: 'md' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    loadUserData();
    loadNotificationCounts();
  }, []);

  useEffect(() => {
    if (user) {
      loadPortfolio();
      loadAccounts();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(profile || authUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotificationCount((notificationsData || []).length);

      const { data: alertsData } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadAlertCount((alertsData || []).length);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all accounts - force fresh fetch
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }

      setAllAccounts(accounts || []);

      // Find investment account
      const invAccount = (accounts || []).find(acc => acc.account_type === 'investment');
      setInvestmentAccount(invAccount || null);

      // Find primary account
      const primAccount = (accounts || []).find(acc => acc.is_primary === true);
      setPrimaryAccount(primAccount || null);

      // Set balance from investment account if exists, otherwise from primary account
      if (invAccount) {
        const invBalance = parseFloat(invAccount.balance) || 0;
        setBalance(invBalance);
        console.log('Investment account balance:', invBalance);
      } else if (primAccount) {
        const primBalance = parseFloat(primAccount.balance) || 0;
        setBalance(primBalance);
        console.log('Primary account balance:', primBalance);
      } else {
        setBalance(0);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadPortfolio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: investments, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .eq('investment_type', 'stocks')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update prices for each stock
      const updatedInvestments = await Promise.all(
        (investments || []).map(async (investment) => {
          if (investment.symbol) {
            try {
              const response = await fetch(`/api/stocks/quote?symbol=${investment.symbol}`);
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.price) {
                  const currentPrice = parseFloat(data.price);
                  const totalValue = currentPrice * parseFloat(investment.shares_owned);
                  const profitLoss = totalValue - (parseFloat(investment.purchase_price || 0) * parseFloat(investment.shares_owned));

                  // Update investment in database
                  await supabase
                    .from('investments')
                    .update({
                      current_price: currentPrice,
                      total_value: totalValue,
                      profit_loss: profitLoss,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', investment.id);

                  return {
                    ...investment,
                    current_price: currentPrice,
                    total_value: totalValue,
                    profit_loss: profitLoss,
                  };
                }
              }
            } catch (error) {
              console.error(`Error updating price for ${investment.symbol}:`, error);
            }
          }
          return investment;
        })
      );

      setPortfolio(updatedInvestments || []);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/stocks/search?query=${encodeURIComponent(searchQuery.trim())}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSearchResults(data.results || []);
        } else {
          toast({
            title: 'Search Error',
            description: data.error || 'Failed to search stocks',
            status: 'error',
            duration: 3000,
          });
          setSearchResults([]);
        }
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      toast({
        title: 'Error',
        description: 'Failed to search stocks. Please try again.',
        status: 'error',
        duration: 3000,
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, toast]);

  const handleBuyClick = (stock) => {
    setSelectedStock(stock);
    setSharesToBuy(1.0);
    
    // Check if user has investment account or any account
    if (!investmentAccount && allAccounts.length === 0) {
      // No accounts at all - show setup modal
      onSetupModalOpen();
      return;
    }
    
    // Check if investment account exists and has balance
    if (investmentAccount) {
      const invBalance = parseFloat(investmentAccount.balance) || 0;
      if (invBalance > 0) {
        onBuyModalOpen();
        return;
      }
    }
    
    // Check if any account has balance
    const hasFunds = allAccounts.some(acc => 
      acc.account_type !== 'investment' && 
      parseFloat(acc.balance || 0) > 0
    );
    
    if (hasFunds) {
      // Has funds in other accounts - show funding modal
      onFundModalOpen();
      return;
    }
    
    // No funds anywhere - show funding modal (user can still see they need to add funds)
    onFundModalOpen();
  };

  const handleCreateInvestmentAccount = async () => {
    setFunding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please sign in to continue',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      // Create investment account
      const { data: newAccount, error } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: user.id,
            account_type: 'investment',
            account_name: 'Investment Account',
            account_number: `INV-${Date.now()}`,
            balance: 0,
            currency: 'USD',
            is_primary: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Investment Account Created',
        description: 'Your investment account has been created successfully!',
        status: 'success',
        duration: 3000,
      });

      await loadAccounts();
      onSetupModalClose();
      onFundModalOpen(); // Open funding modal to transfer funds
    } catch (error) {
      console.error('Error creating investment account:', error);
      toast({
        title: 'Error',
        description: 'Failed to create investment account. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setFunding(false);
    }
  };

  const handleFundAccount = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) return;
    if (!selectedSourceAccount || !investmentAccount) {
      toast({
        title: 'Error',
        description: 'Please select an account to transfer from',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const amount = parseFloat(fundAmount);
    const sourceBalance = parseFloat(selectedSourceAccount.balance) || 0;

    if (amount > sourceBalance) {
      toast({
        title: 'Insufficient Funds',
        description: `You only have ${formatCurrency(sourceBalance)} available in ${selectedSourceAccount.account_name}`,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setFunding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deduct from source account
      const newSourceBalance = sourceBalance - amount;
      const { error: updateSourceError } = await supabase
        .from('accounts')
        .update({ balance: newSourceBalance })
        .eq('id', selectedSourceAccount.id);

      if (updateSourceError) throw updateSourceError;

      // Add to investment account
      const invBalance = parseFloat(investmentAccount.balance) || 0;
      const { error: updateInvError } = await supabase
        .from('accounts')
        .update({ balance: invBalance + amount })
        .eq('id', investmentAccount.id);

      if (updateInvError) throw updateInvError;

      // Create transaction record
      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          amount: amount,
          transaction_type: 'withdrawal',
          category: 'Investment',
          description: `Transferred ${formatCurrency(amount)} from ${selectedSourceAccount.account_name} to Investment Account`,
          status: 'completed',
        },
      ]);

      toast({
        title: 'Funds Transferred',
        description: `${formatCurrency(amount)} has been transferred from ${selectedSourceAccount.account_name} to your investment account`,
        status: 'success',
        duration: 3000,
      });

      await loadAccounts();
      setFundAmount('');
      setSelectedSourceAccount(null);
      onFundModalClose();
      
      // If stock was selected, open buy modal
      if (selectedStock) {
        onBuyModalOpen();
      }
    } catch (error) {
      console.error('Error funding account:', error);
      toast({
        title: 'Transfer Failed',
        description: 'Failed to transfer funds. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setFunding(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedStock || !user) return;

    const totalCost = parseFloat(selectedStock.price) * sharesToBuy;

    // Check available balance (investment account first, then primary)
    const availableBalance = investmentAccount
      ? parseFloat(investmentAccount.balance) || 0
      : parseFloat(primaryAccount?.balance) || 0;

    if (totalCost > availableBalance) {
      toast({
        title: 'Insufficient Funds',
        description: `You need ${formatCurrency(totalCost)} but only have ${formatCurrency(availableBalance)}`,
        status: 'error',
        duration: 3000,
      });
      onBuyModalClose();
      onFundModalOpen();
      return;
    }

    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Error',
          description: 'Please sign in to purchase stocks',
          status: 'error',
          duration: 3000,
        });
        setBuying(false);
        return;
      }

      const response = await fetch('/api/stocks/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          shares: sharesToBuy,
          price: selectedStock.price,
          accountId: investmentAccount?.id || primaryAccount?.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Purchase Successful',
          description: `You bought ${sharesToBuy} share(s) of ${selectedStock.symbol}`,
          status: 'success',
          duration: 3000,
        });

        // Update accounts and balance first
        await loadAccounts();
        
        // Small delay to ensure balance is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload portfolio
        await loadPortfolio();
        
        // Close modal
        onBuyModalClose();
        setSelectedStock(null);
        setSharesToBuy(1.0);
      } else {
        throw new Error(data.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Error purchasing stock:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to purchase stock. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setBuying(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalPortfolioValue = portfolio.reduce((sum, inv) => sum + (parseFloat(inv.total_value) || 0), 0);
  const totalProfitLoss = portfolio.reduce((sum, inv) => sum + (parseFloat(inv.profit_loss) || 0), 0);

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="purple.500" />
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" pb="80px">
      <StatusBar />
      
      {/* Header */}
      <Box bg="white" borderBottom="1px solid" borderColor="gray.200" px={4} py={4}>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800">
            Invest
          </Text>
          <HStack spacing={2}>
            <NotificationBell count={unreadNotificationCount + unreadAlertCount} />
            {isMobile ? (
              <IconButton
                icon={<MessageCircle size={20} />}
                variant="ghost"
                colorScheme="purple"
                aria-label="Contact Us"
                onClick={onContactOpen}
              />
            ) : (
              <Button
                leftIcon={<MessageCircle size={18} />}
                variant="outline"
                colorScheme="purple"
                size="sm"
                onClick={onContactOpen}
              >
                Contact Us
              </Button>
            )}
          </HStack>
        </Flex>

        {/* Portfolio Summary */}
        {portfolio.length > 0 && (
          <Card bg="gradient-to-r" bgGradient="linear(to-r, purple.500, pink.500)" color="white" mb={4}>
            <CardBody>
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" opacity={0.9}>Total Portfolio Value</Text>
                <Text fontSize="3xl" fontWeight="bold">{formatCurrency(totalPortfolioValue)}</Text>
                <HStack>
                  <Text fontSize="sm">Total P/L:</Text>
                  <Badge
                    colorScheme={totalProfitLoss >= 0 ? 'green' : 'red'}
                    fontSize="sm"
                    px={2}
                    py={1}
                  >
                    {formatCurrency(totalProfitLoss)} ({formatPercent(
                      totalPortfolioValue - totalProfitLoss !== 0
                        ? (totalProfitLoss / (totalPortfolioValue - totalProfitLoss)) * 100
                        : 0
                    )})
                  </Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Investment Account Balance */}
        <Card bg="white" mb={4} boxShadow="sm">
          <CardBody>
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" color="gray.600">
                  {investmentAccount ? 'Investment Account Balance' : 'Available Balance'}
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {formatCurrency(balance)}
                </Text>
                {investmentAccount && (
                  <Text fontSize="xs" color="gray.500">
                    {investmentAccount.account_number}
                  </Text>
                )}
              </VStack>
              {investmentAccount ? (
                <Button
                  colorScheme="purple"
                  size="sm"
                  onClick={onFundModalOpen}
                  leftIcon={<DollarSign size={16} />}
                >
                  Add Funds
                </Button>
              ) : allAccounts.length > 0 ? (
                <Button
                  colorScheme="purple"
                  size="sm"
                  onClick={handleCreateInvestmentAccount}
                >
                  Set Up Investment
                </Button>
              ) : null}
            </HStack>
          </CardBody>
        </Card>

        {/* Search Bar */}
        <HStack spacing={2}>
          <Input
            placeholder="Search for stocks (e.g., AAPL, Apple, Microsoft)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            size="lg"
            bg="white"
          />
          <Button
            leftIcon={<Search size={18} />}
            colorScheme="purple"
            onClick={handleSearch}
            isLoading={searching}
            size="lg"
          >
            Search
          </Button>
        </HStack>
      </Box>

      <Box px={4} py={4}>
        {/* Search Results */}
        {searchResults.length > 0 && (
          <VStack spacing={3} align="stretch" mb={6}>
            <Text fontSize="lg" fontWeight="semibold" color="gray.800">
              Search Results
            </Text>
            {searchResults.map((stock) => (
              <Card key={stock.symbol} bg="white" boxShadow="sm">
                <CardBody>
                  <Flex justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Text fontSize="lg" fontWeight="bold" color="gray.800">
                          {stock.symbol}
                        </Text>
                        <Badge colorScheme="blue">{stock.exchange}</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {stock.name}
                      </Text>
                      <HStack>
                        <Text fontSize="xl" fontWeight="bold" color="gray.800">
                          {formatCurrency(stock.price)}
                        </Text>
                        {stock.change && (
                          <Badge
                            colorScheme={stock.change >= 0 ? 'green' : 'red'}
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {formatPercent(stock.changePercent || 0)}
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                    <Button
                      colorScheme="purple"
                      size="sm"
                      onClick={() => handleBuyClick(stock)}
                    >
                      Buy
                    </Button>
                  </Flex>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 ? (
          <VStack spacing={3} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color="gray.800">
              Your Portfolio
            </Text>
            {portfolio.map((investment) => {
              const profitLossPercent = investment.purchase_price
                ? ((parseFloat(investment.current_price || 0) - parseFloat(investment.purchase_price)) / parseFloat(investment.purchase_price)) * 100
                : 0;

              return (
                <Card key={investment.id} bg="white" boxShadow="sm">
                  <CardBody>
                    <Flex justify="space-between" align="start">
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Text fontSize="lg" fontWeight="bold" color="gray.800">
                            {investment.symbol}
                          </Text>
                          <Badge colorScheme="purple">Owned</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {investment.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {parseFloat(investment.shares_owned).toFixed(4)} shares
                        </Text>
                        <HStack spacing={4}>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="xs" color="gray.500">Current Price</Text>
                            <Text fontSize="md" fontWeight="semibold">
                              {formatCurrency(investment.current_price || 0)}
                            </Text>
                          </VStack>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="xs" color="gray.500">Total Value</Text>
                            <Text fontSize="md" fontWeight="semibold">
                              {formatCurrency(investment.total_value || 0)}
                            </Text>
                          </VStack>
                        </HStack>
                        <HStack>
                          <Text fontSize="sm" color="gray.600">P/L:</Text>
                          <Badge
                            colorScheme={parseFloat(investment.profit_loss || 0) >= 0 ? 'green' : 'red'}
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            {parseFloat(investment.profit_loss || 0) >= 0 ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {formatCurrency(investment.profit_loss || 0)} ({formatPercent(profitLossPercent)})
                          </Badge>
                        </HStack>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              );
            })}
          </VStack>
        ) : (
          searchResults.length === 0 && (
            <Box textAlign="center" py={12}>
              <Text color="gray.600" mb={2}>
                {searchQuery ? 'Search for stocks to get started' : 'No investments yet'}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Search for stocks above to start building your portfolio
              </Text>
            </Box>
          )
        )}
      </Box>

      {/* Buy Stock Modal */}
      <Modal isOpen={isBuyModalOpen} onClose={onBuyModalClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Buy Stock</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedStock && (
              <VStack spacing={4} align="stretch">
                <Card bg="gray.50">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <HStack>
                        <Text fontSize="lg" fontWeight="bold">
                          {selectedStock.symbol}
                        </Text>
                        <Badge colorScheme="blue">{selectedStock.exchange}</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {selectedStock.name}
                      </Text>
                      <Text fontSize="xl" fontWeight="bold">
                        {formatCurrency(selectedStock.price)} per share
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>

                <FormControl>
                  <FormLabel>Number of Shares</FormLabel>
                  <NumberInput
                    value={isNaN(sharesToBuy) ? 1.0 : sharesToBuy}
                    onChange={(_, value) => {
                      const numValue = isNaN(value) || value <= 0 ? 1.0 : value;
                      setSharesToBuy(numValue);
                    }}
                    min={0.0001}
                    step={0.0001}
                    precision={4}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <Divider />

                <VStack spacing={2} align="stretch">
                  <Flex justify="space-between">
                    <Text color="gray.600">Shares:</Text>
                    <Text fontWeight="semibold">{sharesToBuy.toFixed(4)}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600">Price per share:</Text>
                    <Text fontWeight="semibold">{formatCurrency(selectedStock.price)}</Text>
                  </Flex>
                  <Flex justify="space-between" fontSize="lg">
                    <Text fontWeight="bold">Total Cost:</Text>
                    <Text fontWeight="bold" color="purple.600">
                      {formatCurrency(selectedStock.price * sharesToBuy)}
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600">Available Balance:</Text>
                    <Text fontWeight="semibold">{formatCurrency(balance)}</Text>
                  </Flex>
                  {selectedStock.price * sharesToBuy > balance && (
                    <Alert status="warning" size="sm">
                      <AlertIcon />
                      Insufficient funds
                    </Alert>
                  )}
                </VStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBuyModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handlePurchase}
              isLoading={buying}
              isDisabled={selectedStock && selectedStock.price * sharesToBuy > balance}
            >
              Confirm Purchase
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Fund Investment Account Modal */}
      <Modal isOpen={isFundModalOpen} onClose={() => {
        onFundModalClose();
        setSelectedSourceAccount(null);
        setFundAmount('');
      }} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Fund Investment Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                Transfer funds from any of your linked accounts to your investment account.
              </Alert>

              <FormControl isRequired>
                <FormLabel>Select Account to Transfer From</FormLabel>
                <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                  {allAccounts
                    .filter(acc => acc.account_type !== 'investment' && acc.id !== investmentAccount?.id)
                    .map((account) => {
                      const accountBalance = parseFloat(account.balance) || 0;
                      const isSelected = selectedSourceAccount?.id === account.id;
                      return (
                        <Card
                          key={account.id}
                          bg={isSelected ? 'purple.50' : 'gray.50'}
                          border={isSelected ? '2px solid' : '1px solid'}
                          borderColor={isSelected ? 'purple.500' : 'gray.200'}
                          cursor="pointer"
                          onClick={() => setSelectedSourceAccount(account)}
                          _hover={{ bg: isSelected ? 'purple.50' : 'gray.100' }}
                        >
                          <CardBody py={3}>
                            <HStack justify="space-between" align="center">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                                  {account.account_name}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {account.account_number} • {account.account_type}
                                </Text>
                              </VStack>
                              <VStack align="end" spacing={0}>
                                <Text fontSize="lg" fontWeight="bold" color="gray.800">
                                  {formatCurrency(accountBalance)}
                                </Text>
                                {isSelected && (
                                  <Badge colorScheme="purple" fontSize="xs">
                                    Selected
                                  </Badge>
                                )}
                              </VStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      );
                    })}
                </VStack>
                {allAccounts.filter(acc => acc.account_type !== 'investment' && acc.id !== investmentAccount?.id).length === 0 && (
                  <Alert status="warning" size="sm">
                    <AlertIcon />
                    No accounts available to transfer from. Please link an account first.
                  </Alert>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Amount to Transfer</FormLabel>
                <NumberInput
                  value={fundAmount}
                  onChange={(_, value) => {
                    const numValue = isNaN(value) || value <= 0 ? '' : value;
                    setFundAmount(numValue);
                  }}
                  min={0.01}
                  precision={2}
                >
                  <NumberInputField placeholder="0.00" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                {selectedSourceAccount && (
                  <FormHelperText>
                    Available: {formatCurrency(parseFloat(selectedSourceAccount.balance) || 0)}
                  </FormHelperText>
                )}
              </FormControl>

              {selectedSourceAccount && fundAmount && parseFloat(fundAmount) > parseFloat(selectedSourceAccount.balance || 0) && (
                <Alert status="warning" size="sm">
                  <AlertIcon />
                  Amount exceeds available balance
                </Alert>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => {
              onFundModalClose();
              setSelectedSourceAccount(null);
              setFundAmount('');
            }}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleFundAccount}
              isLoading={funding}
              isDisabled={
                !selectedSourceAccount ||
                !fundAmount ||
                parseFloat(fundAmount) <= 0 ||
                (selectedSourceAccount && parseFloat(fundAmount) > parseFloat(selectedSourceAccount.balance || 0))
              }
            >
              Transfer Funds
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Setup Investment Account Modal */}
      <Modal isOpen={isSetupModalOpen} onClose={onSetupModalClose} size={modalSize} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Set Up Investment Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                You need an investment account to start trading stocks. We'll create one for you!
              </Alert>

              {primaryAccount && (
                <Card bg="gray.50">
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" color="gray.600">Available Balance</Text>
                      <Text fontSize="2xl" fontWeight="bold">
                        {formatCurrency(parseFloat(primaryAccount.balance) || 0)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {primaryAccount.account_name}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              <Text fontSize="sm" color="gray.600">
                An investment account will be created for you. You can transfer funds from your primary account to start investing.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onSetupModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateInvestmentAccount}
              isLoading={funding}
            >
              Create Investment Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
    </Box>
  );
}

