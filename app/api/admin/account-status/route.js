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

const VALID_STATUSES = new Set(['active', 'restricted', 'blocked']);

export async function PATCH(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Server configuration error.' },
      { status: 500 }
    );
  }

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
    const { user_id, account_status, reason } = body;

    if (!user_id || !account_status) {
      return NextResponse.json(
        { error: 'user_id and account_status are required.' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.has(account_status)) {
      return NextResponse.json(
        { error: 'account_status must be one of active, restricted, or blocked.' },
        { status: 400 }
      );
    }

    const updatePayload = {
      account_status,
      account_status_updated_at: new Date().toISOString(),
      account_status_reason:
        account_status === 'active' ? null : reason?.trim() || null,
    };

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', user_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Admin account status error:', error);
    return NextResponse.json(
      { error: 'Failed to update account status. Please try again.' },
      { status: 500 }
    );
  }
}

