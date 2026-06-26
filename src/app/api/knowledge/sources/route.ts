import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * GET /api/knowledge/sources?businessId=xxx
 *
 * List all knowledge sources for a business with chunk counts.
 */
export async function GET(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { data: sources, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sources: sources || [] });
  } catch (err) {
    console.error('[Sources] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge/sources?sourceId=xxx
 *
 * Delete a knowledge source and all its chunks (cascaded).
 */
export async function DELETE(req: NextRequest) {
  try {
    const sourceId = req.nextUrl.searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Chunks are cascade-deleted via FK constraint
    const { error } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', sourceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Sources] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
