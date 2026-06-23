import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, conversationId, message, history } = await req.json() as {
      businessId: string;
      conversationId?: string;
      message: string;
      history?: ChatMessage[];
    };

    if (!businessId || !message) {
      return NextResponse.json({ error: 'businessId and message are required' }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    // Load business and agent info
    const [{ data: business }, { data: agent }] = await Promise.all([
      supabase.from('businesses').select('id, name, city, state').eq('id', businessId).single(),
      supabase
        .from('agents')
        .select('id, name, system_prompt, greeting_message')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .limit(1)
        .single(),
    ]);

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          business_id: businessId,
          agent_id: agent?.id || null,
          status: 'active',
          source: 'widget',
        })
        .select('id')
        .single();

      if (convError || !conv) {
        throw new Error('Failed to create conversation');
      }
      convId = conv.id;
    }

    // Build system prompt
    const basePrompt = agent?.system_prompt || `You are a helpful AI assistant for ${business.name}. Answer questions clearly and concisely. Be friendly and professional.`;
    const contextPrompt = `${basePrompt}\n\nBusiness: ${business.name}${business.city ? ', ' + business.city : ''}${business.state ? ', ' + business.state : ''}\nYou are chatting via the website chat widget. Keep responses concise (2-3 sentences max). Use a conversational tone.`;

    // Build message history for DeepSeek
    const messages: ChatMessage[] = [
      { role: 'system', content: contextPrompt },
    ];

    // Add conversation history if provided
    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    } else {
      // Load recent messages from DB if no history provided
      const { data: existingMessages } = await supabase
        .from('conversation_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: true })
        .limit(20);

      if (existingMessages) {
        for (const msg of existingMessages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Save user message to DB
    await supabase.from('conversation_messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
    });

    // Call DeepSeek API
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'DeepSeek API key not configured' }, { status: 500 });
    }

    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text();
      console.error('[Chat API] DeepSeek error:', errText);
      return NextResponse.json({ error: 'LLM request failed', conversationId: convId }, { status: 502 });
    }

    const deepseekData = await deepseekRes.json();
    const reply = deepseekData.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Please try again.";

    // Save assistant message to DB
    await supabase.from('conversation_messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: reply,
    });

    // Update interaction count on widget
    const { data: widget } = await supabase
      .from('embedded_widgets')
      .select('id, total_interactions')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (widget) {
      await supabase
        .from('embedded_widgets')
        .update({ total_interactions: (widget.total_interactions || 0) + 1 })
        .eq('id', widget.id);
    }

    return NextResponse.json(
      { reply, conversationId: convId },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[Chat API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
