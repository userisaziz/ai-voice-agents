import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { TwilioProvider } from '@/lib/telephony/twilio';
import { parseCallStatus } from '@/lib/telephony/types';
import { getPhoneNumberByNumber } from '@/services/phone-numbers';
import { getInboundConfigByPhoneNumber } from '@/services/inbound-configs';
import { updateCallLogByProviderId, createCallLog } from '@/services/call-logs';
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
    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, unknown>;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    } else {
      body = await req.json();
    }

    const webhook = TwilioProvider.parseWebhook(body);
    const supabase = createAdminSupabase();

    console.log('[Twilio Webhook]', webhook.eventType, webhook.callSid);

    // Check if this is a status callback for an existing call
    if (webhook.callSid) {
      const existingLog = await (async () => {
        const { data } = await supabase
          .from('call_logs')
          .select('*')
          .eq('provider_call_id', webhook.callSid)
          .single();
        return data;
      })();

      if (existingLog) {
        const status = parseCallStatus(webhook.status || '');

        // Update call log
        await updateCallLogByProviderId(webhook.callSid, {
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

        return NextResponse.json({ success: true });
      }
    }

    // Handle inbound call
    if (webhook.eventType === 'ringing' || body.Direction === 'inbound') {
      const inboundCall = TwilioProvider.parseInboundCall(body);

      // Look up phone number and config
      const phoneNumber = await getPhoneNumberByNumber(inboundCall.to);
      if (!phoneNumber) {
        console.log('[Twilio Webhook] Unknown phone number:', inboundCall.to);
        return new NextResponse(
          TwilioProvider.generateTwiML({ greeting: 'This number is not configured.' }),
          { headers: { ...CORS, 'Content-Type': 'application/xml' } }
        );
      }

      const inboundConfig = await getInboundConfigByPhoneNumber(phoneNumber.id);
      if (!inboundConfig || !inboundConfig.is_active) {
        return new NextResponse(
          TwilioProvider.generateTwiML({ greeting: 'This line is currently unavailable.' }),
          { headers: { ...CORS, 'Content-Type': 'application/xml' } }
        );
      }

      // Create conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .insert({
          business_id: phoneNumber.business_id,
          agent_id: inboundConfig.agent_id,
          caller_phone: inboundCall.from,
          status: 'active',
          source: 'widget',
        })
        .select()
        .single();

      // Create call log
      const callLog = await createCallLog({
        business_id: phoneNumber.business_id,
        phone_number_id: phoneNumber.id,
        conversation_id: conversation?.id,
        direction: 'inbound',
        from_number: inboundCall.from,
        to_number: inboundCall.to,
        status: 'ringing',
        provider_call_id: inboundCall.callId,
        provider_type: 'twilio',
      });

      // Generate TwiML response
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
      const greeting = inboundConfig.greeting_override || 'Hello! Please hold while we connect you.';

      // For now, return simple TwiML - in production, you'd connect to the AI agent
      const twiml = TwilioProvider.generateTwiML({
        greeting,
        actionUrl: `${baseUrl}/api/telephony/webhooks/twilio?action=connect&callLogId=${callLog.id}`,
      });

      return new NextResponse(twiml, {
        headers: { ...CORS, 'Content-Type': 'application/xml' },
      });
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (error) {
    console.error('[Twilio Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500, headers: CORS });
  }
}
