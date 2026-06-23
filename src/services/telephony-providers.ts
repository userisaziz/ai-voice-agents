import { createClient } from '@/lib/supabase/client';
import type { TelephonyProvider, TelephonyProviderType, TelephonyCredentials } from '@/types';
import type { TelephonyProviderFormData } from '@/validations';

export async function getTelephonyProviders(businessId: string): Promise<TelephonyProvider[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telephony_providers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTelephonyProvider(providerId: string): Promise<TelephonyProvider | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telephony_providers')
    .select('*')
    .eq('id', providerId)
    .single();

  if (error) return null;
  return data;
}

export async function getDefaultProvider(businessId: string): Promise<TelephonyProvider | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telephony_providers')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error) {
    // Fall back to first active provider
    const { data: fallback } = await supabase
      .from('telephony_providers')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .limit(1)
      .single();
    return fallback || null;
  }
  return data;
}

export async function createTelephonyProvider(
  businessId: string,
  data: TelephonyProviderFormData
): Promise<TelephonyProvider> {
  const supabase = createClient();

  // If setting as default, unset other defaults first
  if (data.is_default) {
    await supabase
      .from('telephony_providers')
      .update({ is_default: false })
      .eq('business_id', businessId);
  }

  const { data: provider, error } = await supabase
    .from('telephony_providers')
    .insert({
      business_id: businessId,
      name: data.name,
      provider_type: data.provider_type,
      credentials: data.credentials,
      is_default: data.is_default,
      is_active: data.is_active,
      webhook_url: data.webhook_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return provider;
}

export async function updateTelephonyProvider(
  providerId: string,
  data: Partial<TelephonyProviderFormData>
): Promise<TelephonyProvider> {
  const supabase = createClient();

  // If setting as default, unset other defaults first
  if (data.is_default) {
    const { data: provider } = await supabase
      .from('telephony_providers')
      .select('business_id')
      .eq('id', providerId)
      .single();

    if (provider) {
      await supabase
        .from('telephony_providers')
        .update({ is_default: false })
        .eq('business_id', provider.business_id);
    }
  }

  const { data: provider, error } = await supabase
    .from('telephony_providers')
    .update({
      name: data.name,
      provider_type: data.provider_type,
      credentials: data.credentials,
      is_default: data.is_default,
      is_active: data.is_active,
      webhook_url: data.webhook_url || null,
    })
    .eq('id', providerId)
    .select()
    .single();

  if (error) throw error;
  return provider;
}

export async function deleteTelephonyProvider(providerId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('telephony_providers')
    .delete()
    .eq('id', providerId);

  if (error) throw error;
}

export async function testProviderCredentials(
  providerType: TelephonyProviderType,
  credentials: TelephonyCredentials
): Promise<{ success: boolean; error?: string }> {
  const { createProviderFromType } = await import('@/lib/telephony');

  try {
    const provider = createProviderFromType(providerType, credentials);
    const isValid = await provider.validateCredentials();
    return isValid
      ? { success: true }
      : { success: false, error: 'Credentials validation failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function setDefaultProvider(businessId: string, providerId: string): Promise<void> {
  const supabase = createClient();

  // Unset all defaults
  await supabase
    .from('telephony_providers')
    .update({ is_default: false })
    .eq('business_id', businessId);

  // Set new default
  const { error } = await supabase
    .from('telephony_providers')
    .update({ is_default: true })
    .eq('id', providerId)
    .eq('business_id', businessId);

  if (error) throw error;
}
