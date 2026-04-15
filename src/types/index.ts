/**
 * Type exports
 * @module types
 */

export type {
  Manga,
  MangaDetail,
  Chapter,
  ChapterPage,
  ChapterPages,
  MangaType,
  Demographic,
  Genre,
  SortOrder,
  MangaListFilters,
  PaginatedResult,
} from './manga.js';

export { ScraperError } from './scraper.js';

export type {
  ScraperConfig,
  RequestOptions,
  HttpResponse,
  RateLimiter,
} from './scraper.js';
