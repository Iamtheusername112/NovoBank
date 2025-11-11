import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL_WHITELIST = process.env.ADMIN_EMAIL_WHITELIST
  ? process.env.ADMIN_EMAIL_WHITELIST.split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];

async function authenticate(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const accessToken = authHeader.slice(7);
  const supabaseAuth = createClient(
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

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (
    ADMIN_EMAIL_WHITELIST.length > 0 &&
    !ADMIN_EMAIL_WHITELIST.includes(user.email.toLowerCase())
  ) {
    return { error: 'Forbidden', status: 403 };
  }

  return { user };
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  try {
    const body = await request.json();
    const {
      user_id,
      account_name,
      account_number,
      account_type,
      currency,
      initial_balance,
      initial_balance_posted_at,
      is_primary,
      bank_name,
      bank_logo,
    } = body;

    if (!user_id || !account_name || !account_type || !currency) {
      return NextResponse.json(
        { error: 'user_id, account_name, account_type, and currency are required.' },
        { status: 400 }
      );
    }

    const initialBalance = parseFloat(initial_balance ?? 0);
    if (Number.isNaN(initialBalance) || initialBalance < 0) {
      return NextResponse.json(
        { error: 'Initial balance must be zero or a positive amount.' },
        { status: 400 }
      );
    }

    const accountNumber = account_number?.trim() || `ACCT-${Date.now()}`;
    const isPrimary = Boolean(is_primary);

    if (isPrimary) {
      await supabaseAdmin
        .from('accounts')
        .update({ is_primary: false })
        .eq('user_id', user_id);
    }

    const insertPayload = {
      user_id,
      account_name: account_name.trim(),
      account_number: accountNumber,
      account_type,
      currency,
      balance: initialBalance,
      is_primary: isPrimary,
      bank_name: bank_name || null,
      bank_logo: bank_logo || null,
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('accounts')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const initialPostedAt = initial_balance_posted_at
      ? new Date(initial_balance_posted_at)
      : new Date();

    if (initial_balance_posted_at && Number.isNaN(initialPostedAt.getTime())) {
      return NextResponse.json(
        { error: 'initial_balance_posted_at must be a valid ISO date string.' },
        { status: 400 }
      );
    }

    if (initialBalance > 0) {
      await supabaseAdmin.from('transactions').insert({
        user_id,
        amount: initialBalance,
        transaction_type: 'deposit',
        status: 'completed',
        description: `Initial balance (${insertPayload.account_name})`,
        recipient_name: insertPayload.account_name,
        created_at: initialPostedAt.toISOString(),
      });
    }

    return NextResponse.json({ account: inserted }, { status: 201 });
  } catch (error) {
    console.error('Admin create account error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}

