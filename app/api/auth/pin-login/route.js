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

    // Create a session directly using admin API
    // Use generateLink to create a recovery link, then extract token and verify it server-side
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Link generation error:', linkError);
      return NextResponse.json(
        { error: linkError?.message || 'Failed to create authentication link.' },
        { status: 500 }
      );
    }

    const actionLink = linkData.properties.action_link;
    
    // Extract token from the action link
    // Format: https://[project].supabase.co/auth/v1/verify?token=...&type=magiclink
    let token = null;
    try {
      const url = new URL(actionLink);
      token = url.searchParams.get('token') || url.searchParams.get('token_hash');
    } catch (e) {
      console.error('Failed to parse action link:', e);
    }

    if (!token) {
      // If we can't extract token, we need to use the action link directly
      // But let's try to verify the link's token by making a request to it
      // Actually, better approach: use the admin API to create a session cookie
      // For now, fallback to client-side handling
      return NextResponse.json({
        success: true,
        action_link: actionLink,
        needs_client_verification: true,
      });
    }

    // Create a regular Supabase client to verify the token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the token server-side to get a session
    const { data: otpData, error: otpError } = await supabaseClient.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    });

    if (otpError || !otpData?.session) {
      console.error('Token verification error:', otpError);
      // Fallback: return action link for client-side handling
      return NextResponse.json({
        success: true,
        action_link: actionLink,
        needs_client_verification: true,
      });
    }

    // Success! Return the session directly - no redirects needed!
    return NextResponse.json({
      success: true,
      session: {
        access_token: otpData.session.access_token,
        refresh_token: otpData.session.refresh_token,
        expires_at: otpData.session.expires_at,
        expires_in: otpData.session.expires_in,
        token_type: otpData.session.token_type,
      },
    });
  } catch (error) {
    console.error('PIN login API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
