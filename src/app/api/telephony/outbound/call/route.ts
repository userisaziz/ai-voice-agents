import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createTelephonyProvider } from '@/lib/telephony';
import { getPendingLeads, updateLeadStatus, incrementLeadCallAttempts } from '@/services/campaign-leads';
import { getOutboundCampaign, updateCampaignStatus, updateCampaignLeadCount } from '@/services/outbound-campaigns';
import { getPhoneNumber } from '@/services/phone-numbers';
import { getTelephonyProvider } from '@/services/telephony-providers';
import { createCallLog } from '@/services/call-logs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    // Validate service role key
    const authHeader = req.headers.get('authorization');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!authHeader || !serviceKey || !authHeader.includes(serviceKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { campaignId, maxCalls = 1 } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    const campaign = await getOutboundCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'running' && campaign.status !== 'scheduled') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }

    if (!campaign.caller_number_id) {
      return NextResponse.json({ error: 'No caller number configured' }, { status: 400 });
    }

    const phoneNumber = await getPhoneNumber(campaign.caller_number_id);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Caller number not found' }, { status: 404 });
    }

    const provider = await getTelephonyProvider(phoneNumber.provider_id);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Get pending leads
    const pendingLeads = await getPendingLeads(campaignId, maxCalls);

    if (pendingLeads.length === 0) {
      // Check if all leads are processed
      await updateCampaignLeadCount(campaignId);
      const updatedCampaign = await getOutboundCampaign(campaignId);

      if (updatedCampaign && updatedCampaign.completed_leads >= updatedCampaign.total_leads) {
        await updateCampaignStatus(campaignId, 'completed');
      }

      return NextResponse.json({ success: true, callsInitiated: 0, message: 'No pending leads' });
    }

    const telephonyProvider = createTelephonyProvider(provider);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
    const results: Array<{ leadId: string; name: string; phone: string; success: boolean; error?: string }> = [];

    for (const lead of pendingLeads) {
      try {
        // Update lead status to calling
        await updateLeadStatus(lead.id, 'calling');
        await incrementLeadCallAttempts(lead.id);

        // Create call log
        const callLog = await createCallLog({
          business_id: campaign.business_id,
          campaign_id: campaignId,
          lead_id: lead.id,
          phone_number_id: phoneNumber.id,
          direction: 'outbound',
          from_number: phoneNumber.number,
          to_number: lead.phone,
          status: 'initiated',
          provider_type: provider.provider_type,
        });

        // Make the call
        const result = await telephonyProvider.makeCall({
          to: lead.phone,
          from: phoneNumber.number,
          webhookUrl: `${baseUrl}/api/telephony/webhooks/${provider.provider_type}`,
          statusCallbackUrl: `${baseUrl}/api/telephony/webhooks/${provider.provider_type}`,
          metadata: {
            campaignId,
            leadId: lead.id,
            callLogId: callLog.id,
          },
        });

        if (result.success && result.callId) {
          // Update call log with provider call ID
          const supabase = createAdminSupabase();
          await supabase
            .from('call_logs')
            .update({ provider_call_id: result.callId })
            .eq('id', callLog.id);

          results.push({
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            success: true,
          });
        } else {
          await updateLeadStatus(lead.id, 'failed', callLog.id);
          results.push({
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            success: false,
            error: result.error || 'Call failed',
          });
        }

        // Delay between calls
        if (campaign.call_delay_seconds > 0 && pendingLeads.indexOf(lead) < pendingLeads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, campaign.call_delay_seconds * 1000));
        }
      } catch (error) {
        results.push({
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update campaign lead count
    await updateCampaignLeadCount(campaignId);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      callsInitiated: successCount,
      callsFailed: failCount,
      results,
    }, { headers: CORS });
  } catch (error) {
    console.error('[Outbound Call] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process outbound calls' },
      { status: 500, headers: CORS }
    );
  }
}
