/**
 * Marsa Tijarah external API client.
 * Queries the Marsa Tijarah Supabase REST API for products, categories, and sellers.
 * Base URL: https://mepxgtzgrtrfvjgjkwcg.supabase.co/rest/v1
 */

const SUPABASE_URL = 'https://mepxgtzgrtrfvjgjkwcg.supabase.co';
const REST_BASE = `${SUPABASE_URL}/rest/v1`;

// Public anon key for read-only access to the Marsa Tijarah marketplace data
const ANON_KEY = process.env.MARSATIJARAH_SUPABASE_ANON_KEY || '';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

if (ANON_KEY) {
  headers['apikey'] = ANON_KEY;
  headers['Authorization'] = `Bearer ${ANON_KEY}`;
}

// ── Types ──────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  slug?: string;
  price?: number;
  price_unit?: string;
  min_order_qty?: number;
  max_order_qty?: number;
  stock_status?: string;
  stock_quantity?: number;
  category_id?: string;
  seller_id?: string;
  status?: string;
  is_featured?: boolean;
  images?: string[];
  tags?: string[];
  specifications?: Record<string, unknown>;
  rating?: number;
  review_count?: number;
  [key: string]: unknown;
}

interface Category {
  id: string;
  name_en?: string;
  name_ar?: string;
  slug?: string;
  description_en?: string;
  description_ar?: string;
  icon?: string;
  parent_id?: string;
  level?: number;
  sort_order?: number;
  is_active?: boolean;
  product_count?: number;
  [key: string]: unknown;
}

interface Seller {
  id: string;
  company_name_en?: string;
  company_name_ar?: string;
  slug?: string;
  description_en?: string;
  description_ar?: string;
  rating?: number;
  review_count?: number;
  is_premium?: boolean;
  verification_status?: string;
  city?: string;
  region?: string;
  categories?: string[];
  [key: string]: unknown;
}

// ── Search Products ────────────────────────────────────────────────────

export async function searchProducts(args: {
  query: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
}): Promise<{ products: Product[]; total: number }> {
  const { query, category, min_price, max_price, limit = 10 } = args;

  // Build Supabase PostgREST query parameters
  const params = new URLSearchParams({
    select: '*',
    status: 'eq.approved',
    is_synthetic: 'eq.false',
    order: 'is_featured.desc',
    limit: String(Math.min(limit, 50)),
  });

  // Text search on name_en, name_ar, and description_en (PostgREST ilike)
  if (query) {
    const q = encodeURIComponent(query);
    params.set('or', `(name_en.ilike.%25${q}%25,name_ar.ilike.%25${q}%25,description_en.ilike.%25${q}%25,tags.cs.{${q}})`);
  }

  if (min_price !== undefined) {
    params.append('price', `gte.${min_price}`);
  }
  if (max_price !== undefined) {
    params.append('price', `lte.${max_price}`);
  }

  const url = `${REST_BASE}/products?${params.toString()}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const text = await res.text();
    console.error('[MarsaTijarah] searchProducts error:', res.status, text);
    return { products: [], total: 0 };
  }

  let products: Product[] = await res.json();

  // Client-side category filter if provided (category_id matching)
  if (category && products.length > 0) {
    // Try to resolve category name to ID first
    const catRes = await fetch(`${REST_BASE}/categories?select=id,name_en,name_ar,slug&name_en.ilike.%25${encodeURIComponent(category)}%25&limit=1`, { headers });
    if (catRes.ok) {
      const cats: Category[] = await catRes.json();
      if (cats.length > 0) {
        products = products.filter((p) => p.category_id === cats[0].id);
      }
    }
  }

  return { products: products.slice(0, limit), total: products.length };
}

// ── Get Categories ─────────────────────────────────────────────────────

export async function getCategories(): Promise<{ categories: Category[] }> {
  const url = `${REST_BASE}/categories?select=*&is_active=eq.true&order=sort_order.asc`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.error('[MarsaTijarah] getCategories error:', res.status);
    return { categories: [] };
  }

  const categories: Category[] = await res.json();
  return { categories };
}

// ── Get Top Sellers ────────────────────────────────────────────────────

export async function getTopSellers(args?: {
  category?: string;
  limit?: number;
}): Promise<{ sellers: Seller[] }> {
  const limit = args?.limit || 5;

  const url = `${REST_BASE}/sellers?select=*&is_premium=eq.true&order=rating.desc&limit=${Math.min(limit, 20)}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.error('[MarsaTijarah] getTopSellers error:', res.status);
    return { sellers: [] };
  }

  const sellers: Seller[] = await res.json();
  return { sellers };
}
