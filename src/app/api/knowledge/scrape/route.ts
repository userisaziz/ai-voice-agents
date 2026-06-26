import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { scrapeUrl } from '@/lib/rag/scraper';
import { chunkText, type Chunk } from '@/lib/rag/chunker';
import { embedBatch } from '@/lib/rag/embeddings';

export async function POST(req: NextRequest) {
  try {
    const { businessId, url, maxDepth = 1 } = await req.json();

    if (!businessId || !url) {
      return NextResponse.json(
        { error: 'businessId and url are required' },
        { status: 400 },
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const clampedDepth = Math.min(Math.max(0, maxDepth), 3); // 0-3
    const supabase = createAdminSupabase();

    // 1. Create knowledge source record
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({
        business_id: businessId,
        source_type: 'url',
        source_url: url,
        title: url,
        status: 'processing',
        metadata: { maxDepth: clampedDepth },
      })
      .select()
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Failed to create knowledge source' }, { status: 500 });
    }

    try {
      // 2. Scrape the URL(s)
      const pages = await scrapeUrl(url, clampedDepth);

      if (pages.length === 0) {
        await supabase
          .from('knowledge_sources')
          .update({ status: 'failed', error_message: 'No content could be scraped from URL' })
          .eq('id', source.id);
        return NextResponse.json({ error: 'No content could be scraped from the URL' }, { status: 400 });
      }

      // Update title from first page
      const title = pages[0].title || url;
      await supabase
        .from('knowledge_sources')
        .update({ title })
        .eq('id', source.id);

      // 3. Chunk all pages
      const allChunks: Chunk[] = [];
      for (const page of pages) {
        const chunks = chunkText(page.text, {
          sourceUrl: page.url,
          pageTitle: page.title,
        });
        allChunks.push(...chunks);
      }

      if (allChunks.length === 0) {
        await supabase
          .from('knowledge_sources')
          .update({ status: 'failed', error_message: 'Scraped content was too short to chunk' })
          .eq('id', source.id);
        return NextResponse.json({ error: 'Scraped content was too short' }, { status: 400 });
      }

      // 4. Generate embeddings
      const texts = allChunks.map((c) => c.content);
      const embeddings = await embedBatch(texts);

      // 5. Store chunks with embeddings
      const chunkRows = allChunks.map((chunk, i) => ({
        source_id: source.id,
        business_id: businessId,
        content: chunk.content,
        embedding: embeddings[i],
        chunk_index: chunk.chunkIndex,
        metadata: chunk.metadata,
      }));

      const BATCH_SIZE = 50;
      for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
        const batch = chunkRows.slice(i, i + BATCH_SIZE);
        const { error: chunkError } = await supabase.from('knowledge_chunks').insert(batch);
        if (chunkError) {
          throw new Error(`Failed to insert chunks: ${chunkError.message}`);
        }
      }

      // 6. Update source status
      await supabase
        .from('knowledge_sources')
        .update({
          status: 'ready',
          chunk_count: allChunks.length,
          metadata: { maxDepth: clampedDepth, pagesScraped: pages.length },
        })
        .eq('id', source.id);

      return NextResponse.json({
        sourceId: source.id,
        pagesScraped: pages.length,
        chunksCreated: allChunks.length,
        title,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Scrape] Processing error:', msg);
      await supabase
        .from('knowledge_sources')
        .update({ status: 'failed', error_message: msg })
        .eq('id', source.id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err) {
    console.error('[Scrape] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
