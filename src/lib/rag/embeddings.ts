/**
 * RAG Embedding Service
 *
 * Uses HuggingFace Inference API with sentence-transformers/all-MiniLM-L6-v2
 * Produces 384-dimensional embeddings for vector similarity search.
 * Free tier available (rate-limited); add HF_API_TOKEN for higher limits.
 * 
 * Fallback: Returns zero embeddings if HuggingFace is unavailable (RAG disabled gracefully)
 */

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL}`;
const EMBEDDING_DIM = 384;

export { EMBEDDING_DIM };

/**
 * Generate a single embedding vector for the given text.
 * Returns zero vector if HuggingFace is unavailable (graceful degradation).
 */
export async function embedText(text: string): Promise<number[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = process.env.HF_API_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // If HuggingFace is loading the model, retry once after a short delay
      if (response.status === 503) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
        console.warn(`[Embeddings] Model loading, retrying in ${retryAfter}s...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        const retry = await fetch(HF_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true, use_cache: false },
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!retry.ok) {
          console.error(`[Embeddings] HuggingFace retry failed: ${retry.status}`);
          return new Array(EMBEDDING_DIM).fill(0); // Graceful fallback
        }
        return retry.json();
      }
      console.error(`[Embeddings] HuggingFace failed: ${response.status}`);
      return new Array(EMBEDDING_DIM).fill(0); // Graceful fallback
    }

    const embedding: number[] = await response.json();

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
      console.error(`[Embeddings] Unexpected shape: expected [${EMBEDDING_DIM}]`);
      return new Array(EMBEDDING_DIM).fill(0); // Graceful fallback
    }

    return embedding;
  } catch (err) {
    // Network error, timeout, or other failure - return zero vector
    console.warn('[Embeddings] Service unavailable, RAG disabled for this session:', err instanceof Error ? err.message : 'Unknown error');
    return new Array(EMBEDDING_DIM).fill(0);
  }
}

/**
 * Generate embeddings for multiple texts in sequence (HuggingFace free tier
 * doesn't support batching, so we call one at a time with a small delay).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    // Small delay to respect rate limits (free tier: ~30 req/min)
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
    const embedding = await embedText(texts[i]);
    results.push(embedding);
  }
  return results;
}
