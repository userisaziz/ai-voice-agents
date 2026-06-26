import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the Deepgram API key for authenticated clients.
 * 
 * Security:
 * - Requires a valid Supabase session (authenticated user)
 * - Returns the key as text/plain with strict cache-control headers
 * - The API key is never exposed to unauthenticated requests
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.error('[deepgram-token] DEEPGRAM_API_KEY not configured');
    return new NextResponse('DEEPGRAM_API_KEY not configured in .env', { status: 500 });
  }

  return new NextResponse(apiKey, {
    status: 200,
    headers: { 
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    },
  });
}
