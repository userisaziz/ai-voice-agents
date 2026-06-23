import { createClient } from '@/lib/supabase/client';
import type { PhoneNumber, CallDirection } from '@/types';
import type { PhoneNumberFormData } from '@/validations';

export async function getPhoneNumbers(businessId: string): Promise<PhoneNumber[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*, provider:telephony_providers(*)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPhoneNumber(phoneId: string): Promise<PhoneNumber | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*, provider:telephony_providers(*)')
    .eq('id', phoneId)
    .single();

  if (error) return null;
  return data;
}

export async function getPhoneNumberByNumber(number: string): Promise<PhoneNumber | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*, provider:telephony_providers(*)')
    .eq('number', number)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function getAvailablePhoneNumbers(businessId: string, direction?: CallDirection): Promise<PhoneNumber[]> {
  const supabase = createClient();

  let query = supabase
    .from('phone_numbers')
    .select('*, provider:telephony_providers(*)')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (direction === 'inbound') {
    query = query.in('direction', ['inbound', 'both']);
  } else if (direction === 'outbound') {
    query = query.in('direction', ['outbound', 'both']);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPhoneNumber(
  businessId: string,
  data: PhoneNumberFormData
): Promise<PhoneNumber> {
  const supabase = createClient();

  const { data: phoneNumber, error } = await supabase
    .from('phone_numbers')
    .insert({
      business_id: businessId,
      provider_id: data.provider_id,
      number: data.number,
      friendly_name: data.friendly_name || null,
      direction: data.direction,
      is_active: data.is_active,
    })
    .select('*, provider:telephony_providers(*)')
    .single();

  if (error) throw error;
  return phoneNumber;
}

export async function updatePhoneNumber(
  phoneId: string,
  data: Partial<PhoneNumberFormData>
): Promise<PhoneNumber> {
  const supabase = createClient();

  const { data: phoneNumber, error } = await supabase
    .from('phone_numbers')
    .update({
      number: data.number,
      friendly_name: data.friendly_name || null,
      direction: data.direction,
      is_active: data.is_active,
    })
    .eq('id', phoneId)
    .select('*, provider:telephony_providers(*)')
    .single();

  if (error) throw error;
  return phoneNumber;
}

export async function deletePhoneNumber(phoneId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('phone_numbers')
    .delete()
    .eq('id', phoneId);

  if (error) throw error;
}

export async function togglePhoneNumberStatus(phoneId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('phone_numbers')
    .update({ is_active: isActive })
    .eq('id', phoneId);

  if (error) throw error;
}
