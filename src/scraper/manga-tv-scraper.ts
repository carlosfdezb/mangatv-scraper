/**
 * MangaTV Scraper - Main scraper class
 * @module scraper/manga-tv-scraper
 */

import { HttpClient, createHttpClient } from './http/client.js';
import { parseMangaListResult, parseMangaDetail } from './parsers/index.js';
import { buildListUrl } from '../utils/helpers.js';
import { BASE_URL, PATHS, buildMangaUrl } from '../constants/index.js';
import type { 
  ScraperConfig,
  MangaListFilters,
  Manga,
  MangaDetail,
  PaginatedResult,
} from '../types/index.js';
import { ScraperError } from '../types/scraper.js';

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
   * Get manga details by ID and slug
   * @param id - Manga ID
   * @param slug - Manga slug
   * @returns Full manga details
   */
  async getMangaDetail(id: number, slug: string): Promise<MangaDetail> {
    if (!id || id <= 0) {
      throw new ScraperError(`Invalid manga ID: ${id}`, '');
    }
    if (!slug?.trim()) {
      throw new ScraperError('Slug cannot be empty', '');
    }

    const url = buildMangaUrl(id, slug);

    try {
      const html = await this.fetchHtml(url);
      return parseMangaDetail(html, url);
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
   * Get manga details by full URL
   * @param url - Full manga detail page URL
   * @returns Full manga details
   */
  async getMangaDetailByUrl(url: string): Promise<MangaDetail> {
    if (!url?.trim()) {
      throw new ScraperError('URL cannot be empty', '');
    }

    // Validate URL format and extract id/slug
    const match = url.match(/\/manga\/(\d+)\/([^/?#]+)/);
    if (!match?.[1] || !match[2]) {
      throw new ScraperError(`Invalid manga URL: ${url}`, url);
    }

    const id = parseInt(match[1], 10);
    const slug = match[2];

    return this.getMangaDetail(id, slug);
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
}

/**
 * Default scraper instance factory
 */
export function createScraper(config?: ScraperConfig): MangaTVScraper {
  return new MangaTVScraper(config);
}
