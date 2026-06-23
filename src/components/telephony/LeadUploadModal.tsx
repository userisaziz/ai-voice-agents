'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LeadUploadModalProps {
  campaignId: string;
  onUpload: (file: File) => Promise<{ created: number; errors: string[] }>;
  onClose: () => void;
}

export function LeadUploadModal({ onUpload, onClose }: LeadUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const res = await onUpload(file);
      setResult(res);
    } catch (err) {
      setResult({ created: 0, errors: [err instanceof Error ? err.message : 'Upload failed'] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200"
        style={{
          borderColor: dragOver ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)',
          background: dragOver ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8" style={{ color: '#4ade80' }} />
            <div className="text-left">
              <div className="text-[13px] font-semibold" style={{ color: '#e2e8f0' }}>{file.name}</div>
              <div className="text-[11px]" style={{ color: '#3d5060' }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: '#3d5060' }} />
            <div className="text-[13px] font-semibold mb-1" style={{ color: '#e2e8f0' }}>
              Drop your CSV file here
            </div>
            <div className="text-[11px] mb-4" style={{ color: '#3d5060' }}>
              or click to browse
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <span className="inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-150 rounded-lg cursor-pointer px-2.5 py-1.5 text-[12px]"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                Select CSV File
              </span>
            </label>
          </>
        )}
      </div>

      <div className="p-3 rounded-lg text-[11px]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="font-semibold mb-2" style={{ color: '#e2e8f0' }}>CSV Format Requirements:</div>
        <ul className="space-y-1" style={{ color: '#94a3b8' }}>
          <li>Required columns: <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>name</code>, <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>phone</code></li>
          <li>Optional columns: <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>email</code></li>
          <li>Phone numbers should include country code (e.g., +1234567890)</li>
        </ul>
      </div>

      {result && (
        <div className="space-y-2">
          {result.created > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
              <span className="text-[12px]" style={{ color: '#4ade80' }}>{result.created} leads imported successfully</span>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" style={{ color: '#f87171' }} />
                <span className="text-[12px] font-semibold" style={{ color: '#f87171' }}>Errors</span>
              </div>
              <ul className="space-y-1 text-[11px]" style={{ color: '#f87171' }}>
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button loading={uploading} disabled={!file} onClick={handleUpload}>
            Upload Leads
          </Button>
        )}
      </div>
    </div>
  );
}
