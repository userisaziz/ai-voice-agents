import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { data, error } = await supabase
      .from('embedded_widgets')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Failed to fetch widgets:', err);
    return NextResponse.json({ error: 'Failed to load widgets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const body = await req.json();
    const { businessId, ...data } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    const { data: widget, error } = await supabase
      .from('embedded_widgets')
      .insert({
        business_id: businessId,
        agent_id: data.agent_id || null,
        name: data.name,
        widget_type: data.widget_type || 'voice',
        position: data.position,
        primary_color: data.primary_color,
        greeting: data.greeting || null,
        is_active: data.is_active,
        allowed_domains: data.allowed_domains?.length ? data.allowed_domains : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(widget, { status: 201 });
  } catch (err) {
    console.error('Failed to create widget:', err);
    return NextResponse.json({ error: 'Failed to create widget' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const body = await req.json();
    const { widgetId, ...data } = body;

    if (!widgetId) {
      return NextResponse.json({ error: 'widgetId required' }, { status: 400 });
    }

    const { data: widget, error } = await supabase
      .from('embedded_widgets')
      .update({
        agent_id: data.agent_id || null,
        name: data.name,
        widget_type: data.widget_type || 'voice',
        position: data.position,
        primary_color: data.primary_color,
        greeting: data.greeting || null,
        is_active: data.is_active,
        allowed_domains: data.allowed_domains?.length ? data.allowed_domains : null,
      })
      .eq('id', widgetId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(widget);
  } catch (err) {
    console.error('Failed to update widget:', err);
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const widgetId = searchParams.get('widgetId');

    if (!widgetId) {
      return NextResponse.json({ error: 'widgetId required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { error } = await supabase
      .from('embedded_widgets')
      .delete()
      .eq('id', widgetId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete widget:', err);
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
