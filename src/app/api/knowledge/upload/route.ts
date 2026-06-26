import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { parseFile } from '@/lib/rag/file-parser';
import { chunkText, chunkCsv, type Chunk } from '@/lib/rag/chunker';
import { embedBatch } from '@/lib/rag/embeddings';

const MAX_FILE_SIZE = parseInt(process.env.RAG_MAX_FILE_SIZE || '10485760', 10); // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const businessId = formData.get('businessId') as string;
    const file = formData.get('file') as File | null;

    if (!businessId || !file) {
      return NextResponse.json(
        { error: 'businessId and file are required' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${Math.round(MAX_FILE_SIZE / 1048576)}MB` },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabase();

    // 1. Create knowledge source record
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({
        business_id: businessId,
        source_type: 'file',
        file_name: file.name,
        title: file.name,
        status: 'processing',
        metadata: { mimeType: file.type, size: file.size },
      })
      .select()
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Failed to create knowledge source' }, { status: 500 });
    }

    try {
      // 2. Parse the file
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseFile(buffer, file.name, file.type);

      // 3. Chunk the content
      let chunks: Chunk[];
      if (file.name.endsWith('.csv')) {
        chunks = chunkCsv(parsed.text, { fileName: file.name });
      } else {
        chunks = chunkText(parsed.text, {
          fileName: file.name,
          pageCount: parsed.pageCount,
        });
      }

      if (chunks.length === 0) {
        await supabase
          .from('knowledge_sources')
          .update({ status: 'failed', error_message: 'No content extracted from file' })
          .eq('id', source.id);
        return NextResponse.json({ error: 'No content could be extracted from the file' }, { status: 400 });
      }

      // 4. Generate embeddings for all chunks
      const texts = chunks.map((c) => c.content);
      const embeddings = await embedBatch(texts);

      // 5. Store chunks with embeddings
      const chunkRows = chunks.map((chunk, i) => ({
        source_id: source.id,
        business_id: businessId,
        content: chunk.content,
        embedding: embeddings[i],
        chunk_index: chunk.chunkIndex,
        metadata: chunk.metadata,
      }));

      // Insert in batches of 50 to avoid payload limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
        const batch = chunkRows.slice(i, i + BATCH_SIZE);
        const { error: chunkError } = await supabase.from('knowledge_chunks').insert(batch);
        if (chunkError) {
          console.error('[Upload] Chunk insert error:', chunkError.message);
          throw new Error(`Failed to insert chunks: ${chunkError.message}`);
        }
      }

      // 6. Update source status
      await supabase
        .from('knowledge_sources')
        .update({ status: 'ready', chunk_count: chunks.length })
        .eq('id', source.id);

      return NextResponse.json({
        sourceId: source.id,
        chunksCreated: chunks.length,
        title: source.title,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Upload] Processing error:', msg);
      await supabase
        .from('knowledge_sources')
        .update({ status: 'failed', error_message: msg })
        .eq('id', source.id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err) {
    console.error('[Upload] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
