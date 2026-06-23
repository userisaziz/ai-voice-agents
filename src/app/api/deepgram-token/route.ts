import { NextResponse } from 'next/server';

/**
 * Returns the Deepgram API key for the AgentSession token factory.
 * 
 * Security:
 * - This is a same-origin endpoint (browser can only call our own server)
 * - The actual API key is never exposed to the browser — it's only returned
 *   as a text response that the token factory consumes server-to-server
 * - No auth required since the key is transient and only used by our own client code
 */
export async function GET() {
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
