/**
 * RAG Document Chunker
 *
 * Splits documents into overlapping chunks for embedding.
 * Supports plain text, HTML-extracted text, and CSV with header context.
 */

const DEFAULT_CHUNK_SIZE = parseInt(process.env.RAG_CHUNK_SIZE || '500', 10);
const DEFAULT_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP || '50', 10);

export interface Chunk {
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

/**
 * Rough token estimation: ~4 chars per token for English.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text by sentence boundaries.
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw.map((s) => s.trim()).filter(Boolean);
}

/**
 * Split text into chunks of approximately `chunkSize` tokens with `overlap` token overlap.
 * Preserves sentence boundaries.
 */
export function chunkText(
  text: string,
  metadata: Record<string, unknown> = {},
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP,
): Chunk[] {
  if (!text || text.trim().length === 0) return [];

  // If the entire text fits in one chunk, return it as-is
  if (estimateTokens(text) <= chunkSize) {
    return [{ content: text.trim(), chunkIndex: 0, metadata }];
  }

  const sentences = splitSentences(text);
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentenceTokens = estimateTokens(sentences[i]);

    // If a single sentence exceeds chunk size, force-split it
    if (sentenceTokens > chunkSize) {
      // Flush current buffer first
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join(' ').trim(),
          chunkIndex: chunkIndex++,
          metadata,
        });
        // Keep overlap from end of current chunk
        const overlapSentences: string[] = [];
        let overlapTokens = 0;
        for (let j = currentChunk.length - 1; j >= 0; j--) {
          const t = estimateTokens(currentChunk[j]);
          if (overlapTokens + t > overlap) break;
          overlapSentences.unshift(currentChunk[j]);
          overlapTokens += t;
        }
        currentChunk = overlapSentences;
        currentTokens = overlapTokens;
      }

      // Character-level split for oversized sentences
      const chars = sentences[i];
      const charChunkSize = chunkSize * 4; // ~4 chars per token
      for (let c = 0; c < chars.length; c += charChunkSize - overlap * 4) {
        const slice = chars.slice(c, c + charChunkSize);
        chunks.push({
          content: slice.trim(),
          chunkIndex: chunkIndex++,
          metadata,
        });
      }
      currentChunk = [];
      currentTokens = 0;
      continue;
    }

    // If adding this sentence would exceed chunk size, flush
    if (currentTokens + sentenceTokens > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join(' ').trim(),
        chunkIndex: chunkIndex++,
        metadata,
      });

      // Keep overlap sentences from end of current chunk
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const t = estimateTokens(currentChunk[j]);
        if (overlapTokens + t > overlap) break;
        overlapSentences.unshift(currentChunk[j]);
        overlapTokens += t;
      }
      currentChunk = overlapSentences;
      currentTokens = overlapTokens;
    }

    currentChunk.push(sentences[i]);
    currentTokens += sentenceTokens;
  }

  // Flush remaining
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join(' ').trim(),
      chunkIndex: chunkIndex++,
      metadata,
    });
  }

  return chunks;
}

/**
 * Chunk CSV content: each row becomes a chunk with header context prepended.
 */
export function chunkCsv(
  csvText: string,
  metadata: Record<string, unknown> = {},
): Chunk[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const chunks: Chunk[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const rowContext = headers
      .map((h, idx) => `${h}: ${values[idx] || 'N/A'}`)
      .join(', ');

    chunks.push({
      content: rowContext,
      chunkIndex: i - 1,
      metadata: { ...metadata, rowIndex: i },
    });
  }

  return chunks;
}
