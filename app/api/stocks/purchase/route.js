import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
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
    const { symbol, name, shares, price, accountId } = await request.json();

    if (!symbol || !name || !shares || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, name, shares, price' },
        { status: 400 }
      );
    }

    // Get account - prefer investment account, fallback to primary account
    let account = null;
    
    if (accountId) {
      // Use specified account
      const { data: specifiedAccount, error: specifiedError } = await supabaseAdmin
        .from('accounts')
        .select('balance, id, account_type')
        .eq('id', accountId)
        .eq('user_id', userData.user.id)
        .single();
      
      if (!specifiedError && specifiedAccount) {
        account = specifiedAccount;
      }
    }
    
    // If no account specified or not found, try investment account first
    if (!account) {
      const { data: invAccount, error: invError } = await supabaseAdmin
        .from('accounts')
        .select('balance, id, account_type')
        .eq('user_id', userData.user.id)
        .eq('account_type', 'investment')
        .single();
      
      if (!invError && invAccount) {
        account = invAccount;
      }
    }
    
    // Fallback to primary account
    if (!account) {
      const { data: primAccount, error: primError } = await supabaseAdmin
        .from('accounts')
        .select('balance, id, account_type')
        .eq('user_id', userData.user.id)
        .eq('is_primary', true)
        .single();
      
      if (!primError && primAccount) {
        account = primAccount;
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: 'No account found. Please set up an investment account first.' },
        { status: 404 }
      );
    }

    const totalCost = parseFloat(price) * parseFloat(shares);
    const currentBalance = parseFloat(account.balance) || 0;

    if (totalCost > currentBalance) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      );
    }

    // Check if user already owns this stock
    const { data: existingInvestment, error: existingError } = await supabaseAdmin
      .from('investments')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('symbol', symbol)
      .eq('investment_type', 'stocks')
      .single();

    let investmentId;
    let newSharesOwned;
    let newPurchasePrice;

    if (existingInvestment && !existingError) {
      // Update existing investment
      const currentShares = parseFloat(existingInvestment.shares_owned) || 0;
      const currentPurchasePrice = parseFloat(existingInvestment.purchase_price) || 0;
      const currentTotalCost = currentShares * currentPurchasePrice;
      const newTotalCost = currentTotalCost + totalCost;
      newSharesOwned = currentShares + parseFloat(shares);
      newPurchasePrice = newTotalCost / newSharesOwned; // Weighted average

      const { error: updateError } = await supabaseAdmin
        .from('investments')
        .update({
          shares_owned: newSharesOwned,
          purchase_price: newPurchasePrice,
          current_price: parseFloat(price),
          total_value: newSharesOwned * parseFloat(price),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInvestment.id);

      if (updateError) throw updateError;
      investmentId = existingInvestment.id;
    } else {
      // Create new investment
      const { data: newInvestment, error: insertError } = await supabaseAdmin
        .from('investments')
        .insert([
          {
            user_id: userData.user.id,
            investment_type: 'stocks',
            symbol: symbol,
            name: name,
            shares_owned: parseFloat(shares),
            purchase_price: parseFloat(price),
            current_price: parseFloat(price),
            total_value: parseFloat(price) * parseFloat(shares),
            profit_loss: 0,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      investmentId = newInvestment.id;
      newSharesOwned = parseFloat(shares);
      newPurchasePrice = parseFloat(price);
    }

    // Deduct from account balance
    const newBalance = currentBalance - totalCost;
    const { error: balanceError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (balanceError) throw balanceError;

    // Verify the balance was updated correctly
    const { data: updatedAccount, error: verifyError } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', account.id)
      .single();

    let verifiedBalance = newBalance;
    if (verifyError) {
      console.error('Error verifying balance update:', verifyError);
    } else {
      // Use the verified balance
      verifiedBalance = parseFloat(updatedAccount.balance) || 0;
      console.log(`Balance updated: ${currentBalance} -> ${verifiedBalance} (expected: ${newBalance})`);
    }

    // Create transaction record
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([
        {
          user_id: userData.user.id,
          amount: totalCost,
          transaction_type: 'withdrawal',
          category: 'Investment',
          description: `Purchased ${shares} share(s) of ${symbol} @ ${price}`,
          status: 'completed',
        },
      ]);

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      // Don't fail the purchase if transaction creation fails
    }

    return NextResponse.json({
      success: true,
      investmentId,
      newBalance: verifiedBalance,
      accountId: account.id,
      accountType: account.account_type,
      message: `Successfully purchased ${shares} share(s) of ${symbol}`,
    });
  } catch (error) {
    console.error('Error purchasing stock:', error);
    return NextResponse.json(
      { error: 'Failed to purchase stock. Please try again.' },
      { status: 500 }
    );
  }
}

