/**
 * RAG File Parser
 *
 * Extracts plain text from uploaded files for chunking and embedding.
 * Supports: PDF, TXT, MD, CSV, DOCX
 */

import mammoth from 'mammoth';

export interface ParsedFile {
  text: string;
  fileName: string;
  mimeType: string;
  pageCount?: number;
}

/**
 * Parse an uploaded file buffer into extractable text.
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<ParsedFile> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'pdf':
      return parsePdf(buffer, fileName);
    case 'docx':
      return parseDocx(buffer, fileName);
    case 'txt':
    case 'md':
    case 'markdown':
      return parsePlainText(buffer, fileName, mimeType);
    case 'csv':
      return parseCsv(buffer, fileName);
    default:
      // Attempt plain text extraction as fallback
      try {
        const text = buffer.toString('utf-8');
        if (text && text.trim().length > 0) {
          return { text, fileName, mimeType: mimeType || 'text/plain' };
        }
      } catch {
        // Not text
      }
      throw new Error(`Unsupported file type: .${ext}. Supported: PDF, TXT, MD, CSV, DOCX`);
  }
}

async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  // Dynamic import to avoid pdf-parse's test file loading during build
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);
  if (!result.text || result.text.trim().length === 0) {
    throw new Error('PDF contains no extractable text (may be image-based)');
  }
  return {
    text: result.text,
    fileName,
    mimeType: 'application/pdf',
    pageCount: result.numpages,
  };
}

async function parseDocx(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value || result.value.trim().length === 0) {
    throw new Error('DOCX contains no extractable text');
  }
  return {
    text: result.value,
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

function parsePlainText(buffer: Buffer, fileName: string, mimeType: string): ParsedFile {
  const text = buffer.toString('utf-8');
  if (!text || text.trim().length === 0) {
    throw new Error('File contains no text');
  }
  return {
    text,
    fileName,
    mimeType: mimeType || 'text/plain',
  };
}

function parseCsv(buffer: Buffer, fileName: string): ParsedFile {
  const text = buffer.toString('utf-8');
  if (!text || text.trim().length === 0) {
    throw new Error('CSV file is empty');
  }
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  return {
    text,
    fileName,
    mimeType: 'text/csv',
  };
}
