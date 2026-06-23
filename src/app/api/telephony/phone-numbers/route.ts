import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import {
  getPhoneNumbers,
  createPhoneNumber,
  updatePhoneNumber,
  deletePhoneNumber,
} from '@/services/phone-numbers';
import { phoneNumberSchema } from '@/validations';

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

    const phoneNumbers = await getPhoneNumbers(businessId);
    return NextResponse.json({ phoneNumbers });
  } catch (error) {
    console.error('Get phone numbers error:', error);
    return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 });
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
    const validated = phoneNumberSchema.parse(body);
    const phoneNumber = await createPhoneNumber(businessId, validated);

    return NextResponse.json({ phoneNumber }, { status: 201 });
  } catch (error) {
    console.error('Create phone number error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create phone number';
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
      return NextResponse.json({ error: 'Phone number ID required' }, { status: 400 });
    }

    const phoneNumber = await updatePhoneNumber(id, updateData);
    return NextResponse.json({ phoneNumber });
  } catch (error) {
    console.error('Update phone number error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update phone number';
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
      return NextResponse.json({ error: 'Phone number ID required' }, { status: 400 });
    }

    await deletePhoneNumber(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete phone number error:', error);
    return NextResponse.json({ error: 'Failed to delete phone number' }, { status: 500 });
  }
}
