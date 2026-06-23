import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { VapiProvider } from '@/lib/telephony/vapi';
import { parseCallStatus } from '@/lib/telephony/types';
import { updateCallLogByProviderId } from '@/services/call-logs';
import { updateLeadStatus } from '@/services/campaign-leads';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhook = VapiProvider.parseWebhook(body);
    const supabase = createAdminSupabase();

    console.log('[Vapi Webhook]', webhook.eventType, webhook.callId);

    // Handle call status updates
    if (webhook.callId) {
      const { data: existingLog } = await supabase
        .from('call_logs')
        .select('*')
        .eq('provider_call_id', webhook.callId)
        .single();

      if (existingLog) {
        const status = parseCallStatus(webhook.status || '');

        // Update call log
        await updateCallLogByProviderId(webhook.callId, {
          status,
          duration_seconds: webhook.duration,
          recording_url: webhook.recordingUrl,
        });

        // Update lead status if this is a campaign call
        if (existingLog.lead_id) {
          if (status === 'completed') {
            await updateLeadStatus(existingLog.lead_id, 'completed', existingLog.id);
          } else if (['failed', 'no-answer', 'busy'].includes(status)) {
            await updateLeadStatus(existingLog.lead_id, 'failed', existingLog.id);
          }
        }
      }
    }

    // Handle specific Vapi events
    switch (webhook.eventType) {
      case 'end-of-call-report':
        console.log('[Vapi] Call ended:', webhook.callId);
        break;
      case 'status-update':
        console.log('[Vapi] Status update:', webhook.status);
        break;
      case 'transcript':
        // Could store transcript in conversation messages
        break;
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (error) {
    console.error('[Vapi Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500, headers: CORS });
  }
}
