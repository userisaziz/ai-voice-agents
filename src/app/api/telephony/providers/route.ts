import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import {
  getTelephonyProviders,
  createTelephonyProvider,
  updateTelephonyProvider,
  deleteTelephonyProvider,
  testProviderCredentials,
  setDefaultProvider,
} from '@/services/telephony-providers';
import { telephonyProviderSchema } from '@/validations';

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

    const providers = await getTelephonyProviders(businessId);
    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
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

    // Handle test credentials request
    if (body.action === 'test') {
      const result = await testProviderCredentials(body.provider_type, body.credentials);
      return NextResponse.json(result);
    }

    // Handle set default request
    if (body.action === 'setDefault') {
      await setDefaultProvider(businessId, body.providerId);
      return NextResponse.json({ success: true });
    }

    const validated = telephonyProviderSchema.parse(body);
    const provider = await createTelephonyProvider(businessId, validated);

    return NextResponse.json({ provider }, { status: 201 });
  } catch (error) {
    console.error('Create provider error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create provider';
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
      return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
    }

    const provider = await updateTelephonyProvider(id, updateData);
    return NextResponse.json({ provider });
  } catch (error) {
    console.error('Update provider error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update provider';
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
      return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
    }

    await deleteTelephonyProvider(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete provider error:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
