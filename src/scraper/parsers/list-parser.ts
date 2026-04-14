/**
 * List page parser - parses manga listings from /lista and search results
 * @module scraper/parsers/list-parser
 */

import * as cheerio from 'cheerio';
import type { Manga, MangaListFilters, PaginatedResult, MangaType, Genre } from '../../types/manga.js';
import { BASE_URL, PATHS, SORT_ORDERS } from '../../constants/index.js';

/**
 * Parse a manga type string to MangaType
 */
function parseMangaType(typeStr: string): MangaType {
  const normalized = typeStr.trim().toUpperCase().replace(/\s+/g, '-');
  const typeMap: Record<string, MangaType> = {
    'MANGA': 'Manga',
    'MANHWA': 'MANHWA',
    'MANHUA': 'Manhua',
    'ONE-SHOT': 'One-Shot',
    'DOUJINSHI': 'Doujinshi',
    'OEL': 'Oel',
    'NOVELA': 'Novela',
    'ONE SHOT': 'ONE SHOT',
  };
  return typeMap[normalized] ?? 'Manga';
}

/**
 * Check if text indicates 18+ content
 */
function parseIsEro(text: string): boolean {
  return text.includes('+') || text.toLowerCase().includes('ero');
}

/**
 * Parse rating from text
 */
function parseRating(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match?.[1] ? parseFloat(match[1]) : 0;
}

/**
 * Build query string from filters
 */
export function buildListUrl(filters?: MangaListFilters): string {
  const params = new URLSearchParams();
  
  if (filters?.genre && filters.genre.length > 0) {
    filters.genre.forEach(g => params.append('g', g));
  }
  if (filters?.type && filters.type.length > 0) {
    filters.type.forEach(t => params.append('type', t));
  }
  if (filters?.demographic) {
    params.set('demographic', filters.demographic);
  }
  if (filters?.sort && filters.sort !== SORT_ORDERS.LATEST) {
    params.set('order', filters.sort);
  }
  if (filters?.page && filters.page > 1) {
    params.set('page', filters.page.toString());
  }

  const queryString = params.toString();
  return queryString ? `${PATHS.LIST}?${queryString}` : PATHS.LIST;
}

/**
 * Parse manga items from list HTML
 */
export function parseMangaList(html: string): Manga[] {
  const $ = cheerio.load(html);
  const mangaList: Manga[] = [];

  // Common list container selectors to try
  const containerSelectors = [
    '.manga-list',
    '.list-manga',
    '.manga-items',
    '.manga-listado',
    '[class*="manga-list"]',
    '[class*="manga-item"]',
  ];

  let $container: cheerio.Cheerio | null = null;
  for (const selector of containerSelectors) {
    if ($(selector).length > 0) {
      $container = $(selector);
      break;
    }
  }

  if (!$container) {
    // Try to find manga items directly
    const itemSelectors = [
      '.manga-item',
      '.manga-card',
      '.list-item',
      '[class*="manga"]',
    ];

    for (const selector of itemSelectors) {
      if ($(selector).length > 0) {
        $container = $(selector).parent();
        break;
      }
    }
  }

  if (!$container) {
    return mangaList;
  }

  $container.find('a').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href') ?? '';
    
    // Parse manga ID and slug from URL like /manga/123/slug
    const match = href.match(/\/manga\/(\d+)\/([^/]+)/);
    if (!match?.[1]) return;

    const id = parseInt(match[1], 10);
    const slug = match[2] ?? '';
    
    // Extract title from alt or text
    const title = $el.find('img').attr('alt') 
      ?? $el.find('.title').text().trim()
      ?? $el.text().trim()
      ?? '';
    
    const coverUrl = $el.find('img').attr('src') ?? '';
    
    // Extract type
    const typeText = $el.find('.type, .badge, [class*="type"]').text().trim() || 'Manga';
    const type = parseMangaType(typeText);
    
    // Extract update date
    const latestUpdate = $el.find('.update, .date, [class*="update"]').text().trim() || '';
    
    // Extract rating
    const ratingText = $el.find('.rating, [class*="rating"]').text().trim() || '0';
    const rating = parseRating(ratingText);
    
    // Extract rating count
    const ratingCountText = $el.find('.votes, [class*="votes"]').text().trim() || '0';
    const ratingCountMatch = ratingCountText.match(/(\d+)/);
    const ratingCount = ratingCountMatch ? parseInt(ratingCountMatch[1] ?? '0', 10) : 0;
    
    // Check for 18+ marker
    const isEro = parseIsEro($el.find('.ero, [class*="ero"]').text() || '') 
      || parseIsEro(typeText);
    
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    mangaList.push({
      id,
      slug,
      title,
      type,
      coverUrl,
      latestUpdate,
      rating,
      ratingCount,
      isEro,
      url,
    });
  });

  return mangaList;
}

/**
 * Parse pagination info from list HTML
 */
export function parsePagination(html: string): { page: number; totalPages: number; totalItems: number } {
  const $ = cheerio.load(html);
  
  // Try to find pagination info
  const pageText = $('.pagination .active, .page-current, [class*="active"]').text().trim() || '';
  const pageMatch = pageText.match(/\d+/);
  const currentPage = pageMatch ? parseInt(pageMatch[0] ?? '1', 10) : 1;
  
  // Try to find total pages
  const totalPagesText = $('.pagination a:last, .page-total, [class*="total-pages"]').text().trim() || '';
  const totalPagesMatch = totalPagesText.match(/\d+/g);
  const lastPageMatch = totalPagesMatch?.[totalPagesMatch.length - 1];
  const totalPages = lastPageMatch ? parseInt(lastPageMatch, 10) : 1;
  
  // Try to find total items
  const totalItemsText = $('.pagination .total, [class*="total-items"]').text().trim() || '';
  const totalItemsMatch = totalItemsText.match(/\d+/);
  const totalItems = totalItemsMatch ? parseInt(totalItemsMatch[0] ?? '0', 10) : 0;

  return { page: currentPage, totalPages, totalItems };
}

/**
 * Parse full paginated result from list HTML
 */
export function parseMangaListResult(html: string, filters?: MangaListFilters): PaginatedResult<Manga> {
  const items = parseMangaList(html);
  const pagination = parsePagination(html);
  const page = filters?.page ?? pagination.page;

  return {
    items,
    page,
    totalPages: pagination.totalPages || 1,
    totalItems: pagination.totalItems || items.length,
    hasNextPage: page < (pagination.totalPages || 1),
  };
}

/**
 * Check if this parser can handle the given URL
 */
export function canParse(url: string): boolean {
  return url.includes('/lista') || url.includes('/actualizado') || url === BASE_URL || url === `${BASE_URL}/`;
}
