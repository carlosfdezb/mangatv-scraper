/**
 * MangaTV Scraper - Main scraper class
 * @module scraper/manga-tv-scraper
 */

import { HttpClient, createHttpClient } from './http/client.js';
import { parseMangaListResult, parseMangaDetail, parseChapterPages } from './parsers/index.js';
import { buildListUrl } from '../utils/helpers.js';
import { BASE_URL, PATHS, buildMangaUrl } from '../constants/index.js';
import type { 
  ScraperConfig,
  MangaListFilters,
  Manga,
  MangaDetail,
  PaginatedResult,
  ChapterPages,
  MangaDetailOptions,
} from '../types/index.js';
import { ScraperError } from '../types/scraper.js';

const HASH_REGEX = /^[a-zA-Z0-9]+$/;

/**
 * Main scraper class for MangaTV
 */
export class MangaTVScraper {
  private readonly client: HttpClient;
  private readonly baseUrl: string;

  /**
   * Create a new MangaTV scraper instance
   * @param config - Optional configuration
   */
  constructor(config: ScraperConfig = {}) {
    this.client = createHttpClient(config);
    this.baseUrl = config.baseUrl ?? BASE_URL;
  }

  /**
   * Get the HTTP client (for advanced use)
   */
  getClient(): HttpClient {
    return this.client;
  }

  /**
   * Set Cloudflare clearance cookie for subsequent requests
   * @param cookie - The cf_clearance cookie value
   */
  setCfCookie(cookie: string): void {
    this.client.setCfCookie(cookie);
  }

  /**
   * Fetch and parse HTML from a URL
   * @param url - URL to fetch
   * @returns HTML content
   */
  private async fetchHtml(url: string): Promise<string> {
    const response = await this.client.get(url);
    if (typeof response.data !== 'string') {
      throw new Error('Expected string HTML response');
    }
    return response.data;
  }

  /**
   * List manga with optional filters
   * @param filters - Optional filter criteria
   * @returns Paginated list of manga
   */
  async listManga(filters?: MangaListFilters): Promise<PaginatedResult<Manga>> {
    try {
      const url = buildListUrl(filters);
      const html = await this.fetchHtml(url);
      return parseMangaListResult(html, filters);
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      throw new ScraperError(
        `Failed to fetch manga list: ${error instanceof Error ? error.message : String(error)}`,
        buildListUrl(filters),
        undefined,
        true
      );
    }
  }

  /**
   * Search manga by query
   * @param query - Search term
   * @param page - Page number (default: 1)
   * @returns Paginated search results
   */
  async searchManga(query: string, page?: number): Promise<PaginatedResult<Manga>> {
    if (!query?.trim()) {
      throw new ScraperError('Search query cannot be empty', `${BASE_URL}${PATHS.LIST}`);
    }

    const filters: MangaListFilters = {
      searchQuery: query.trim(),
      page: page ?? 1,
    };

    try {
      const url = buildListUrl(filters);
      const html = await this.fetchHtml(url);
      return parseMangaListResult(html, filters);
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      throw new ScraperError(
        `Failed to search manga: ${error instanceof Error ? error.message : String(error)}`,
        buildListUrl(filters),
        undefined,
        true
      );
    }
  }

  /**
   * Get recently updated manga
   * @param page - Page number (default: 1)
   * @returns Paginated list of recently updated manga
   */
  async getLatestUpdates(page?: number): Promise<PaginatedResult<Manga>> {
    const pageParam = page && page > 1 ? `?page=${page}` : '';
    const url = `${this.baseUrl}${PATHS.UPDATED}${pageParam}`;

    try {
      const html = await this.fetchHtml(url);
      return parseMangaListResult(html, { page: page ?? 1 });
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      throw new ScraperError(
        `Failed to fetch latest updates: ${error instanceof Error ? error.message : String(error)}`,
        url,
        undefined,
        true
      );
    }
  }

  /**
   * Get manga details by ID
   * @param id - Manga ID
   * @param options - Optional settings for chapter ordering and grouping
   * @returns Full manga details
   */
  async getMangaDetail(
    id: number, 
    options?: MangaDetailOptions
  ): Promise<MangaDetail> {
    if (!id || id <= 0) {
      throw new ScraperError(`Invalid manga ID: ${id}`, '');
    }

    const url = buildMangaUrl(id);

    try {
      const html = await this.fetchHtml(url);
      return parseMangaDetail(html, url, options);
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      // Check if it's a 404
      const statusCode = error instanceof Error && error.message.includes('status code 404') ? 404 : undefined;
      throw new ScraperError(
        `Failed to fetch manga detail: ${error instanceof Error ? error.message : String(error)}`,
        url,
        statusCode,
        statusCode === 404 ? false : true
      );
    }
  }

  /**
   * Get a random manga
   * @returns Full manga details of a random manga
   */
  async getRandomManga(): Promise<MangaDetail> {
    const url = `${this.baseUrl}${PATHS.RANDOM}`;

    try {
      const response = await this.client.get(url);
      const finalUrl = response.url; // follows redirect automatically
      const html = response.data;

      if (typeof html !== 'string') {
        throw new ScraperError('Expected string HTML response', url);
      }

      return parseMangaDetail(html, finalUrl);
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      throw new ScraperError(
        `Failed to fetch random manga: ${error instanceof Error ? error.message : String(error)}`,
        url,
        undefined,
        true
      );
    }
  }

  /**
   * Get chapter pages (image URLs) from a chapter hash
   * @param hash - Chapter hash from a /leer/{hash} URL (e.g., "b35a0970901f4f")
   * @returns ChapterPages with all decoded image URLs
   * @throws {ScraperError} When hash is invalid, empty, or chapter content cannot be extracted
   */
  async getChapterPages(hash: string): Promise<ChapterPages> {
    if (!hash?.trim()) {
      throw new ScraperError('Hash cannot be empty', '');
    }

    if (!HASH_REGEX.test(hash.trim())) {
      throw new ScraperError(
        `Invalid chapter hash: ${hash}. Expected a non-empty alphanumeric string.`,
        hash,
        undefined,
        false
      );
    }

    const url = `${this.baseUrl}/leer/${hash.trim()}`;

    try {
      const html = await this.fetchHtml(url);
      return parseChapterPages(html, hash.trim());
    } catch (error) {
      if (error instanceof ScraperError) throw error;
      const statusCode = error instanceof Error && error.message.includes('status code 404') ? 404 : undefined;
      throw new ScraperError(
        `Failed to fetch chapter pages: ${error instanceof Error ? error.message : String(error)}`,
        url,
        statusCode,
        statusCode === 404 ? false : true
      );
    }
  }
}

/**
 * Default scraper instance factory
 */
export function createScraper(config?: ScraperConfig): MangaTVScraper {
  return new MangaTVScraper(config);
}
