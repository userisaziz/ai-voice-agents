import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getCallLogs, getCallLogStats } from '@/services/call-logs';

async function getBusinessId(userId: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single();
  return business?.id || null;
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction') as 'inbound' | 'outbound' | null;
    const status = searchParams.get('status') as import('@/types').CallStatus | null;
    const campaignId = searchParams.get('campaignId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const stats = await getCallLogStats(businessId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        campaignId: campaignId || undefined
      });
      return NextResponse.json({ stats });
    }

    const callLogs = await getCallLogs(businessId, {
      direction: direction || undefined,
      status: status || undefined,
      campaignId: campaignId || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ callLogs });
  } catch (error) {
    console.error('Get call logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 });
  }
}
