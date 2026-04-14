/**
 * List page parser - parses manga listings from /lista and search results
 * @module scraper/parsers/list-parser
 */

import * as cheerio from 'cheerio';
import type { Manga, MangaListFilters, PaginatedResult, MangaType } from '../../types/manga.js';
import { BASE_URL, PATHS, SORT_ORDERS } from '../../constants/index.js';
import { extractMangaFromUrl, parseRatingFromRel, normalizeMangaType, parseSiteDate } from '../../utils/helpers.js';

/**
 * Parse manga items from list HTML
 * @param html - Raw HTML string from list page
 * @returns Array of parsed Manga objects
 */
export function parseMangaList(html: string): Manga[] {
  const $ = cheerio.load(html);
  const mangaList: Manga[] = [];

  // Main container: .listupd
  const $container = $('.listupd');
  
  if ($container.length === 0) {
    return mangaList;
  }

  // Each manga card: .bs .bsx a
  $container.find('.bs .bsx a').each((_, element) => {
    const $el = $(element);
    const $bsx = $el; // The anchor is the .bsx element in this structure

    // href -> extract id and slug
    const href = $bsx.attr('href') ?? '';
    const extracted = extractMangaFromUrl(href);
    if (!extracted) return;

    const { id, slug } = extracted;

    // Title from .tt
    const title = $bsx.find('.tt').text().trim() 
      || $bsx.find('img').attr('alt')?.trim()
      || '';

    // Cover from .limit img src
    const coverUrl = $bsx.find('.limit img').attr('src') ?? '';

    // Type from .limit .type (e.g., "Manga", "MANHWA", "Manhua")
    const typeText = $bsx.find('.limit .type').text().trim();
    const type: MangaType = normalizeMangaType(typeText);

    // ERO flag from .limit .hot (contains "+18")
    const isEro = $bsx.find('.limit .hot').text().includes('+18');

    // Update date from .epxdate
    const latestUpdateRaw = $bsx.find('.epxdate').text().trim();
    const latestUpdate = parseSiteDate(latestUpdateRaw);

    // Rating from .star_bar rel attribute JSON: {"numStar":5,"manga_id":36031}
    const relJson = $bsx.find('.star_bar').attr('rel') ?? '{}';
    const { rating } = parseRatingFromRel(relJson);
    // ratingCount is not available in list view, default to 0
    const ratingCount = 0;

    // Full URL
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
 * @param html - Raw HTML string
 * @returns Pagination info object
 */
export function parsePagination(html: string): { page: number; totalPages: number; totalItems: number } {
  const $ = cheerio.load(html);

  // Current page: .pagination .current or .page-numbers.current
  const currentPageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const currentPageMatch = currentPageText.match(/\d+/);
  const currentPage = currentPageMatch ? parseInt(currentPageMatch[0], 10) : 1;

  // Total pages: last .page-numbers that is a number (not "next" or "»")
  const pageNumbers: string[] = [];
  $('.pagination .page-numbers, .pagination a.page-numbers').each((_, el) => {
    const text = $(el).text().trim();
    if (/^\d+$/.test(text)) {
      pageNumbers.push(text);
    }
  });
  const lastPageText = pageNumbers[pageNumbers.length - 1];
  const lastPageNum = lastPageText ? parseInt(lastPageText, 10) : 1;
  const totalPages = lastPageNum || 1;

  // Total items: not directly available, estimate from items on page
  // We'll compute this from the manga list in parseMangaListResult
  const totalItems = 0; // Will be overridden in parseMangaListResult

  return { page: currentPage, totalPages, totalItems };
}

/**
 * Parse full paginated result from list HTML
 * @param html - Raw HTML string
 * @param filters - Optional filters used for the query
 * @returns Paginated result with manga items
 */
export function parseMangaListResult(html: string, filters?: MangaListFilters): PaginatedResult<Manga> {
  const items = parseMangaList(html);
  const pagination = parsePagination(html);
  const page = filters?.page ?? pagination.page;

  // Estimate total items: items.length * totalPages (approximate)
  const estimatedTotalItems = items.length * (pagination.totalPages || 1);

  return {
    items,
    page,
    totalPages: pagination.totalPages || 1,
    totalItems: items.length > 0 ? estimatedTotalItems : 0,
    hasNextPage: page < (pagination.totalPages || 1),
  };
}

/**
 * Build a manga list URL with optional filters
 * @param filters - Optional filter criteria
 * @returns Full list URL with query parameters
 */
export function buildListUrl(filters?: MangaListFilters): string {
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

  // Handle pagination
  if (filters?.page && filters.page > 1) {
    params.set('page', filters.page.toString());
  }

  const queryString = params.toString();
  return queryString ? `${PATHS.LIST}?${queryString}` : PATHS.LIST;
}

/**
 * Check if this parser can handle the given URL
 * @param url - URL to check
 * @returns True if URL is a list page
 */
export function canParse(url: string): boolean {
  return url.includes('/lista') || url.includes('/actualizado') || url === BASE_URL || url === `${BASE_URL}/`;
}
