import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import {
  getCampaignLeads,
  createCampaignLead,
  createCampaignLeadsBulk,
  updateCampaignLead,
  deleteCampaignLead,
  deleteCampaignLeads,
  parseCsvLeads,
} from '@/services/campaign-leads';
import { updateCampaignLeadCount } from '@/services/outbound-campaigns';
import { campaignLeadSchema } from '@/validations';

async function getBusinessId(userId: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single();
  return business?.id || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const leads = await getCampaignLeads(campaignId);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Get campaign leads error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: campaignId } = await params;
    const contentType = req.headers.get('content-type') || '';

    // Handle CSV upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const csvContent = await file.text();
      const { leads: parsedLeads, errors: parseErrors } = parseCsvLeads(csvContent);

      if (parseErrors.length > 0 && parsedLeads.length === 0) {
        return NextResponse.json({ error: 'Failed to parse CSV', details: parseErrors }, { status: 400 });
      }

      const { created, errors: insertErrors } = await createCampaignLeadsBulk(
        businessId,
        campaignId,
        parsedLeads
      );

      // Update campaign lead count
      await updateCampaignLeadCount(campaignId);

      return NextResponse.json({
        created,
        parseErrors: parseErrors,
        insertErrors,
      });
    }

    // Handle single lead creation
    const body = await req.json();

    // Handle bulk creation
    if (body.action === 'bulk' && Array.isArray(body.leads)) {
      const { created, errors } = await createCampaignLeadsBulk(businessId, campaignId, body.leads);
      await updateCampaignLeadCount(campaignId);
      return NextResponse.json({ created, errors }, { status: 201 });
    }

    const validated = campaignLeadSchema.parse(body);
    const lead = await createCampaignLead(businessId, campaignId, validated);

    // Update campaign lead count
    await updateCampaignLeadCount(campaignId);

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Create campaign lead error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create lead';
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
    const { id, campaignId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const lead = await updateCampaignLead(id, updateData);

    // Update campaign lead count if provided
    if (campaignId) {
      await updateCampaignLeadCount(campaignId);
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Update campaign lead error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    if (leadId) {
      await deleteCampaignLead(leadId);
    } else {
      // Delete all leads for campaign
      await deleteCampaignLeads(campaignId);
    }

    // Update campaign lead count
    await updateCampaignLeadCount(campaignId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign lead error:', error);
    return NextResponse.json({ error: 'Failed to delete lead(s)' }, { status: 500 });
  }
}
