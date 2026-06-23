import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET() {
  const admin = createAdminSupabase();
  const results: Record<string, { ok: boolean; error?: string; count?: number }> = {};

  const tables = [
    'telephony_providers',
    'phone_numbers',
    'inbound_configs',
    'outbound_campaigns',
    'campaign_leads',
    'call_logs',
    'agents', // baseline - this works
  ];

  for (const table of tables) {
    const { error, count } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      results[table] = { ok: false, error: `${error.code}: ${error.message}` };
    } else {
      results[table] = { ok: true, count: count || 0 };
    }
  }

  // Also check the is_business_owner function
  const { error: fnError } = await admin.rpc('is_business_owner', { business_id: '00000000-0000-0000-0000-000000000000' });
  results['is_business_owner_fn'] = fnError
    ? { ok: false, error: `${fnError.code}: ${fnError.message}` }
    : { ok: true };

  return NextResponse.json(results, { status: 200 });
}
