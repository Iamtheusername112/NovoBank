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
  Progress,
  SimpleGrid,
  Badge,
  Divider,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function CreditScorePage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [creditScores, setCreditScores] = useState([]);
  const [currentScore, setCurrentScore] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [loading, setLoading] = useState(false);

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

      // Load credit scores
      const { data: scoresData } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', authUser.id)
        .order('report_date', { ascending: false })
        .limit(12);

      if (scoresData && scoresData.length > 0) {
        setCreditScores(scoresData);
        setCurrentScore(scoresData[0]);
      } else {
        // Generate a mock score if none exists
        const mockScore = {
          score: 720,
          score_type: 'fico',
          factors: {
            payment_history: 95,
            credit_utilization: 30,
            credit_age: 7,
            credit_mix: 3,
            inquiries: 1,
          },
          report_date: new Date().toISOString().split('T')[0],
        };
        setCurrentScore(mockScore);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit score data',
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

  const handleRefreshScore = async () => {
    setLoading(true);
    try {
      // Simulate API call to refresh credit score
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Score Refreshed',
        description: 'Your credit score has been updated',
        status: 'success',
      });

      loadUserData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh score',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 750) return 'green';
    if (score >= 700) return 'blue';
    if (score >= 650) return 'yellow';
    if (score >= 600) return 'orange';
    return 'red';
  };

  const getScoreLabel = (score) => {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 600) return 'Poor';
    return 'Very Poor';
  };

  const getScoreProgress = (score) => {
    return ((score - 300) / (850 - 300)) * 100;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
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
          <Heading size="md">Credit Score</Heading>
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
        {currentScore ? (
          <>
            {/* Current Score Card */}
            <Card mb={6} bgGradient={`linear(to-br, ${getScoreColor(currentScore.score)}.400, ${getScoreColor(currentScore.score)}.600)`} color="white">
              <CardBody>
                <VStack spacing={4}>
                  <HStack justify="space-between" w="full">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" opacity={0.9}>
                        {currentScore.score_type?.toUpperCase() || 'FICO'} Score
                      </Text>
                      <Text fontSize="xs" opacity={0.8}>
                        Last updated: {formatDate(currentScore.report_date)}
                      </Text>
                    </VStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      colorScheme="whiteAlpha"
                      leftIcon={<RefreshCw size={16} />}
                      onClick={handleRefreshScore}
                      isLoading={loading}
                    >
                      Refresh
                    </Button>
                  </HStack>
                  
                  <VStack spacing={2}>
                    <Text fontSize="5xl" fontWeight="bold">
                      {currentScore.score}
                    </Text>
                    <Badge fontSize="md" px={3} py={1} borderRadius="full" bg="white" color={`${getScoreColor(currentScore.score)}.600`}>
                      {getScoreLabel(currentScore.score)}
                    </Badge>
                  </VStack>

                  <Box w="full">
                    <Progress
                      value={getScoreProgress(currentScore.score)}
                      colorScheme={getScoreColor(currentScore.score)}
                      size="lg"
                      borderRadius="full"
                      bg="whiteAlpha.300"
                    />
                    <HStack justify="space-between" mt={2} fontSize="xs" opacity={0.8}>
                      <Text>300</Text>
                      <Text>850</Text>
                    </HStack>
                  </Box>
                </VStack>
              </CardBody>
            </Card>

            {/* Credit Factors */}
            {currentScore.factors && (
              <Card mb={6}>
                <CardBody>
                  <Heading size="sm" mb={4}>Credit Factors</Heading>
                  <VStack spacing={4} align="stretch">
                    {[
                      { key: 'payment_history', label: 'Payment History', value: currentScore.factors.payment_history },
                      { key: 'credit_utilization', label: 'Credit Utilization', value: currentScore.factors.credit_utilization },
                      { key: 'credit_age', label: 'Credit Age', value: currentScore.factors.credit_age },
                      { key: 'credit_mix', label: 'Credit Mix', value: currentScore.factors.credit_mix },
                      { key: 'inquiries', label: 'Recent Inquiries', value: currentScore.factors.inquiries },
                    ].map((factor) => (
                      <Box key={factor.key}>
                        <Flex justify="space-between" mb={2}>
                          <Text fontSize="sm" fontWeight="semibold">
                            {factor.label}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {factor.value}%
                          </Text>
                        </Flex>
                        <Progress
                          value={factor.value}
                          colorScheme={factor.value >= 80 ? 'green' : factor.value >= 60 ? 'yellow' : 'red'}
                          size="sm"
                          borderRadius="full"
                        />
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Score History */}
            {creditScores.length > 1 && (
              <Card>
                <CardBody>
                  <Heading size="sm" mb={4}>Score History</Heading>
                  <VStack spacing={3} align="stretch">
                    {creditScores.slice(0, 6).map((score, index) => {
                      const previousScore = index < creditScores.length - 1 ? creditScores[index + 1].score : score.score;
                      const change = score.score - previousScore;
                      const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
                      
                      return (
                        <Flex
                          key={score.id}
                          justify="space-between"
                          align="center"
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                        >
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">
                              {formatDate(score.report_date)}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {score.score_type?.toUpperCase() || 'FICO'}
                            </Text>
                          </VStack>
                          <HStack spacing={3}>
                            <Text fontSize="lg" fontWeight="bold">
                              {score.score}
                            </Text>
                            {index > 0 && (
                              <HStack spacing={1} color={change > 0 ? 'green.500' : change < 0 ? 'red.500' : 'gray.500'}>
                                <ChangeIcon size={16} />
                                <Text fontSize="sm" fontWeight="semibold">
                                  {change > 0 ? '+' : ''}{change}
                                </Text>
                              </HStack>
                            )}
                          </HStack>
                        </Flex>
                      );
                    })}
                  </VStack>
                </CardBody>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardBody>
              <VStack py={8} spacing={4}>
                <Text color="gray.500">No credit score data available</Text>
                <Button colorScheme="purple" onClick={handleRefreshScore} isLoading={loading}>
                  Get Your Credit Score
                </Button>
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

