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
  useToast,
  useDisclosure,
  IconButton,
  useBreakpointValue,
  Heading,
  Badge,
  Divider,
  SimpleGrid,
  Progress,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  Gift,
  TrendingUp,
  CreditCard,
  Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function RewardsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardRewards, setCardRewards] = useState([]);
  const [rewardTransactions, setRewardTransactions] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();

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

      // Load cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (cardsData) setCards(cardsData);

      // Load card rewards
      const { data: rewardsData } = await supabase
        .from('card_rewards')
        .select('*, cards(*)')
        .eq('user_id', authUser.id)
        .order('updated_at', { ascending: false });

      if (rewardsData) {
        setCardRewards(rewardsData);
        
        // Load reward transactions for all rewards
        const rewardIds = rewardsData.map(r => r.id);
        if (rewardIds.length > 0) {
          const { data: transactionsData } = await supabase
            .from('reward_transactions')
            .select('*, card_rewards(*)')
            .in('reward_id', rewardIds)
            .order('created_at', { ascending: false })
            .limit(50);

          if (transactionsData) setRewardTransactions(transactionsData);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rewards data',
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

  const getRewardTypeLabel = (type) => {
    switch (type) {
      case 'points':
        return 'Points';
      case 'cashback':
        return 'Cashback';
      case 'miles':
        return 'Miles';
      default:
        return type;
    }
  };

  const totalRewards = cardRewards.reduce((sum, reward) => sum + parseFloat(reward.current_balance || 0), 0);
  const totalLifetime = cardRewards.reduce((sum, reward) => sum + parseFloat(reward.lifetime_earned || 0), 0);

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
          <Heading size="md">Rewards & Cashback</Heading>
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
        {/* Total Rewards Summary */}
        <Card mb={6} bgGradient="linear(to-br, purple.400, pink.400)" color="white">
          <CardBody>
            <VStack spacing={4}>
              <Text fontSize="sm" opacity={0.9}>Total Available Rewards</Text>
              <Text fontSize="4xl" fontWeight="bold">
                {formatCurrency(totalRewards)}
              </Text>
              <Text fontSize="sm" opacity={0.8}>
                Lifetime Earned: {formatCurrency(totalLifetime)}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Card Rewards */}
        <Card mb={6}>
          <CardBody>
            <Heading size="sm" mb={4}>Card Rewards</Heading>
            {cardRewards.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Gift size={48} color="gray" />
                <Text color="gray.500">No rewards yet</Text>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Start using your cards to earn rewards!
                </Text>
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                {cardRewards.map((reward) => (
                  <Card key={reward.id} variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={4}>
                        <Flex justify="space-between" align="start">
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <CreditCard size={20} />
                              <Text fontWeight="bold">
                                {reward.cards?.card_holder_name || 'Card'} •••• {reward.cards?.card_number?.slice(-4) || '****'}
                              </Text>
                            </HStack>
                            <Badge colorScheme="purple" fontSize="xs">
                              {getRewardTypeLabel(reward.reward_type)}
                            </Badge>
                            {reward.redemption_rate && (
                              <Text fontSize="xs" color="gray.600">
                                Rate: {(reward.redemption_rate * 100).toFixed(2)}%
                              </Text>
                            )}
                          </VStack>
                          <VStack align="end" spacing={1}>
                            <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                              {reward.reward_type === 'points' || reward.reward_type === 'miles'
                                ? Math.floor(reward.current_balance).toLocaleString()
                                : formatCurrency(reward.current_balance)}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              Available
                            </Text>
                          </VStack>
                        </Flex>
                        <Divider />
                        <VStack align="stretch" spacing={2}>
                          <Flex justify="space-between" fontSize="sm">
                            <Text color="gray.600">Lifetime Earned</Text>
                            <Text fontWeight="semibold">
                              {reward.reward_type === 'points' || reward.reward_type === 'miles'
                                ? Math.floor(reward.lifetime_earned).toLocaleString()
                                : formatCurrency(reward.lifetime_earned)}
                            </Text>
                          </Flex>
                          <Button size="sm" colorScheme="purple" variant="outline" w="full">
                            Redeem Rewards
                          </Button>
                        </VStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Recent Reward Activity */}
        {rewardTransactions.length > 0 && (
          <Card>
            <CardBody>
              <Heading size="sm" mb={4}>Recent Activity</Heading>
              <VStack spacing={2} align="stretch">
                {rewardTransactions.slice(0, 10).map((transaction) => (
                  <Flex
                    key={transaction.id}
                    justify="space-between"
                    align="center"
                    p={2}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {transaction.transaction_type === 'earned' ? 'Earned' :
                         transaction.transaction_type === 'redeemed' ? 'Redeemed' :
                         transaction.transaction_type === 'expired' ? 'Expired' : 'Adjusted'}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {transaction.description || 'Reward transaction'}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatDate(transaction.created_at)}
                      </Text>
                    </VStack>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={
                        transaction.transaction_type === 'earned' ? 'green.500' :
                        transaction.transaction_type === 'redeemed' ? 'blue.500' :
                        transaction.transaction_type === 'expired' ? 'red.500' : 'gray.500'
                      }
                    >
                      {transaction.transaction_type === 'earned' ? '+' : '-'}
                      {transaction.reward_type === 'points' || transaction.reward_type === 'miles'
                        ? Math.abs(transaction.amount).toLocaleString()
                        : formatCurrency(Math.abs(transaction.amount))}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

