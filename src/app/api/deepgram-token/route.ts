import { NextRequest, NextResponse } from 'next/server';

/**
 * Generates a short-lived Deepgram token for browser-based WebSocket connections.
 * The browser SDK uses this token instead of the raw API key (never expose API keys to clients).
 * Token is passed via the Sec-WebSocket-Protocol header (the only header browsers allow on WS handshakes).
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      return new NextResponse('DEEPGRAM_API_KEY not configured', { status: 500 });
    }

    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: 300 }), // 5-minute token
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[deepgram-token] Deepgram error:', response.status, errText);
      return new NextResponse(`Deepgram auth failed: ${response.status}`, { status: 500 });
    }

    const { access_token } = await response.json();

    return new NextResponse(access_token, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err) {
    console.error('[deepgram-token] error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
