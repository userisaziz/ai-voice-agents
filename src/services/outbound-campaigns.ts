import { createClient } from '@/lib/supabase/client';
import type { OutboundCampaign, CampaignStatus } from '@/types';
import type { OutboundCampaignFormData } from '@/validations';

export async function getOutboundCampaigns(businessId: string): Promise<OutboundCampaign[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('outbound_campaigns')
    .select('*, caller_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOutboundCampaign(campaignId: string): Promise<OutboundCampaign | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('outbound_campaigns')
    .select('*, caller_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .eq('id', campaignId)
    .single();

  if (error) return null;
  return data;
}

export async function createOutboundCampaign(
  businessId: string,
  data: OutboundCampaignFormData
): Promise<OutboundCampaign> {
  const supabase = createClient();

  const { data: campaign, error } = await supabase
    .from('outbound_campaigns')
    .insert({
      business_id: businessId,
      name: data.name,
      description: data.description || null,
      status: data.status,
      cron_expression: data.cron_expression || null,
      timezone: data.timezone,
      caller_number_id: data.caller_number_id || null,
      agent_id: data.agent_id || null,
      max_concurrent_calls: data.max_concurrent_calls,
      call_delay_seconds: data.call_delay_seconds,
      retry_attempts: data.retry_attempts,
      retry_delay_minutes: data.retry_delay_minutes,
    })
    .select('*, caller_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .single();

  if (error) throw error;
  return campaign;
}

export async function updateOutboundCampaign(
  campaignId: string,
  data: Partial<OutboundCampaignFormData>
): Promise<OutboundCampaign> {
  const supabase = createClient();

  const { data: campaign, error } = await supabase
    .from('outbound_campaigns')
    .update({
      name: data.name,
      description: data.description || null,
      status: data.status,
      cron_expression: data.cron_expression || null,
      timezone: data.timezone,
      caller_number_id: data.caller_number_id || null,
      agent_id: data.agent_id || null,
      max_concurrent_calls: data.max_concurrent_calls,
      call_delay_seconds: data.call_delay_seconds,
      retry_attempts: data.retry_attempts,
      retry_delay_minutes: data.retry_delay_minutes,
    })
    .eq('id', campaignId)
    .select('*, caller_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .single();

  if (error) throw error;
  return campaign;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<void> {
  const supabase = createClient();

  const updates: Record<string, unknown> = { status };

  if (status === 'running') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'completed' || status === 'cancelled') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('outbound_campaigns')
    .update(updates)
    .eq('id', campaignId);

  if (error) throw error;
}

export async function deleteOutboundCampaign(campaignId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('outbound_campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) throw error;
}

export async function updateCampaignLeadCount(campaignId: string): Promise<void> {
  const supabase = createClient();

  // Get total leads
  const { count: totalLeads } = await supabase
    .from('campaign_leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  // Get completed leads
  const { count: completedLeads } = await supabase
    .from('campaign_leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['completed', 'failed', 'skipped']);

  const { error } = await supabase
    .from('outbound_campaigns')
    .update({
      total_leads: totalLeads || 0,
      completed_leads: completedLeads || 0,
    })
    .eq('id', campaignId);

  if (error) throw error;
}

export async function getScheduledCampaigns(): Promise<OutboundCampaign[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('outbound_campaigns')
    .select('*, caller_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .eq('status', 'scheduled')
    .not('cron_expression', 'is', null);

  if (error) throw error;
  return data || [];
}
