/**
 * Utility helper functions
 * @module utils/helpers
 */

import { BASE_URL, PATHS, SORT_ORDERS } from '../constants/index.js';
import type { MangaListFilters } from '../types/manga.js';

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize a string for comparison (lowercase, trim, collapse spaces)
 * @param str - String to normalize
 * @returns Normalized string
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract numeric ID from a path or URL
 * @param input - URL or path containing an ID
 * @param pattern - Regex pattern with capture group for the ID
 * @returns The extracted ID as a number, or null if not found
 */
export function extractId(input: string, pattern: RegExp): number | null {
  const match = input.match(pattern);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

/**
 * Slugify a string for URL use
 * @param text - Text to slugify
 * @returns URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Parse a date string from the site
 * Supports formats like "Hace 2 horas", "Ayer", "2024-01-15"
 * @param dateStr - Date string to parse
 * @returns ISO date string or original if parsing fails
 */
export function parseSiteDate(dateStr: string): string {
  const normalized = normalizeString(dateStr);
  
  // "Hace X horas"
  const hoursMatch = normalized.match(/hace\s+(\d+)\s+horas?/);
  if (hoursMatch?.[1]) {
    const hours = parseInt(hoursMatch[1], 10);
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  }
  
  // "Ayer"
  if (normalized === 'ayer') {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }
  
  // "Hace X dias"
  const daysMatch = normalized.match(/hace\s+(\d+)\s+dias?/);
  if (daysMatch?.[1]) {
    const days = parseInt(daysMatch[1], 10);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
  
  // Try parsing as ISO date
  const isoMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch?.[1]) {
    return new Date(isoMatch[1]).toISOString();
  }
  
  // Return original if can't parse
  return dateStr;
}

/**
 * Validate that a URL is from the expected domain
 * @param url - URL to validate
 * @param allowedDomains - Array of allowed domain patterns
 * @returns True if URL is from an allowed domain
 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  
  throw lastError ?? new Error('All retry attempts failed');
}

/**
 * Safely parse JSON with a fallback
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * Chunk an array into smaller arrays
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicate objects from an array by a key function
 * @param array - Array to deduplicate
 * @param keyFn - Function to extract the key for comparison
 * @returns Deduplicated array
 */
export function deduplicateByKey<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Extract manga ID and slug from a manga URL.
 * @param url - Full URL or path like 'https://mangatv.net/manga/36031/peque-o-hongo'
 * @returns Object with id and slug, or null if URL doesn't match expected format
 */
export function extractMangaFromUrl(url: string): { id: number; slug: string } | null {
  const match = url.match(/\/manga\/(\d+)\/([^/?#]+)/);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const id = parseInt(match[1], 10);
  const slug = match[2];
  if (isNaN(id) || id <= 0) {
    return null;
  }
  return { id, slug };
}

/**
 * Parse rating data from the rel attribute JSON of .star_bar element.
 * The rel attribute contains JSON like: {"numStar":5,"manga_id":36031}
 * @param relJson - JSON string from rel attribute
 * @returns Object with rating (0-5) and mangaId, or fallback values
 */
export function parseRatingFromRel(relJson: string): { rating: number; mangaId: number } {
  const parsed = safeJsonParse<{ numStar?: number; manga_id?: number }>(relJson, { numStar: 0, manga_id: 0 });
  return {
    rating: parsed.numStar ?? 0,
    mangaId: parsed.manga_id ?? 0,
  };
}

/**
 * Extract chapter number from a chapter title or URL text.
 * Handles formats like "Capítulo 45.5", "Cap 100", "Extra 1", "Chapter 10"
 * @param text - Text containing chapter number
 * @returns Extracted chapter number as string, or empty string if not found
 */
export function extractChapterNumber(text: string): string {
  // Match patterns like "Capítulo 45.5", "Cap 100", "Chapter 10", "Extra 1"
  const patterns = [
    /(?:cap[ií]tulo|cap|chapter|extra)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)/,  // Fallback: just match any number (possibly with decimal)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
}

/**
 * Type mapping for manga types from the site
 */
const MANGA_TYPE_MAP: Record<string, import('../types/manga.js').MangaType> = {
  'manga': 'Manga',
  'manhwa': 'MANHWA',
  'manhua': 'Manhua',
  'one-shot': 'One-Shot',
  'one shot': 'One-Shot',
  'doujinshi': 'Doujinshi',
  'oel': 'Oel',
  'novela': 'Novela',
};

/**
 * Normalize a manga type string to the MangaType enum.
 * @param type - Raw type string from the site (e.g., "MANHWA", "Manhwa", "manga")
 * @returns Normalized MangaType, or 'Manga' as fallback
 */
export function normalizeMangaType(type: string): import('../types/manga.js').MangaType {
  const normalized = type.toLowerCase().trim();
  const mapped = MANGA_TYPE_MAP[normalized];
  return mapped ?? 'Manga';
}

/**
 * Build a manga list URL with optional filters and pagination.
 * Handles search queries with the 's' parameter.
 * @param filters - Optional filter criteria including searchQuery
 * @param page - Page number override (if different from filters.page)
 * @returns Full list URL with query parameters
 */
export function buildListUrl(filters?: MangaListFilters, page?: number): string {
  const params = new URLSearchParams();

  // Handle search query (uses 's' parameter)
  if (filters?.searchQuery) {
    params.set('s', filters.searchQuery);
  }

  // Handle genre filters
  if (filters?.genre && filters.genre.length > 0) {
    filters.genre.forEach(g => params.append('g', g));
  }

  // Handle type filters
  if (filters?.type && filters.type.length > 0) {
    filters.type.forEach(t => params.append('type', t));
  }

  // Handle demographic filter
  if (filters?.demographic) {
    params.set('demographic', filters.demographic);
  }

  // Handle sort order
  if (filters?.sort && filters.sort !== SORT_ORDERS.LATEST) {
    params.set('order', filters.sort);
  }

  // Handle pagination - use explicit page parameter or fallback to filters.page
  const pageNum = page ?? filters?.page;
  if (pageNum && pageNum > 1) {
    params.set('page', pageNum.toString());
  }

  const queryString = params.toString();
  return queryString ? `${BASE_URL}${PATHS.LIST}?${queryString}` : `${BASE_URL}${PATHS.LIST}`;
}
