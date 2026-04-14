/**
 * HTTP Client with retry logic, rate limiting, and Cloudflare handling
 * @module scraper/http/client
 */

import type { ScraperConfig, RequestOptions, HttpResponse, RateLimiter } from '../../types/scraper.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ScraperConfig> = {
  baseUrl: 'https://mangatv.net',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: 1000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  cfCookie: '',
  insecure: false,
};

/**
 * Simple rate limiter implementation
 */
class SimpleRateLimiter implements RateLimiter {
  private lastRequestTime: number = 0;
  private readonly minInterval: number;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  record(): void {
    this.lastRequestTime = Date.now();
  }

  getWaitTime(): number {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    return Math.max(0, this.minInterval - timeSinceLastRequest);
  }
}

/**
 * HTTP Client for making requests to MangaTV
 */
export class HttpClient {
  private readonly config: Required<ScraperConfig>;
  private readonly rateLimiter: RateLimiter;
  private readonly baseHeaders: Record<string, string>;

  constructor(config: ScraperConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rateLimiter = new SimpleRateLimiter(this.config.rateLimit);
    this.baseHeaders = {
      'User-Agent': this.config.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
    if (this.config.cfCookie) {
      this.baseHeaders['Cookie'] = this.config.cfCookie;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<Required<ScraperConfig>> {
    return this.config;
  }

  /**
   * Check if response indicates Cloudflare challenge
   */
  private isCloudflareChallenge(response: { body: string; status: number }): boolean {
    return (
      response.status === 403 ||
      response.status === 503 ||
      response.body.includes('Cloudflare') ||
      response.body.includes('Checking your browser') ||
      response.body.includes('cf-challenge')
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform HTTP request with retry logic
   */
  async request<T = string>(
    url: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const timeout = options.timeout ?? this.config.timeout;
    const maxRetries = options.retries ?? this.config.maxRetries;
    const headers = { ...this.baseHeaders, ...options.headers };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Apply rate limiting
        await this.rateLimiter.wait();

        const response = await this.performRequest<T>(url, timeout, headers);
        
        // Check for Cloudflare challenge
        if (this.isCloudflareChallenge({ body: response.data as string, status: response.status })) {
          if (attempt < maxRetries) {
            // Exponential backoff for Cloudflare challenges
            await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
            continue;
          }
          throw new Error('Cloudflare protection detected');
        }

        this.rateLimiter.record();
        return response;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if retryable
        const isNetworkError = (
          error instanceof TypeError ||
          (error instanceof Error && (
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('socket hang up')
          ))
        );
        
        const isServerError = error instanceof Error && 
          error.message.includes('status code 5');

        if (isNetworkError || isServerError) {
          if (attempt < maxRetries) {
            await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
            continue;
          }
        }
        
        throw error;
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest<T>(
    url: string,
    timeout: number,
    headers: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      return {
        data: body as unknown as T,
        status: response.status,
        headers: responseHeaders,
        url: response.url || url,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * GET request - convenience method
   */
  async get(url: string, options?: RequestOptions): Promise<HttpResponse<string>> {
    return this.request<string>(url, options);
  }

  /**
   * Set Cloudflare clearance cookie
   */
  setCfCookie(cookie: string): void {
    this.baseHeaders['Cookie'] = cookie;
  }
}

/**
 * Create a new HTTP client with optional config
 */
export function createHttpClient(config?: ScraperConfig): HttpClient {
  return new HttpClient(config);
}
