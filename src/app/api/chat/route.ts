import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { searchProducts, getCategories, getTopSellers } from '@/services/marsa-tijarah';
import { hybridSearch, formatSearchContext } from '@/lib/rag/search';

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
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

// ── Tool definitions for DeepSeek function calling ─────────────────────
const CHAT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'searchProducts',
      description: 'Search for products in the marketplace by keyword, category, or price range. Returns approved products with pricing and supplier information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword for products (e.g., "steel", "cement", "copper wire")' },
          category: { type: 'string', description: 'Filter by category name (optional)' },
          min_price: { type: 'number', description: 'Minimum price filter (optional)' },
          max_price: { type: 'number', description: 'Maximum price filter (optional)' },
          limit: { type: 'number', description: 'Max results to return, default 10 (optional)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCategories',
      description: 'Get all available product categories in the marketplace',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getTopSellers',
      description: 'Get top-rated premium sellers from the marketplace, optionally filtered by category',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter sellers by category (optional)' },
          limit: { type: 'number', description: 'Max results to return, default 5 (optional)' },
        },
        required: [],
      },
    },
  },
];

// ── Execute a tool call and return the result as a string ──────────────
async function executeToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'searchProducts': {
        const result = await searchProducts({
          query: (args.query as string) || '',
          category: args.category as string | undefined,
          min_price: args.min_price as number | undefined,
          max_price: args.max_price as number | undefined,
          limit: (args.limit as number) || 10,
        });
        return JSON.stringify(result);
      }
      case 'getCategories': {
        const result = await getCategories();
        return JSON.stringify(result);
      }
      case 'getTopSellers': {
        const result = await getTopSellers({
          category: args.category as string | undefined,
          limit: (args.limit as number) || 5,
        });
        return JSON.stringify(result);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`[Chat API] Tool execution error (${name}):`, err);
    return JSON.stringify({ error: 'Tool execution failed' });
  }
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

    // RAG: Retrieve relevant knowledge chunks for the user's query
    let ragContext = '';
    try {
      const ragResults = await hybridSearch(message, businessId, 5);
      ragContext = formatSearchContext(ragResults);
    } catch (ragErr) {
      console.warn('[Chat API] RAG search failed (non-fatal):', ragErr);
    }

    const contextPrompt = `${basePrompt}\n\nBusiness: ${business.name}${business.city ? ', ' + business.city : ''}${business.state ? ', ' + business.state : ''}\nYou are chatting via the website chat widget. Keep responses concise (2-3 sentences max). Use a conversational tone.\n\nYou have access to marketplace tools: use searchProducts to find products, getCategories to browse categories, and getTopSellers to find top sellers. When presenting product results, format them nicely with name, price, and supplier info.${ragContext ? '\n\n' + ragContext : ''}`;

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

    // Call DeepSeek API with tool-calling loop
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'DeepSeek API key not configured' }, { status: 500 });
    }

    const deepseekHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deepseekApiKey}`,
    };

    let reply = "I'm sorry, I couldn't process that. Please try again.";
    const MAX_TOOL_ROUNDS = 4;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: deepseekHeaders,
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          tools: CHAT_TOOLS,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!deepseekRes.ok) {
        const errText = await deepseekRes.text();
        console.error('[Chat API] DeepSeek error:', errText);
        return NextResponse.json({ error: 'LLM request failed', conversationId: convId }, { status: 502 });
      }

      const data = await deepseekRes.json();
      const choice = data.choices?.[0]?.message;

      if (!choice) break;

      // If no tool calls, we have the final reply
      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        reply = choice.content || reply;
        break;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: choice.content || '',
        tool_calls: choice.tool_calls,
      });

      // Execute each tool call and add results
      for (const toolCall of choice.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          args = {};
        }

        const result = await executeToolCall(toolCall.function.name, args);

        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
        });
      }
      // Loop continues — DeepSeek will generate a response using tool results
    }

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
