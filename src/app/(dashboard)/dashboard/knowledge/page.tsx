'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Trash2, Globe, Upload, FileText, Link2, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { useBusinessStore } from '@/store/business';
import { getSources, deleteSource, uploadFile, scrapeUrl as scrapeUrlApi, type KnowledgeSource } from '@/services/knowledge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function KnowledgePage() {
  const { business } = useBusinessStore();
  const toast = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Scrape modal state
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false);
  const [scrapeUrlInput, setScrapeUrlInput] = useState('');
  const [scrapeDepth, setScrapeDepth] = useState('1');
  const [scraping, setScraping] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business) { setLoading(false); return; }
    setLoading(true);
    try {
      setSources(await getSources(business.id));
    } catch {
      toast.error('Failed to load knowledge sources');
    } finally {
      setLoading(false);
    }
  }, [business, toast]);

  useEffect(() => { load(); }, [load]);

  const handleScrape = async () => {
    if (!business || !scrapeUrlInput) return;
    setScraping(true);
    try {
      const result = await scrapeUrlApi(business.id, scrapeUrlInput, parseInt(scrapeDepth, 10));
      toast.success(`Scraped ${result.pagesScraped} page(s), ${result.chunksCreated} chunks created`);
      setScrapeModalOpen(false);
      setScrapeUrlInput('');
      setScrapeDepth('1');
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Scraping failed', msg);
    } finally {
      setScraping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!business || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    setUploading(true);

    for (const file of files) {
      try {
        const result = await uploadFile(business.id, file);
        toast.success(`${file.name}: ${result.chunksCreated} chunks created`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to upload ${file.name}`, msg);
      }
    }

    setUploading(false);
    e.target.value = '';
    load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success('Knowledge source deleted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to delete source', msg);
    } finally {
      setDeletingId(null);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: KnowledgeSource['status']) => {
    switch (status) {
      case 'ready': return <Badge variant="green">Ready</Badge>;
      case 'processing': return <Badge variant="blue">Processing</Badge>;
      case 'pending': return <Badge variant="gray">Pending</Badge>;
      case 'failed': return <Badge variant="red">Failed</Badge>;
    }
  };

  const getSourceIcon = (type: KnowledgeSource['source_type']) => {
    switch (type) {
      case 'url': return <Link2 className="w-4 h-4" style={{ color: '#60a5fa' }} />;
      case 'file': return <FileText className="w-4 h-4" style={{ color: '#a78bfa' }} />;
      case 'manual': return <BookOpen className="w-4 h-4" style={{ color: '#4ade80' }} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Actions Card */}
      <Card>
        <CardHeader
          title="Knowledge Base"
          description="Manage documents and web content for AI-powered RAG search"
          action={
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.1)'; }}
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload File'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,.docx"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <Button icon={<Globe className="w-4 h-4" />} onClick={() => setScrapeModalOpen(true)}>
                Scrape URL
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-5 h-5" />}
            title="No knowledge sources yet"
            description="Upload documents or scrape web pages to build your AI knowledge base. The AI will use this data to answer customer questions accurately."
            action={{ label: 'Scrape URL', onClick: () => setScrapeModalOpen(true) }}
          />
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer transition-colors duration-100"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onClick={() => setExpanded(expanded === source.id ? null : source.id)}
                >
                  {getSourceIcon(source.source_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium truncate" style={{ color: '#e2e8f0' }}>
                        {source.title}
                      </span>
                      {getStatusBadge(source.status)}
                      <Badge variant="gray">{source.chunk_count} chunks</Badge>
                    </div>
                    {source.source_url && (
                      <div className="text-[11px] mt-0.5 truncate" style={{ color: '#475569' }}>{source.source_url}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                      onClick={(e) => { e.stopPropagation(); setDeleteId(source.id); }}
                    />
                    {expanded === source.id
                      ? <ChevronUp className="w-4 h-4 ml-1" style={{ color: '#3d5060' }} />
                      : <ChevronDown className="w-4 h-4 ml-1" style={{ color: '#3d5060' }} />
                    }
                  </div>
                </div>
                {expanded === source.id && (
                  <div className="px-11 pb-4 text-[13px] leading-relaxed" style={{ color: '#64748b', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="pt-3 space-y-2">
                      <div><span className="font-medium" style={{ color: '#94a3b8' }}>Type:</span> {source.source_type}</div>
                      <div><span className="font-medium" style={{ color: '#94a3b8' }}>Chunks:</span> {source.chunk_count}</div>
                      <div><span className="font-medium" style={{ color: '#94a3b8' }}>Created:</span> {new Date(source.created_at).toLocaleDateString()}</div>
                      {source.error_message && (
                        <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#f87171' }} />
                          <span style={{ color: '#f87171' }}>{source.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card>
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e2e8f0' }}>
            <RefreshCw className="w-4 h-4" style={{ color: '#60a5fa' }} />
            How RAG Works
          </h3>
          <div className="text-[13px] leading-relaxed space-y-2" style={{ color: '#64748b' }}>
            <p>
              When customers ask questions, the AI searches your knowledge base using <strong style={{ color: '#94a3b8' }}>hybrid search</strong> — combining semantic similarity (meaning) with keyword matching (exact terms).
            </p>
            <p>
              Documents are split into ~500-token chunks with overlap for context continuity. Each chunk is converted to a vector embedding for fast similarity search.
            </p>
            <p>
              <strong style={{ color: '#94a3b8' }}>Supported formats:</strong> PDF, TXT, MD, CSV, DOCX. Web scraping supports any HTML page.
            </p>
          </div>
        </div>
      </Card>

      {/* Scrape Modal */}
      <Modal isOpen={scrapeModalOpen} onClose={() => setScrapeModalOpen(false)} title="Scrape Web Page" size="lg">
        <div className="space-y-4">
          <Input
            label="URL"
            placeholder="https://example.com/about"
            value={scrapeUrlInput}
            onChange={(e) => setScrapeUrlInput(e.target.value)}
            required
          />
          <Select
            label="Crawl Depth"
            value={scrapeDepth}
            onChange={(e) => setScrapeDepth(e.target.value)}
            options={[
              { value: '0', label: 'Single page only' },
              { value: '1', label: '1 level deep (linked pages)' },
              { value: '2', label: '2 levels deep' },
              { value: '3', label: '3 levels deep (max)' },
            ]}
          />
          <p className="text-[12px]" style={{ color: '#64748b' }}>
            The scraper will extract text content, split it into chunks, and generate vector embeddings for semantic search.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setScrapeModalOpen(false)}>Cancel</Button>
            <Button loading={scraping} onClick={handleScrape} disabled={!scrapeUrlInput}>
              <Globe className="w-4 h-4 mr-1.5" />
              Start Scraping
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Knowledge Source" size="sm">
        <p className="text-[13px] mb-5" style={{ color: '#94a3b8' }}>
          This will permanently delete this knowledge source and all its chunks. The AI will no longer use this data to answer questions.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" loading={deletingId === deleteId} onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
