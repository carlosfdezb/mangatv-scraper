/**
 * MangaTV Scraper
 * TypeScript scraper for MangaTV (mangatv.net) — Spanish manga reader site
 * 
 * @example
 * ```typescript
 * import { MangaTVScraper } from 'mangatv-scraper';
 * 
 * const scraper = new MangaTVScraper();
 * const results = await scraper.searchManga('One Piece');
 * console.log(results.items);
 * ```
 * 
 * @module index
 */

// Types (type-only exports)
export type {
  Manga,
  MangaDetail,
  Chapter,
  MangaType,
  Demographic,
  Genre,
  SortOrder,
  MangaListFilters,
  PaginatedResult,
  ScraperConfig,
  RequestOptions,
  HttpResponse,
  RateLimiter,
} from './types/index.js';

// Value exports (classes, functions, constants — NOT types)
export { ScraperError } from './types/index.js';

// Constants
export {
  BASE_URL,
  PATHS,
  IMAGE_CDN_SUBDOMAINS,
  MANGA_TYPES,
  DEMOGRAPHICS,
  GENRES,
  SORT_ORDERS,
  buildUrl,
  buildMangaUrl,
  isMangaTvUrl,
  isCdnUrl,
  getGenreDisplayName,
  isValidGenre,
  isValidMangaType,
  isValidDemographic,
} from './constants/index.js';

// Scraper
export { MangaTVScraper, createScraper } from './scraper/manga-tv-scraper.js';
export { HttpClient, createHttpClient } from './scraper/http/client.js';

// Parsers
export {
  buildListUrl,
  parseMangaList,
  parseMangaListResult,
  parsePagination,
  canParseList,
  parseMangaDetail,
  canParseDetail,
  parseChapter,
  canParseChapter,
} from './scraper/parsers/index.js';

// Utils
export {
  sleep,
  normalizeString,
  extractId,
  slugify,
  parseSiteDate,
  isAllowedDomain,
  retryWithBackoff,
  safeJsonParse,
  chunkArray,
  deduplicateByKey,
} from './utils/index.js';
