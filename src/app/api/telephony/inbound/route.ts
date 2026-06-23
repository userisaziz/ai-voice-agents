import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import {
  getInboundConfigs,
  createInboundConfig,
  updateInboundConfig,
  deleteInboundConfig,
} from '@/services/inbound-configs';
import { inboundConfigSchema } from '@/validations';

async function getBusinessId(userId: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single();
  return business?.id || null;
}

export async function GET() {
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

    const configs = await getInboundConfigs(businessId);
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Get inbound configs error:', error);
    return NextResponse.json({ error: 'Failed to fetch inbound configs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validated = inboundConfigSchema.parse(body);
    const config = await createInboundConfig(businessId, validated);

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error('Create inbound config error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create inbound config';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Config ID required' }, { status: 400 });
    }

    const config = await updateInboundConfig(id, updateData);
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Update inbound config error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update inbound config';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Config ID required' }, { status: 400 });
    }

    await deleteInboundConfig(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete inbound config error:', error);
    return NextResponse.json({ error: 'Failed to delete inbound config' }, { status: 500 });
  }
}
