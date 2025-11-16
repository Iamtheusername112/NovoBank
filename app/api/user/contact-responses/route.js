import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
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
    // Get contact submissions for this user (by user_id or email)
    // First try by user_id
    let contactSubmissions = [];
    let error = null;

    // Try querying by user_id first
    const { data: byUserId, error: error1 } = await supabaseAdmin
      .from('contact_submissions')
      .select('id, name, email, message, admin_response, responded_at, created_at, status')
      .eq('user_id', userData.user.id)
      .not('admin_response', 'is', null)
      .order('responded_at', { ascending: false });

    if (!error1 && byUserId) {
      contactSubmissions = byUserId;
    }

    // Also try by email (in case user_id wasn't set)
    const { data: byEmail, error: error2 } = await supabaseAdmin
      .from('contact_submissions')
      .select('id, name, email, message, admin_response, responded_at, created_at, status')
      .eq('email', userData.user.email?.toLowerCase())
      .not('admin_response', 'is', null)
      .order('responded_at', { ascending: false });

    if (!error2 && byEmail) {
      // Merge results, avoiding duplicates
      const existingIds = new Set(contactSubmissions.map(c => c.id));
      const newSubmissions = byEmail.filter(c => !existingIds.has(c.id));
      contactSubmissions = [...contactSubmissions, ...newSubmissions];
    }

    // Sort by responded_at descending
    contactSubmissions.sort((a, b) => {
      const dateA = new Date(a.responded_at || a.created_at);
      const dateB = new Date(b.responded_at || b.created_at);
      return dateB - dateA;
    });

    if (error1 && error2) {
      throw error1 || error2;
    }

    return NextResponse.json({ success: true, data: contactSubmissions || [] });
  } catch (error) {
    console.error('Get contact responses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact responses.' },
      { status: 500 }
    );
  }
}

