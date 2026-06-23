import { createClient } from '@/lib/supabase/client';
import type { CampaignLead, LeadCallStatus } from '@/types';
import type { CampaignLeadFormData } from '@/validations';

export async function getCampaignLeads(campaignId: string): Promise<CampaignLead[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('campaign_leads')
    .select('*, call_log:call_logs(*)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCampaignLead(leadId: string): Promise<CampaignLead | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('campaign_leads')
    .select('*, call_log:call_logs(*)')
    .eq('id', leadId)
    .single();

  if (error) return null;
  return data;
}

export async function getPendingLeads(campaignId: string, limit = 10): Promise<CampaignLead[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('campaign_leads')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createCampaignLead(
  businessId: string,
  campaignId: string,
  data: CampaignLeadFormData
): Promise<CampaignLead> {
  const supabase = createClient();

  const { data: lead, error } = await supabase
    .from('campaign_leads')
    .insert({
      business_id: businessId,
      campaign_id: campaignId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      custom_fields: data.custom_fields || null,
      notes: data.notes || null,
      status: 'pending',
    })
    .select('*, call_log:call_logs(*)')
    .single();

  if (error) throw error;
  return lead;
}

export async function createCampaignLeadsBulk(
  businessId: string,
  campaignId: string,
  leads: Array<CampaignLeadFormData & { custom_fields?: Record<string, unknown> | null }>
): Promise<{ created: number; errors: string[] }> {
  const supabase = createClient();
  const errors: string[] = [];

  const leadRecords = leads.map((lead) => ({
    business_id: businessId,
    campaign_id: campaignId,
    name: lead.name,
    phone: lead.phone,
    email: lead.email || null,
    custom_fields: lead.custom_fields || null,
    notes: lead.notes || null,
    status: 'pending' as const,
  }));

  // Insert in batches of 100
  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < leadRecords.length; i += batchSize) {
    const batch = leadRecords.slice(i, i + batchSize);
    const { error, count } = await supabase
      .from('campaign_leads')
      .insert(batch);

    if (error) {
      errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
    } else {
      created += count || batch.length;
    }
  }

  return { created, errors };
}

export async function updateCampaignLead(
  leadId: string,
  data: Partial<CampaignLeadFormData & { status: LeadCallStatus; call_log_id: string }>
): Promise<CampaignLead> {
  const supabase = createClient();

  const { data: lead, error } = await supabase
    .from('campaign_leads')
    .update({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      custom_fields: data.custom_fields || null,
      notes: data.notes || null,
      status: data.status,
      call_log_id: data.call_log_id,
      call_attempts: data.status === 'calling' ? undefined : undefined,
      last_attempt_at: data.status === 'calling' ? new Date().toISOString() : undefined,
    })
    .eq('id', leadId)
    .select('*, call_log:call_logs(*)')
    .single();

  if (error) throw error;
  return lead;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadCallStatus,
  callLogId?: string
): Promise<void> {
  const supabase = createClient();

  const updates: Record<string, unknown> = { status };

  if (status === 'calling') {
    updates.last_attempt_at = new Date().toISOString();
  }

  if (callLogId) {
    updates.call_log_id = callLogId;
  }

  const { error } = await supabase
    .from('campaign_leads')
    .update(updates)
    .eq('id', leadId);

  if (error) throw error;
}

export async function incrementLeadCallAttempts(leadId: string): Promise<void> {
  const supabase = createClient();

  // Get current attempts
  const { data: lead } = await supabase
    .from('campaign_leads')
    .select('call_attempts')
    .eq('id', leadId)
    .single();

  const { error } = await supabase
    .from('campaign_leads')
    .update({
      call_attempts: (lead?.call_attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) throw error;
}

export async function deleteCampaignLead(leadId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('campaign_leads')
    .delete()
    .eq('id', leadId);

  if (error) throw error;
}

export async function deleteCampaignLeads(campaignId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('campaign_leads')
    .delete()
    .eq('campaign_id', campaignId);

  if (error) throw error;
}

export function parseCsvLeads(csvContent: string): {
  leads: CampaignLeadFormData[];
  errors: string[];
} {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  const leads: CampaignLeadFormData[] = [];

  if (lines.length < 2) {
    return { leads: [], errors: ['CSV file must contain headers and at least one data row'] };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIndex = headers.findIndex((h) => h === 'name' || h === 'full_name');
  const phoneIndex = headers.findIndex((h) => h === 'phone' || h === 'phone_number' || h === 'mobile');
  const emailIndex = headers.findIndex((h) => h === 'email' || h === 'email_address');

  if (nameIndex === -1) {
    errors.push('Missing required column: name');
  }
  if (phoneIndex === -1) {
    errors.push('Missing required column: phone');
  }

  if (errors.length > 0) {
    return { leads: [], errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());

    if (values.length < Math.max(nameIndex, phoneIndex) + 1) {
      errors.push(`Row ${i + 1}: Not enough columns`);
      continue;
    }

    const name = values[nameIndex];
    const phone = values[phoneIndex];
    const email = emailIndex !== -1 ? values[emailIndex] : undefined;

    if (!name) {
      errors.push(`Row ${i + 1}: Missing name`);
      continue;
    }
    if (!phone || phone.length < 10) {
      errors.push(`Row ${i + 1}: Invalid phone number`);
      continue;
    }

    leads.push({
      name,
      phone,
      email: email || '',
      notes: '',
    });
  }

  return { leads, errors };
}
