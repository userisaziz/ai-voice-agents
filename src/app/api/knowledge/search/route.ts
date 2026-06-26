import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch, formatSearchContext } from '@/lib/rag/search';

/**
 * POST /api/knowledge/search
 *
 * Hybrid search endpoint for RAG queries.
 * Used by both the chat API and the voice agent tool.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId, query, topK = 5 } = await req.json();

    if (!businessId || !query) {
      return NextResponse.json(
        { error: 'businessId and query are required' },
        { status: 400 },
      );
    }

    const results = await hybridSearch(query, businessId, topK);

    return NextResponse.json({
      results,
      context: formatSearchContext(results),
      count: results.length,
    });
  } catch (err) {
    console.error('[Knowledge Search] Error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
