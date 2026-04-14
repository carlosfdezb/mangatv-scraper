# MangaTV Scraper Skill

## Overview

This skill covers the main `MangaTVScraper` class, its public API, and the patterns for extending the scraper with new methods.

## Project Context

- **Entry point**: `MangaTVScraper` class in `src/scraper/manga-tv-scraper.ts`
- **HTTP layer**: `HttpClient` in `src/scraper/http/client.ts`
- **Parsers**: Separate parser modules in `src/scraper/parsers/`
- **Base URL**: `https://mangatv.net`

## MangaTVScraper Class Structure

### Constructor

```typescript
constructor(config: ScraperConfig = {})
```

The constructor accepts optional `ScraperConfig`:

```typescript
interface ScraperConfig {
  baseUrl?: string;          // Default: 'https://mangatv.net'
  timeout?: number;          // Default: 30000ms
  maxRetries?: number;       // Default: 3
  retryDelay?: number;        // Default: 1000ms
  rateLimit?: number;        // Default: 1000ms (1 second min between requests)
  userAgent?: string;        // Custom user agent
  cfCookie?: string;         // Pre-set Cloudflare clearance cookie
  insecure?: boolean;         // Default: false
}
```

### Public Methods

All public methods must follow this pattern:

```typescript
/**
 * [Brief description of what the method does]
 * @param [paramName] - [Description of parameter]
 * @param [paramName] - [Description of parameter] (default: [default value])
 * @returns [Description of return value]
 * @throws {[ErrorType]} When [error condition]
 * @throws {[ErrorType]} When [error condition]
 */
async [methodName]([params]): Promise<[ReturnType]> {
  // Implementation
}
```

### Current Public API

```typescript
class MangaTVScraper {
  constructor(config?: ScraperConfig)
  
  /** Get the HTTP client for advanced use */
  getClient(): HttpClient
  
  /** Set Cloudflare clearance cookie for subsequent requests */
  setCfCookie(cookie: string): void
  
  /** List manga with optional filters */
  async listManga(filters?: MangaListFilters): Promise<PaginatedResult<Manga>>
  
  /** Search manga by query */
  async searchManga(query: string, page?: number): Promise<PaginatedResult<Manga>>
  
  /** Get recently updated manga */
  async getLatestUpdates(page?: number): Promise<PaginatedResult<Manga>>
  
  /** Get manga details by ID and slug */
  async getMangaDetail(id: number, slug: string): Promise<MangaDetail>
  
  /** Get manga details by full URL */
  async getMangaDetailByUrl(url: string): Promise<MangaDetail>
  
  /** Get a random manga */
  async getRandomManga(): Promise<MangaDetail>
}
```

### Internal Pattern: fetchHtml

Use `fetchHtml` for any HTTP calls within the scraper:

```typescript
private async fetchHtml(url: string): Promise<string> {
  const response = await this.client.get(url);
  if (typeof response.data !== 'string') {
    throw new Error('Expected string HTML response');
  }
  return response.data;
}
```

### URL Patterns

| Endpoint | URL Pattern |
|----------|------------|
| Manga list | `/lista` |
| Search | `/lista?s={query}` |
| Updated | `/actualizado` |
| Manga detail | `/manga/{id}/{slug}` |
| Random | `/random` |

### Error Handling Pattern

```typescript
async someMethod(param: string): Promise<Result> {
  if (!param || param.trim().length === 0) {
    throw new Error('Parameter cannot be empty');
  }
  
  try {
    const html = await this.fetchHtml(url);
    return parseResult(html);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Cloudflare')) {
        throw new Error('Cloudflare protection detected. Set cfCookie to bypass.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Request timed out');
      }
    }
    throw error;
  }
}
```

### Rate Limiting Requirements

**CRITICAL**: Always respect rate limiting:
- Default: 1 second minimum between requests
- The `HttpClient` handles this automatically
- Do NOT make rapid sequential requests
- If implementing custom retry logic, respect the rate limiter

### Parser Delegation Pattern

The scraper delegates HTML parsing to dedicated parsers:

```typescript
import { 
  buildListUrl, 
  parseMangaListResult, 
  parseMangaDetail 
} from './parsers/index.js';

// Example implementation pattern:
async listManga(filters?: MangaListFilters): Promise<PaginatedResult<Manga>> {
  const url = buildListUrl(filters);  // Build URL from filters
  const html = await this.fetchHtml(url);
  return parseMangaListResult(html, filters);  // Delegate parsing to parser
}
```

### Adding New Scraper Methods

When adding a new method to `MangaTVScraper`:

1. **Follow the JSDoc pattern** with `@param`, `@returns`, `@throws`
2. **Use `fetchHtml`** for HTTP calls (never use `HttpClient` directly in public methods)
3. **Delegate parsing** to appropriate parser module
4. **Handle errors** with specific error messages
5. **Validate inputs** before making requests

Example template:

```typescript
/**
 * [What the method does]
 * @param [param] - [Description]
 * @returns [Description]
 * @throws {Error} When [condition]
 */
async [methodName]([params]): Promise<[ReturnType]> {
  // Input validation
  if ([invalid condition]) {
    throw new Error('[Descriptive error message]');
  }
  
  try {
    // Build URL using constants/parsers
    const url = this.buildUrl(...);
    
    // Fetch HTML
    const html = await this.fetchHtml(url);
    
    // Delegate to parser
    return parse[Something](html);
  } catch (error) {
    // Add context to errors
    if (error instanceof Error) {
      throw new Error(`Failed to [action]: ${error.message}`);
    }
    throw error;
  }
}
```

### Testing Pattern

When testing scraper methods:

```typescript
describe('MangaTVScraper', () => {
  describe('searchManga', () => {
    it('should return paginated results', async () => {
      const scraper = new MangaTVScraper();
      const results = await scraper.searchManga('One Piece');
      
      expect(results.items).toBeDefined();
      expect(Array.isArray(results.items)).toBe(true);
      expect(results.page).toBe(1);
      expect(results.hasNextPage).toBeDefined();
    });
    
    it('should throw on empty query', async () => {
      const scraper = new MangaTVScraper();
      await expect(scraper.searchManga('')).rejects.toThrow();
    });
  });
});
```

## Key Files

| File | Purpose |
|------|---------|
| `src/scraper/manga-tv-scraper.ts` | Main scraper class |
| `src/scraper/http/client.ts` | HTTP client with retry/rate limiting |
| `src/scraper/parsers/` | List, Detail, Chapter parsers |
| `src/constants/urls.ts` | URL constants and builders |
| `src/types/scraper.ts` | ScraperConfig, RequestOptions, etc. |

## Common Patterns

### Building URLs

```typescript
import { buildListUrl } from './parsers/index.js';
import { buildMangaUrl } from '../constants/index.js';

// Filter-based list URL
const listUrl = buildListUrl({ genre: ['Accion'], sort: 'popular' });

// Manga detail URL
const detailUrl = buildMangaUrl(123, 'one-piece-slug');
```

### Pagination Response

```typescript
interface PaginatedResult<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
}
```
