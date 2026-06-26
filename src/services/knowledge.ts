/**
 * Knowledge Base Client Service
 *
 * Used by the admin panel to manage knowledge sources.
 */

export interface KnowledgeSource {
  id: string;
  business_id: string;
  source_type: 'url' | 'file' | 'manual';
  source_url: string | null;
  file_name: string | null;
  title: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const BASE = '/api/knowledge';

export async function getSources(businessId: string): Promise<KnowledgeSource[]> {
  const res = await fetch(`${BASE}/sources?businessId=${encodeURIComponent(businessId)}`);
  if (!res.ok) throw new Error('Failed to load knowledge sources');
  const data = await res.json();
  return data.sources || [];
}

export async function deleteSource(sourceId: string): Promise<void> {
  const res = await fetch(`${BASE}/sources?sourceId=${encodeURIComponent(sourceId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete source');
}

export async function uploadFile(
  businessId: string,
  file: File,
): Promise<{ sourceId: string; chunksCreated: number; title: string }> {
  const formData = new FormData();
  formData.append('businessId', businessId);
  formData.append('file', file);

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function scrapeUrl(
  businessId: string,
  url: string,
  maxDepth: number = 1,
): Promise<{ sourceId: string; pagesScraped: number; chunksCreated: number; title: string }> {
  const res = await fetch(`${BASE}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessId, url, maxDepth }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Scrape failed');
  return data;
}
