import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This callback route handles magic link authentication automatically
// It verifies the token and redirects to the dashboard seamlessly

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'magiclink';
  const redirectTo = searchParams.get('redirect') || '/wallet';

  // Get the base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (request.headers.get('host') ? `http${request.headers.get('x-forwarded-proto') === 'https' ? 's' : ''}://${request.headers.get('host')}` : 'http://localhost:3000');

  if (!tokenHash && !token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl));
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Verify the token
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash || token,
    type: type,
  });

  if (error || !data.session) {
    console.error('Token verification error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || 'authentication_failed')}`, baseUrl));
  }

  // Redirect to the specified page
  return NextResponse.redirect(new URL(redirectTo, baseUrl));
}

