import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getOutboundCampaign, updateCampaignStatus } from '@/services/outbound-campaigns';
import { getPendingLeads, updateLeadStatus, incrementLeadCallAttempts } from '@/services/campaign-leads';
import { getPhoneNumber } from '@/services/phone-numbers';
import { getTelephonyProvider } from '@/services/telephony-providers';
import { createCallLog } from '@/services/call-logs';
import { createTelephonyProvider } from '@/lib/telephony';

async function getBusinessId(userId: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single();
  return business?.id || null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = await getBusinessId(user.id);
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { id: campaignId } = await params;
    const body = await req.json();
    const action = body.action || 'start';

    const campaign = await getOutboundCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'start') {
      // Start the campaign
      await updateCampaignStatus(campaignId, 'running');
      return NextResponse.json({ success: true, message: 'Campaign started' });
    }

    if (action === 'pause') {
      await updateCampaignStatus(campaignId, 'paused');
      return NextResponse.json({ success: true, message: 'Campaign paused' });
    }

    if (action === 'resume') {
      await updateCampaignStatus(campaignId, 'running');
      return NextResponse.json({ success: true, message: 'Campaign resumed' });
    }

    if (action === 'stop') {
      await updateCampaignStatus(campaignId, 'cancelled');
      return NextResponse.json({ success: true, message: 'Campaign stopped' });
    }

    if (action === 'callNext') {
      // Get next pending lead and initiate call
      const pendingLeads = await getPendingLeads(campaignId, 1);

      if (pendingLeads.length === 0) {
        return NextResponse.json({ success: true, message: 'No pending leads', callsInitiated: 0 });
      }

      const lead = pendingLeads[0];

      // Get caller number
      if (!campaign.caller_number_id) {
        return NextResponse.json({ error: 'No caller number configured' }, { status: 400 });
      }

      const phoneNumber = await getPhoneNumber(campaign.caller_number_id);
      if (!phoneNumber) {
        return NextResponse.json({ error: 'Caller number not found' }, { status: 404 });
      }

      // Get provider
      const provider = await getTelephonyProvider(phoneNumber.provider_id);
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      // Update lead status to calling
      await updateLeadStatus(lead.id, 'calling');
      await incrementLeadCallAttempts(lead.id);

      // Create call log
      const callLog = await createCallLog({
        business_id: businessId,
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
      try {
        const telephonyProvider = createTelephonyProvider(provider);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';

        const result = await telephonyProvider.makeCall({
          to: lead.phone,
          from: phoneNumber.number,
          webhookUrl: `${baseUrl}/api/telephony/webhooks/${provider.provider_type}`,
          statusCallbackUrl: `${baseUrl}/api/telephony/webhooks/${provider.provider_type}`,
        });

        if (result.success && result.callId) {
          // Update call log with provider call ID
          const adminSupabase = createAdminSupabase();
          await adminSupabase
            .from('call_logs')
            .update({ provider_call_id: result.callId })
            .eq('id', callLog.id);

          return NextResponse.json({
            success: true,
            callId: result.callId,
            lead: lead.name,
            phone: lead.phone,
          });
        } else {
          await updateLeadStatus(lead.id, 'failed', callLog.id);
          return NextResponse.json({ error: result.error || 'Call failed' }, { status: 500 });
        }
      } catch (error) {
        await updateLeadStatus(lead.id, 'failed', callLog.id);
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Call initiation failed'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Campaign trigger error:', error);
    return NextResponse.json({ error: 'Failed to trigger campaign' }, { status: 500 });
  }
}
