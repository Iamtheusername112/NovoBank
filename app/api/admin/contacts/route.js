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
    const { contact_id, status, admin_response } = body;

    if (!contact_id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
    }
    if (admin_response !== undefined) {
      updateData.admin_response = admin_response;
      if (admin_response && admin_response.trim()) {
        updateData.responded_by = userData.user.id;
        updateData.responded_at = new Date().toISOString();
        updateData.status = 'responded';
      }
    }

    const { data, error } = await supabaseAdmin
      .from('contact_submissions')
      .update(updateData)
      .eq('id', contact_id)
      .select()
      .single();

    if (error) throw error;

    // Mark related admin notification as read if status changed to read or responded
    if (status === 'read' || status === 'responded') {
      await supabaseAdmin
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('notification_type', 'contact_submission')
        .eq('reference_id', contact_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'Failed to update contact submission.' },
      { status: 500 }
    );
  }
}
