/**
 * MangaTV Scraper - Main scraper class
 * @module scraper/manga-tv-scraper
 */

import { HttpClient, createHttpClient } from './http/client.js';
import { buildListUrl, parseMangaListResult, parseMangaDetail } from './parsers/index.js';
import { BASE_URL, PATHS, buildMangaUrl } from '../constants/index.js';
import type { 
  ScraperConfig,
  MangaListFilters,
  Manga,
  MangaDetail,
  PaginatedResult,
} from '../types/index.js';

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
    throw new Error('Not implemented');
  }

  /**
   * Search manga by query
   * @param query - Search term
   * @param page - Page number (default: 1)
   * @returns Paginated search results
   */
  async searchManga(query: string, page?: number): Promise<PaginatedResult<Manga>> {
    throw new Error('Not implemented');
  }

  /**
   * Get recently updated manga
   * @param page - Page number (default: 1)
   * @returns Paginated list of recently updated manga
   */
  async getLatestUpdates(page?: number): Promise<PaginatedResult<Manga>> {
    throw new Error('Not implemented');
  }

  /**
   * Get manga details by ID and slug
   * @param id - Manga ID
   * @param slug - Manga slug
   * @returns Full manga details
   */
  async getMangaDetail(id: number, slug: string): Promise<MangaDetail> {
    throw new Error('Not implemented');
  }

  /**
   * Get manga details by full URL
   * @param url - Full manga detail page URL
   * @returns Full manga details
   */
  async getMangaDetailByUrl(url: string): Promise<MangaDetail> {
    throw new Error('Not implemented');
  }

  /**
   * Get a random manga
   * @returns Full manga details of a random manga
   */
  async getRandomManga(): Promise<MangaDetail> {
    throw new Error('Not implemented');
  }
}

/**
 * Default scraper instance factory
 */
export function createScraper(config?: ScraperConfig): MangaTVScraper {
  return new MangaTVScraper(config);
}
