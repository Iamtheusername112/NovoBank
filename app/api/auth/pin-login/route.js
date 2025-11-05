import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route uses the service role to create a session after PIN verification
// IMPORTANT: This should only be called after PIN is verified on the client side

export async function POST(request) {
  try {
    const { email, pin } = await request.json();

    if (!email || !pin) {
      return NextResponse.json(
        { error: 'Email and PIN are required' },
        { status: 400 }
      );
    }

    // Check if service role key is set
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
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

    // Verify PIN using database function
    const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc(
      'verify_pin_for_login',
      {
        email_input: email.toLowerCase(),
        pin_input: pin,
      }
    );

    if (verifyError || !verifyData || verifyData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    const verificationResult = verifyData[0];

    if (!verificationResult.pin_set) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Get user from auth.users
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      verificationResult.user_id
    );

    if (userError || !authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create a magic link using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback?redirect=/wallet`,
      },
    });

    if (linkError || !linkData || !linkData.properties || !linkData.properties.action_link) {
      console.error('Link generation error:', linkError);
      return NextResponse.json(
        { error: linkError?.message || 'Failed to create authentication link.' },
        { status: 500 }
      );
    }

    const actionLink = linkData.properties.action_link;

    // Return the action link - the callback route will handle verification automatically
    // This makes it seamless: user enters PIN -> redirects to link -> callback verifies -> redirects to wallet
    return NextResponse.json({
      success: true,
      action_link: actionLink,
    });
  } catch (error) {
    console.error('PIN login API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
