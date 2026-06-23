import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import {
  getOutboundCampaigns,
  createOutboundCampaign,
  updateOutboundCampaign,
  deleteOutboundCampaign,
  updateCampaignStatus,
  updateCampaignLeadCount,
} from '@/services/outbound-campaigns';
import { outboundCampaignSchema } from '@/validations';

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

    const campaigns = await getOutboundCampaigns(businessId);
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
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

    // Handle status update
    if (body.action === 'updateStatus') {
      await updateCampaignStatus(body.campaignId, body.status);
      return NextResponse.json({ success: true });
    }

    // Handle lead count update
    if (body.action === 'updateLeadCount') {
      await updateCampaignLeadCount(body.campaignId);
      return NextResponse.json({ success: true });
    }

    const validated = outboundCampaignSchema.parse(body);
    const campaign = await createOutboundCampaign(businessId, validated);

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Create campaign error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create campaign';
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
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    const campaign = await updateOutboundCampaign(id, updateData);
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update campaign';
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
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    await deleteOutboundCampaign(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
