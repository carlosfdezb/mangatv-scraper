/**
 * Scraper configuration types
 * @module types/scraper
 */

import type { MangaListFilters, Manga, MangaDetail, PaginatedResult } from './manga.js';

/**
 * Configuration options for the scraper
 */
export interface ScraperConfig {
  /** Base URL of the site (default: https://mangatv.net) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Rate limit: minimum delay between requests in milliseconds (default: 1000) */
  rateLimit?: number;
  /** User agent string */
  userAgent?: string;
  /** Cloudflare clearance cookie (if pre-obtained) */
  cfCookie?: string;
  /** Accept invalid SSL certificates (default: false) */
  insecure?: boolean;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Retry on failure */
  retries?: number;
  /** Rate limit delay in milliseconds */
  rateLimit?: number;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Final URL after redirects */
  url: string;
}

/**
 * Error class for scraper-related errors
 */
export class ScraperError extends Error {
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;
  public readonly url: string;

  constructor(
    message: string,
    url: string,
    statusCode?: number,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ScraperError';
    this.url = url;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /** Wait until next request is allowed */
  wait(): Promise<void>;
  /** Record a request */
  record(): void;
  /** Get ms until next request is allowed */
  getWaitTime(): number;
}

/**
 * Export all types
 */
export type {
  MangaListFilters,
  Manga,
  MangaDetail,
  PaginatedResult,
};
