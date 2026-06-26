/**
 * RAG Web Scraper
 *
 * Scrapes web pages using Cheerio + native fetch.
 * Extracts main content, strips navigation/scripts/ads.
 * Supports single-page and recursive crawl (with depth limit).
 */

import * as cheerio from 'cheerio';

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
}

const RATE_LIMIT_MS = 1000; // 1 request per second
const MAX_PAGES = 50;

// Tags to remove (navigation, ads, footers, etc.)
const REMOVE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe',
  'nav', 'header', 'footer',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.nav', '.navbar', '.navigation', '.menu', '.sidebar',
  '.footer', '.header', '.cookie', '.popup', '.modal', '.ad', '.ads',
  '#nav', '#navbar', '#sidebar', '#footer', '#header',
];

/**
 * Scrape a single URL and extract clean text content.
 */
async function scrapePage(url: string): Promise<ScrapedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VoiceDeskBot/1.0; +https://voicedesk.ai)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[Scraper] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Skip non-HTML resources
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || url;

    // Remove unwanted elements
    for (const selector of REMOVE_SELECTORS) {
      $(selector).remove();
    }

    // Try to find main content area
    const mainContent =
      $('main').text() ||
      $('article').text() ||
      $('[role="main"]').text() ||
      $('.content').text() ||
      $('#content').text() ||
      $('body').text();

    // Clean up whitespace
    const text = mainContent
      .replace(/\s+/g, ' ')
      .replace(new RegExp('\\n\\s*\\n', 'g'), '\n\n')
      .trim();

    if (!text || text.length < 50) {
      return null;
    }

    return { url, title, text };
  } catch (err) {
    console.warn(`[Scraper] Error scraping ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Extract internal links from a page.
 */
function extractInternalLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const link = new URL(href, baseUrl);
      // Only follow links on the same domain
      if (link.hostname === base.hostname && link.pathname !== base.pathname) {
        // Remove hash fragments to avoid duplicates
        link.hash = '';
        links.push(link.toString());
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(links)]; // Deduplicate
}

/**
 * Scrape a URL with optional recursive crawling.
 * @param startUrl - The URL to start scraping from
 * @param maxDepth - Maximum crawl depth (0 = single page only)
 * @param onProgress - Optional callback for progress updates
 */
export async function scrapeUrl(
  startUrl: string,
  maxDepth: number = 0,
  onProgress?: (pagesScraped: number, currentUrl: string) => void,
): Promise<ScrapedPage[]> {
  const visited = new Set<string>();
  const results: ScrapedPage[] = [];
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];

  while (queue.length > 0 && results.length < MAX_PAGES) {
    const { url, depth } = queue.shift()!;

    if (visited.has(url)) continue;
    visited.add(url);

    // Rate limiting
    if (results.length > 0) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }

    onProgress?.(results.length, url);

    const page = await scrapePage(url);
    if (page) {
      results.push(page);

      // Crawl deeper if within depth limit
      if (depth < maxDepth) {
        try {
          const html = await (await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoiceDeskBot/1.0)' },
            signal: AbortSignal.timeout(10000),
          })).text();
          const $ = cheerio.load(html);
          const links = extractInternalLinks($, url);

          for (const link of links) {
            if (!visited.has(link) && queue.length < MAX_PAGES) {
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        } catch {
          // Failed to extract links, continue with what we have
        }
      }
    }
  }

  return results;
}
