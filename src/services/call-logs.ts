import { createClient } from '@/lib/supabase/client';
import type { CallLog, CallStatus } from '@/types';

export async function getCallLogs(
  businessId: string,
  options?: {
    direction?: 'inbound' | 'outbound';
    status?: CallStatus;
    campaignId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CallLog[]> {
  const supabase = createClient();

  let query = supabase
    .from('call_logs')
    .select('*, campaign:outbound_campaigns(*), lead:campaign_leads(*), conversation:conversations(*)')
    .eq('business_id', businessId);

  if (options?.direction) {
    query = query.eq('direction', options.direction);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.campaignId) {
    query = query.eq('campaign_id', options.campaignId);
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

export async function getCallLog(callLogId: string): Promise<CallLog | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select('*, campaign:outbound_campaigns(*), lead:campaign_leads(*), conversation:conversations(*)')
    .eq('id', callLogId)
    .single();

  if (error) return null;
  return data;
}

export async function getCallLogByProviderCallId(providerCallId: string): Promise<CallLog | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select('*, campaign:outbound_campaigns(*), lead:campaign_leads(*), conversation:conversations(*)')
    .eq('provider_call_id', providerCallId)
    .single();

  if (error) return null;
  return data;
}

export async function createCallLog(data: {
  business_id: string;
  campaign_id?: string;
  lead_id?: string;
  conversation_id?: string;
  phone_number_id?: string;
  direction: 'inbound' | 'outbound';
  from_number?: string;
  to_number?: string;
  status: CallStatus;
  provider_call_id?: string;
  provider_type?: string;
}): Promise<CallLog> {
  const supabase = createClient();

  const { data: callLog, error } = await supabase
    .from('call_logs')
    .insert({
      business_id: data.business_id,
      campaign_id: data.campaign_id || null,
      lead_id: data.lead_id || null,
      conversation_id: data.conversation_id || null,
      phone_number_id: data.phone_number_id || null,
      direction: data.direction,
      from_number: data.from_number || null,
      to_number: data.to_number || null,
      status: data.status,
      provider_call_id: data.provider_call_id || null,
      provider_type: data.provider_type || null,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return callLog;
}

export async function updateCallLog(
  callLogId: string,
  updates: {
    status?: CallStatus;
    duration_seconds?: number;
    recording_url?: string;
    error_message?: string;
    conversation_id?: string;
    ended_at?: string;
  }
): Promise<CallLog> {
  const supabase = createClient();

  const { data: callLog, error } = await supabase
    .from('call_logs')
    .update({
      status: updates.status,
      duration_seconds: updates.duration_seconds,
      recording_url: updates.recording_url,
      error_message: updates.error_message,
      conversation_id: updates.conversation_id,
      ended_at: updates.ended_at || (updates.status === 'completed' ? new Date().toISOString() : undefined),
    })
    .eq('id', callLogId)
    .select('*')
    .single();

  if (error) throw error;
  return callLog;
}

export async function updateCallLogByProviderId(
  providerCallId: string,
  updates: {
    status?: CallStatus;
    duration_seconds?: number;
    recording_url?: string;
    error_message?: string;
    ended_at?: string;
  }
): Promise<CallLog | null> {
  const supabase = createClient();

  const { data: callLog, error } = await supabase
    .from('call_logs')
    .update({
      status: updates.status,
      duration_seconds: updates.duration_seconds,
      recording_url: updates.recording_url,
      error_message: updates.error_message,
      ended_at: updates.ended_at || (updates.status === 'completed' ? new Date().toISOString() : undefined),
    })
    .eq('provider_call_id', providerCallId)
    .select('*')
    .single();

  if (error) return null;
  return callLog;
}

export async function getCallLogStats(
  businessId: string,
  options?: { startDate?: string; endDate?: string; campaignId?: string }
): Promise<{
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  total_duration_seconds: number;
  average_duration_seconds: number;
}> {
  const supabase = createClient();

  let query = supabase
    .from('call_logs')
    .select('status, duration_seconds')
    .eq('business_id', businessId);

  if (options?.campaignId) {
    query = query.eq('campaign_id', options.campaignId);
  }
  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  const logs = data || [];
  const totalCalls = logs.length;
  const completedCalls = logs.filter((l) => l.status === 'completed').length;
  const failedCalls = logs.filter((l) => ['failed', 'no-answer', 'busy'].includes(l.status)).length;
  const totalDuration = logs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
  const averageDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;

  return {
    total_calls: totalCalls,
    completed_calls: completedCalls,
    failed_calls: failedCalls,
    total_duration_seconds: totalDuration,
    average_duration_seconds: averageDuration,
  };
}
