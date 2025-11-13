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

  const adminUser = auth.user;

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
      account_id,
      amount: normalizedType === 'withdrawal' ? -numericAmount : numericAmount,
      transaction_type: normalizedType,
      status: 'completed',
      review_status: 'approved',
      requires_manual_review: false,
      reviewed_by: adminUser.id,
      reviewed_at: postedAt.toISOString(),
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

export async function PATCH(request) {
  const auth = await authenticate(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminUser = auth.user;

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
    const { transaction_id, action, review_notes } = body;

    if (!transaction_id || !action) {
      return NextResponse.json(
        { error: 'transaction_id and action are required.' },
        { status: 400 }
      );
    }

    const normalizedAction = action.toLowerCase();
    if (!['approve', 'reject', 'block'].includes(normalizedAction)) {
      return NextResponse.json(
        { error: 'action must be one of approve, reject, or block.' },
        { status: 400 }
      );
    }

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .select(
        `*,
        account:account_id (
          id,
          user_id,
          balance,
          account_name
        )
      `
      )
      .eq('id', transaction_id)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found.' },
        { status: 404 }
      );
    }

    if (transaction.review_status !== 'pending') {
      return NextResponse.json(
        { error: 'Transaction has already been reviewed.' },
        { status: 400 }
      );
    }

    const accountBalance = parseFloat(transaction.account?.balance || 0);
    const amountValue = parseFloat(transaction.amount || 0);
    const nowIso = new Date().toISOString();

    if (normalizedAction === 'approve') {
      if (!transaction.account) {
        return NextResponse.json(
          { error: 'Transaction is missing an associated account for settlement.' },
          { status: 400 }
        );
      }

      const newBalance = accountBalance + amountValue;
      if (newBalance < 0) {
        return NextResponse.json(
          { error: 'Approval would overdraw the account. Reject instead.' },
          { status: 400 }
        );
      }

      const { error: accountUpdateError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', transaction.account.id);

      if (accountUpdateError) {
        throw accountUpdateError;
      }

      const { error: transactionUpdateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'completed',
          review_status: 'approved',
          review_notes,
          reviewed_by: adminUser.id,
          reviewed_at: nowIso,
          requires_manual_review: false,
        })
        .eq('id', transaction_id);

      if (transactionUpdateError) {
        throw transactionUpdateError;
      }

      return NextResponse.json({ status: 'approved' }, { status: 200 });
    }

    if (normalizedAction === 'reject') {
      const { error: transactionUpdateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'failed',
          review_status: 'rejected',
          review_notes: review_notes || 'Transaction rejected by administrator.',
          reviewed_by: adminUser.id,
          reviewed_at: nowIso,
          requires_manual_review: false,
        })
        .eq('id', transaction_id);

      if (transactionUpdateError) {
        throw transactionUpdateError;
      }

      return NextResponse.json({ status: 'rejected' }, { status: 200 });
    }

    // block action
    const blockReason =
      review_notes ||
      'Suspicious activity detected. Please contact support to regain access to your account.';

    const { error: blockTransactionError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'cancelled',
        review_status: 'blocked',
        review_notes: blockReason,
        reviewed_by: adminUser.id,
        reviewed_at: nowIso,
        requires_manual_review: false,
      })
      .eq('id', transaction_id);

    if (blockTransactionError) {
      throw blockTransactionError;
    }

    const { error: accountStatusError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        account_status: 'blocked',
        account_status_reason: blockReason,
        account_status_updated_at: nowIso,
      })
      .eq('id', transaction.user_id);

    if (accountStatusError) {
      throw accountStatusError;
    }

    return NextResponse.json({ status: 'blocked' }, { status: 200 });
  } catch (error) {
    console.error('Admin transaction review error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction review status. Please try again.' },
      { status: 500 }
    );
  }
}

