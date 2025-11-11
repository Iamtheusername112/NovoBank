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
    const { user_id, account_id, amount, type, description, posted_at } = body;

    if (!user_id || !account_id || !amount || !type) {
      return NextResponse.json(
        { error: 'user_id, account_id, amount, and type are required.' },
        { status: 400 }
      );
    }

    const normalizedType = type === 'withdrawal' ? 'withdrawal' : 'deposit';
    const numericAmount = parseFloat(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number.' },
        { status: 400 }
      );
    }

    const postedAt = posted_at ? new Date(posted_at) : new Date();
    if (Number.isNaN(postedAt.getTime())) {
      return NextResponse.json(
        { error: 'posted_at must be a valid ISO date string.' },
        { status: 400 }
      );
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const currentBalance = parseFloat(account.balance || 0);
    let newBalance = currentBalance;

    if (normalizedType === 'deposit') {
      newBalance += numericAmount;
    } else {
      newBalance -= numericAmount;
      if (newBalance < 0) {
        return NextResponse.json(
          { error: 'Insufficient balance for this withdrawal.' },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', account_id);

    if (updateError) {
      throw updateError;
    }

    const { error: insertError } = await supabaseAdmin.from('transactions').insert({
      user_id,
      amount: normalizedType === 'withdrawal' ? -numericAmount : numericAmount,
      transaction_type: normalizedType,
      status: 'completed',
      description:
        description ||
        `${normalizedType === 'deposit' ? 'Admin deposit' : 'Admin withdrawal'} (${
          account.account_name
        })`,
      recipient_name: account.account_name,
      created_at: postedAt.toISOString(),
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ newBalance }, { status: 200 });
  } catch (error) {
    console.error('Admin transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction. Please try again.' },
      { status: 500 }
    );
  }
}

