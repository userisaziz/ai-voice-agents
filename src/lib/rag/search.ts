/**
 * RAG Hybrid Search Service
 *
 * Combines vector similarity search (semantic) with full-text search (keyword)
 * using Reciprocal Rank Fusion via the Supabase `search_knowledge` RPC function.
 */

import { createAdminSupabase } from '@/lib/supabase/admin';
import { embedText } from './embeddings';

export interface SearchResult {
  id: string;
  content: string;
  source_id: string;
  source_title: string;
  source_type: string;
  similarity: number;
  fts_rank: number;
  score: number;
  metadata: Record<string, unknown> | null;
}

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);
const DEFAULT_THRESHOLD = 0.3;

/**
 * Run hybrid search (vector + FTS) for a query against a business's knowledge base.
 */
export async function hybridSearch(
  query: string,
  businessId: string,
  topK: number = DEFAULT_TOP_K,
): Promise<SearchResult[]> {
  if (!query || !query.trim()) return [];

  // 1. Generate embedding for the query
  const queryEmbedding = await embedText(query.trim());

  // 2. Call the Supabase RPC that does vector + FTS with RRF fusion
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc('search_knowledge', {
    query_embedding: queryEmbedding,
    query_text: query.trim(),
    p_business_id: businessId,
    match_count: topK,
    match_threshold: DEFAULT_THRESHOLD,
  });

  if (error) {
    console.error('[RAG Search] RPC error:', error.message);
    return [];
  }

  return (data || []) as SearchResult[];
}

/**
 * Format search results into a prompt-friendly context block.
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const sections = results.map((r, i) => {
    const sourceLabel = r.source_title ? ` [Source: ${r.source_title}]` : '';
    return `[${i + 1}]${sourceLabel}\n${r.content}`;
  });

  return `RELEVANT KNOWLEDGE:\n${sections.join('\n\n')}`;
}
