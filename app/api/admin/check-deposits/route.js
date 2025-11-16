import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL_WHITELIST = process.env.ADMIN_EMAIL_WHITELIST
  ? process.env.ADMIN_EMAIL_WHITELIST.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
  : [];

export async function PATCH(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

  try {
    const body = await request.json();
    const { deposit_id, action, rejection_reason } = body;

    if (!deposit_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: deposit_id and action' },
        { status: 400 }
      );
    }

    // Get the check deposit
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('check_deposits')
      .select('*')
      .eq('id', deposit_id)
      .single();

    if (depositError || !deposit) {
      return NextResponse.json(
        { error: 'Check deposit not found' },
        { status: 404 }
      );
    }

    let updateData = {};
    let accountUpdate = null;

    if (action === 'approve' || action === 'completed') {
      // Approve: Change status to processing or completed
      updateData = {
        status: 'processing',
        updated_at: new Date().toISOString(),
      };

      // If completing, also credit the account
      if (action === 'completed') {
        updateData.status = 'completed';
        
        // Get the account
        const { data: account, error: accountError } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', deposit.account_id)
          .single();

        if (accountError || !account) {
          return NextResponse.json(
            { error: 'Account not found' },
            { status: 404 }
          );
        }

        // Update account balance
        const newBalance = parseFloat(account.balance || 0) + parseFloat(deposit.amount);
        accountUpdate = {
          balance: newBalance,
          updated_at: new Date().toISOString(),
        };

        // Create a transaction record
        const { error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: deposit.user_id,
            account_id: deposit.account_id,
            amount: deposit.amount,
            transaction_type: 'deposit',
            description: `Check deposit - Check #${deposit.check_number || 'N/A'}`,
            status: 'completed',
            review_status: 'approved',
          });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          // Don't fail the whole operation, just log it
        }
      }
    } else if (action === 'reject') {
      // Reject: Change status to rejected
      updateData = {
        status: 'rejected',
        rejection_reason: rejection_reason || 'Rejected by administrator',
        updated_at: new Date().toISOString(),
      };
    } else if (action === 'processing') {
      // Mark as processing
      updateData = {
        status: 'processing',
        updated_at: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, completed, reject, or processing' },
        { status: 400 }
      );
    }

    // Update check deposit
    const { data: updatedDeposit, error: updateError } = await supabaseAdmin
      .from('check_deposits')
      .update(updateData)
      .eq('id', deposit_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update account balance if needed
    if (accountUpdate) {
      const { error: accountUpdateError } = await supabaseAdmin
        .from('accounts')
        .update(accountUpdate)
        .eq('id', deposit.account_id);

      if (accountUpdateError) {
        console.error('Error updating account balance:', accountUpdateError);
        // Return success for deposit update but note account update failed
        return NextResponse.json({
          success: true,
          data: updatedDeposit,
          warning: 'Deposit updated but account balance update failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedDeposit,
    });
  } catch (error) {
    console.error('Check deposit action error:', error);
    return NextResponse.json(
      { error: 'Failed to process check deposit action.' },
      { status: 500 }
    );
  }
}

