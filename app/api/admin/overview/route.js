import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL_WHITELIST = process.env.ADMIN_EMAIL_WHITELIST
  ? process.env.ADMIN_EMAIL_WHITELIST.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
  : [];

export async function GET(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return NextResponse.json(
      { error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = authHeader.slice(7);

  const supabaseAuthed = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: userData, error: userError } = await supabaseAuthed.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (
    ADMIN_EMAIL_WHITELIST.length > 0 &&
    !ADMIN_EMAIL_WHITELIST.includes(userData.user.email.toLowerCase())
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Aggregate counts
    const [{ count: totalUsers, error: usersCountError }] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }),
    ]);

    if (usersCountError) {
      throw usersCountError;
    }

    const { count: newUsers24h, error: newUsersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24Hours.toISOString());

    if (newUsersError) {
      throw newUsersError;
    }

    const [
      usersResult,
      accountsStatsResult,
      topAccountsResult,
      transactionsResult,
      todayTransactionsResult,
      blockedAccountsResult,
      contactSubmissionsResult,
      adminNotificationsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(25),
      supabaseAdmin.from('accounts').select('user_id, balance'),
      supabaseAdmin
        .from('accounts')
        .select('id, user_id, account_name, account_type, balance, currency, bank_name, bank_logo, created_at')
        .order('balance', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('transactions')
        .select('id, user_id, account_id, amount, transaction_type, status, review_status, review_notes, requires_manual_review, description, recipient_name, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('transactions')
        .select('amount, status')
        .gte('created_at', startOfToday.toISOString()),
      supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, email, account_status, account_status_reason, account_status_updated_at')
        .eq('account_status', 'blocked'),
      supabaseAdmin
        .from('contact_submissions')
        .select('id, name, email, message, status, admin_response, responded_by, responded_at, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('admin_notifications')
        .select('id, notification_type, reference_id, title, message, is_read, created_at')
        .order('created_at', { ascending: false }),
    ]);

    // Handle potential errors
    if (usersResult.error) throw usersResult.error;
    if (accountsStatsResult.error) throw accountsStatsResult.error;
    if (topAccountsResult.error) throw topAccountsResult.error;
    if (transactionsResult.error) throw transactionsResult.error;
    if (todayTransactionsResult.error) throw todayTransactionsResult.error;
    if (blockedAccountsResult.error) throw blockedAccountsResult.error;
    if (contactSubmissionsResult.error) throw contactSubmissionsResult.error;
    if (adminNotificationsResult.error) throw adminNotificationsResult.error;

    const accountsStats = accountsStatsResult.data || [];
    const usersData = [...(usersResult.data || [])];
    const transactionsData = transactionsResult.data || [];
    const topAccountsData = topAccountsResult.data || [];
    const todayTransactions = todayTransactionsResult.data || [];
    const blockedAccounts = blockedAccountsResult.data || [];
    const contactSubmissions = contactSubmissionsResult.data || [];
    const adminNotifications = adminNotificationsResult.data || [];

    const accountAggregation = accountsStats.reduce((acc, account) => {
      const userId = account.user_id;
      const balance = parseFloat(account.balance || 0);
      if (!acc[userId]) {
        acc[userId] = { count: 0, balance: 0 };
      }
      acc[userId].count += 1;
      acc[userId].balance += balance;
      return acc;
    }, {});

    const lookupIds = new Set();
    accountsStats.forEach((account) => lookupIds.add(account.user_id));
    transactionsData.forEach((tx) => lookupIds.add(tx.user_id));
    topAccountsData.forEach((account) => lookupIds.add(account.user_id));
    usersData.forEach((profile) => lookupIds.add(profile.id));

    const missingIds = Array.from(lookupIds).filter(
      (id) => !usersData.some((profile) => profile.id === id)
    );

    if (missingIds.length > 0) {
      const { data: extraProfiles, error: extraProfilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', missingIds);

      if (extraProfilesError) throw extraProfilesError;
      if (extraProfiles) {
        extraProfiles.forEach((profile) => {
          if (!usersData.some((existing) => existing.id === profile.id)) {
            usersData.push(profile);
          }
        });
      }
    }

    const profileMap = usersData.reduce((acc, profile) => {
      const fullName = `${profile.first_name} ${profile.last_name}`;
      acc[profile.id] = { ...profile, fullName };
      return acc;
    }, {});

    const mappedUsers = usersData.map((profile) => {
      const stats = accountAggregation[profile.id] || { count: 0, balance: 0 };
      return {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        created_at: profile.created_at,
        accounts_count: stats.count,
        total_balance: stats.balance,
      };
    });

    const totalAccounts = accountsStats.length;
    const totalBalance = accountsStats.reduce(
      (sum, item) => sum + parseFloat(item.balance || 0),
      0
    );

    const mappedTransactions = transactionsData.map((tx) => {
      const owner = profileMap[tx.user_id];
      return {
        id: tx.id,
        account_id: tx.account_id,
        amount: parseFloat(tx.amount || 0),
        transaction_type: tx.transaction_type,
        status: tx.status,
        review_status: tx.review_status,
        review_notes: tx.review_notes,
        requires_manual_review: tx.requires_manual_review,
        description: tx.description,
        recipient_name: tx.recipient_name,
        created_at: tx.created_at,
        user_id: tx.user_id,
        customer: owner ? owner.fullName : 'Unknown',
        customer_email: owner ? owner.email : undefined,
      };
    });

    const flaggedTransactions = mappedTransactions.filter(
      (tx) => tx.review_status === 'pending' || Math.abs(tx.amount) >= 5000
    );

    const todaysVolume = todayTransactions.reduce((sum, tx) => {
      if (tx.status === 'failed') return sum;
      return sum + Math.abs(parseFloat(tx.amount || 0));
    }, 0);

    const mappedAccounts = topAccountsData.map((account) => {
      const owner = profileMap[account.user_id];
      return {
        ...account,
        owner_name: owner ? owner.fullName : 'Unknown',
        owner_email: owner ? owner.email : undefined,
      };
    });

    const unreadContacts = contactSubmissions.filter((cs) => cs.status === 'unread').length;
    const unreadNotifications = adminNotifications.filter((n) => !n.is_read).length;

    const stats = {
      totalUsers: totalUsers || 0,
      newUsers24h: newUsers24h || 0,
      totalAccounts,
      totalBalance,
      todaysVolume,
      flaggedCount: flaggedTransactions.length,
      pendingTransactions: mappedTransactions.filter((tx) => tx.review_status === 'pending').length,
      blockedAccountsCount: blockedAccounts.length,
      unreadContacts,
      unreadNotifications,
    };

    return NextResponse.json({
      stats,
      users: mappedUsers,
      transactions: mappedTransactions,
      flaggedTransactions: flaggedTransactions.slice(0, 10),
      pendingReviews: mappedTransactions.filter((tx) => tx.review_status === 'pending'),
      accounts: mappedAccounts,
      blockedAccounts,
      contactSubmissions,
      adminNotifications,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json(
      { error: 'Failed to load admin data.' },
      { status: 500 }
    );
  }
}

