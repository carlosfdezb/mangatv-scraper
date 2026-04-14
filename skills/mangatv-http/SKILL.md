# MangaTV HTTP Skill

## Overview

This skill covers the HTTP client patterns, rate limiting, retry logic, Cloudflare handling, and error classes for the mangatv-scraper project.

## HTTP Client Architecture

### Location

`src/scraper/http/client.ts` - The `HttpClient` class and `createHttpClient` factory.

### Class Structure

```typescript
export class HttpClient {
  private readonly config: Required<ScraperConfig>;
  private readonly rateLimiter: RateLimiter;
  private readonly baseHeaders: Record<string, string>;

  constructor(config: ScraperConfig = {})
  getConfig(): Readonly<Required<ScraperConfig>>
  request<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>
  get(url: string, options?: RequestOptions): Promise<HttpResponse<string>>
  setCfCookie(cookie: string): void
}
```

### Factory Function

```typescript
export function createHttpClient(config?: ScraperConfig): HttpClient {
  return new HttpClient(config);
}
```

## Default Configuration

```typescript
const DEFAULT_CONFIG: Required<ScraperConfig> = {
  baseUrl: 'https://mangatv.net',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: 1000,        // 1 second minimum between requests
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  cfCookie: '',
  insecure: false,
};
```

## Base Headers

The HTTP client sets these headers on every request:

```typescript
this.baseHeaders = {
  'User-Agent': this.config.userAgent,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};
```

## Rate Limiting

### SimpleRateLimiter Implementation

```typescript
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
    return Math.max(0, this.minInterval - (now - this.lastRequestTime));
  }
}
```

### Rate Limiting Rules

**CRITICAL**: 
- Default minimum interval: **1000ms (1 second)**
- Always use `await rateLimiter.wait()` before making requests
- Call `rateLimiter.record()` after successful requests
- Never make concurrent requests to the same site

## Retry Logic

### Retry Strategy

```typescript
async request<T>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
  const maxRetries = options.retries ?? this.config.maxRetries;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await this.rateLimiter.wait();
      const response = await this.performRequest<T>(url, timeout, headers);
      
      // Check for Cloudflare
      if (this.isCloudflareChallenge(response)) {
        if (attempt < maxRetries) {
          await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
          continue;
        }
        throw new Error('Cloudflare protection detected');
      }

      this.rateLimiter.record();
      return response;
    } catch (error) {
      if (isRetryableError(error) && attempt < maxRetries) {
        await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }
}
```

### Exponential Backoff

Retry delays use exponential backoff:
- Attempt 1: 1000ms delay
- Attempt 2: 2000ms delay
- Attempt 3: 4000ms delay

```typescript
await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
```

### Retryable Errors

```typescript
const isRetryableError = (error: Error): boolean => {
  // Network errors
  if (error.message.includes('ECONNREFUSED')) return true;
  if (error.message.includes('ETIMEDOUT')) return true;
  if (error.message.includes('socket hang up')) return true;
  
  // Server errors (5xx)
  if (error.message.includes('status code 5')) return true;
  
  return false;
};
```

## Cloudflare Detection

### Detection Logic

```typescript
private isCloudflareChallenge(response: { body: string; status: number }): boolean {
  return (
    response.status === 403 ||
    response.status === 503 ||
    response.body.includes('Cloudflare') ||
    response.body.includes('Checking your browser') ||
    response.body.includes('cf-challenge')
  );
}
```

### Cloudflare Handling

1. **Detection**: Response body contains "Cloudflare", "Checking your browser", or status 403/503
2. **Response**: Exponential backoff retry
3. **Bypass**: Set `cfCookie` in ScraperConfig with pre-obtained clearance token

### Setting Cloudflare Cookie

```typescript
// After obtaining cf_clearance cookie from browser
scraper.setCfCookie('cf_clearance=xxx');

// Or during construction
const scraper = new MangaTVScraper({
  cfCookie: 'cf_clearance=xxx',
});
```

## Request Execution

### performRequest Method

```typescript
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
    
    return {
      data: body as unknown as T,
      status: response.status,
      headers: Object.fromEntries(
        response.headers.entries()
      ),
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
```

## Error Classes

### ScraperError

```typescript
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
```

### Error Hierarchy

```
MangaTVError (base - not yet defined, would extend Error)
├── NetworkError      // Connection failures, timeouts
├── RateLimitError    // 429 responses, site blocking  
├── CloudflareError   // CF challenge detected
├── ParseError        // HTML structure unexpected
├── NotFoundError     // 404, manga not found
└── ValidationError   // Invalid input parameters
```

**Note**: Currently the project uses generic `Error` classes. When adding specific error types, follow this hierarchy.

### Using Errors

```typescript
try {
  const response = await client.get(url);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Cloudflare')) {
      throw new Error('Cloudflare protection active. Set cfCookie to bypass.');
    }
    if (error.message.includes('timeout')) {
      throw new Error('Request timed out after 30s');
    }
  }
  throw error;
}
```

## RequestOptions Interface

```typescript
interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Retry on failure */
  retries?: number;
  /** Rate limit delay in milliseconds */
  rateLimit?: number;
}
```

## HttpResponse Interface

```typescript
interface HttpResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers (lowercase keys) */
  headers: Record<string, string>;
  /** Final URL after redirects */
  url: string;
}
```

## Usage Patterns

### Basic GET Request

```typescript
const client = createHttpClient();
const response = await client.get('https://mangatv.net/lista');

// Access response
console.log(response.status);    // 200
console.log(response.headers);    // { 'content-type': 'text/html', ... }
console.log(response.url);        // Final URL after redirects
console.log(response.data);       // HTML string
```

### Custom Timeout

```typescript
const response = await client.get(url, {
  timeout: 60000, // 60 seconds
});
```

### With Headers

```typescript
const response = await client.get(url, {
  headers: {
    'Accept-Language': 'en-US,en;q=0.9',
  },
});
```

### Disable Retry

```typescript
const response = await client.get(url, {
  retries: 0,
});
```

## Integration with MangaTVScraper

The `HttpClient` is used internally by `MangaTVScraper`:

```typescript
class MangaTVScraper {
  private readonly client: HttpClient;

  constructor(config: ScraperConfig = {}) {
    this.client = createHttpClient(config);
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await this.client.get(url);
    if (typeof response.data !== 'string') {
      throw new Error('Expected string HTML response');
    }
    return response.data;
  }
}
```

## Testing HTTP Client

```typescript
describe('HttpClient', () => {
  it('should respect rate limiting', async () => {
    const client = createHttpClient({ rateLimit: 100 });
    const start = Date.now();
    
    await client.get('https://example.com/1');
    await client.get('https://example.com/2');
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  it('should throw on timeout', async () => {
    const client = createHttpClient({ timeout: 1 });
    await expect(
      client.get('https://httpbin.org/delay/5')
    ).rejects.toThrow(/timeout/i);
  });
});
```

## Best Practices

1. **Always respect rate limiting** - Never remove the rate limiter
2. **Set realistic timeouts** - 30s default is reasonable for HTML pages
3. **Handle Cloudflare gracefully** - Detect and retry with backoff
4. **Don't hammer the site** - If you need to make many requests, implement polling delays
5. **Use the client's built-in retry** - Don't implement custom retry in scraper methods
6. **Preserve the cfCookie** - Reuse it across requests for session continuity
