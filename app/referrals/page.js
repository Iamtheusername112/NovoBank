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
  useToast,
  useDisclosure,
  IconButton,
  useBreakpointValue,
  Heading,
  Badge,
  Divider,
  SimpleGrid,
  Alert,
  AlertIcon,
  useClipboard,
} from '@chakra-ui/react';
import {
  ArrowRight,
  MessageCircle,
  UserPlus,
  Copy,
  CheckCircle,
  Gift,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationBell from '@/components/NotificationBell';
import ContactUsModal from '@/components/ContactUsModal';

export default function ReferralsPage() {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const { isOpen: isContactOpen, onOpen: onContactOpen, onClose: onContactClose } = useDisclosure();
  const { onCopy, hasCopied } = useClipboard(referralCode);

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

      // Generate or get referral code
      const code = `NOVA${authUser.id.slice(0, 8).toUpperCase()}`;
      setReferralCode(code);

      // Load referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*, referred_user:user_profiles!referrals_referred_user_id_fkey(*)')
        .eq('referrer_id', authUser.id)
        .order('created_at', { ascending: false });

      if (referralsData) setReferrals(referralsData);

      // Create referral code if doesn't exist
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', authUser.id)
        .limit(1)
        .single();

      if (!existingReferral) {
        await supabase
          .from('referrals')
          .insert({
            referrer_id: authUser.id,
            referral_code: code,
            status: 'pending',
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          });
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral data',
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

  const handleShare = () => {
    const shareText = `Join NovaBank and get $50! Use my referral code: ${referralCode}`;
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;

    if (navigator.share) {
      navigator.share({
        title: 'Join NovaBank',
        text: shareText,
        url: shareUrl,
      });
    } else {
      onCopy();
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard',
        status: 'success',
      });
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

  const totalRewards = referrals
    .filter(r => r.status === 'rewarded' || r.status === 'completed')
    .reduce((sum, r) => sum + parseFloat(r.reward_amount || 0), 0);

  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;

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
          <Heading size="md">Referral Program</Heading>
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
        {/* Summary Card */}
        <Card mb={6} bgGradient="linear(to-br, purple.400, pink.400)" color="white">
          <CardBody>
            <SimpleGrid columns={2} spacing={4}>
              <VStack spacing={1}>
                <Text fontSize="sm" opacity={0.9}>Total Rewards</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatCurrency(totalRewards)}
                </Text>
              </VStack>
              <VStack spacing={1}>
                <Text fontSize="sm" opacity={0.9}>Referrals</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {completedReferrals}
                </Text>
              </VStack>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Referral Code Card */}
        <Card mb={6}>
          <CardBody>
            <VStack spacing={4}>
              <VStack spacing={2}>
                <Text fontWeight="semibold">Your Referral Code</Text>
                <HStack spacing={2}>
                  <Input
                    value={referralCode}
                    readOnly
                    fontSize="lg"
                    fontWeight="bold"
                    textAlign="center"
                    letterSpacing="wide"
                    bg="purple.50"
                    borderColor="purple.200"
                  />
                  <IconButton
                    icon={hasCopied ? <CheckCircle size={20} /> : <Copy size={20} />}
                    onClick={onCopy}
                    colorScheme="purple"
                    aria-label="Copy code"
                  />
                </HStack>
              </VStack>
              <Button
                leftIcon={<UserPlus size={18} />}
                colorScheme="purple"
                size="lg"
                w="full"
                onClick={handleShare}
              >
                Share Referral Link
              </Button>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Earn $50 per referral!
                  </Text>
                  <Text fontSize="xs">
                    When someone signs up using your code and opens an account, you both get $50.
                  </Text>
                </VStack>
              </Alert>
            </VStack>
          </CardBody>
        </Card>

        {/* Referrals List */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>Your Referrals</Heading>
            {referrals.length === 0 ? (
              <VStack py={8} spacing={2}>
                <UserPlus size={48} color="gray" />
                <Text color="gray.500">No referrals yet</Text>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Share your referral code to start earning rewards!
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {referrals.map((referral) => (
                  <Card key={referral.id} variant="outline">
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontWeight="semibold">
                              {referral.referred_user?.first_name || referral.referred_email || 'Pending'}
                            </Text>
                            <Badge
                              colorScheme={
                                referral.status === 'completed' || referral.status === 'rewarded' ? 'green' :
                                referral.status === 'pending' ? 'yellow' :
                                referral.status === 'expired' ? 'gray' : 'blue'
                              }
                              fontSize="xs"
                            >
                              {referral.status}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {formatDate(referral.created_at)}
                          </Text>
                          {referral.reward_amount > 0 && (
                            <Text fontSize="sm" color="green.600" fontWeight="semibold">
                              Reward: {formatCurrency(referral.reward_amount)}
                            </Text>
                          )}
                        </VStack>
                        {referral.status === 'completed' || referral.status === 'rewarded' ? (
                          <Gift size={24} color="var(--chakra-colors-green-500)" />
                        ) : (
                          <Clock size={24} color="var(--chakra-colors-gray-400)" />
                        )}
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </Box>

      <ContactUsModal isOpen={isContactOpen} onClose={onContactClose} />
      <BottomNavigation unreadCount={unreadNotificationCount + unreadAlertCount} />
    </Box>
  );
}

