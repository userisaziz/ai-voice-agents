import { createClient } from '@/lib/supabase/client';
import type { InboundConfig } from '@/types';
import type { InboundConfigFormData } from '@/validations';

export async function getInboundConfigs(businessId: string): Promise<InboundConfig[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('inbound_configs')
    .select('*, phone_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getInboundConfig(configId: string): Promise<InboundConfig | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('inbound_configs')
    .select('*, phone_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .eq('id', configId)
    .single();

  if (error) return null;
  return data;
}

export async function getInboundConfigByPhoneNumber(phoneNumberId: string): Promise<InboundConfig | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('inbound_configs')
    .select('*, phone_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .eq('phone_number_id', phoneNumberId)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function createInboundConfig(
  businessId: string,
  data: InboundConfigFormData
): Promise<InboundConfig> {
  const supabase = createClient();

  const { data: config, error } = await supabase
    .from('inbound_configs')
    .insert({
      business_id: businessId,
      phone_number_id: data.phone_number_id,
      agent_id: data.agent_id || null,
      greeting_override: data.greeting_override || null,
      lead_capture_enabled: data.lead_capture_enabled,
      appointment_booking_enabled: data.appointment_booking_enabled,
      faq_enabled: data.faq_enabled,
      service_info_enabled: data.service_info_enabled,
      is_active: data.is_active,
    })
    .select('*, phone_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .single();

  if (error) throw error;
  return config;
}

export async function updateInboundConfig(
  configId: string,
  data: Partial<InboundConfigFormData>
): Promise<InboundConfig> {
  const supabase = createClient();

  const { data: config, error } = await supabase
    .from('inbound_configs')
    .update({
      agent_id: data.agent_id || null,
      greeting_override: data.greeting_override || null,
      lead_capture_enabled: data.lead_capture_enabled,
      appointment_booking_enabled: data.appointment_booking_enabled,
      faq_enabled: data.faq_enabled,
      service_info_enabled: data.service_info_enabled,
      is_active: data.is_active,
    })
    .eq('id', configId)
    .select('*, phone_number:phone_numbers(*, provider:telephony_providers(*)), agent:agents(*)')
    .single();

  if (error) throw error;
  return config;
}

export async function deleteInboundConfig(configId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('inbound_configs')
    .delete()
    .eq('id', configId);

  if (error) throw error;
}

export async function toggleInboundConfigStatus(configId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('inbound_configs')
    .update({ is_active: isActive })
    .eq('id', configId);

  if (error) throw error;
}
