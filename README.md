# mangatv-scraper

[![npm version](https://img.shields.io/npm/v/mangatv-scraper)](https://www.npmjs.com/package/mangatv-scraper) [![npm downloads](https://img.shields.io/npm/dm/mangatv-scraper)](https://www.npmjs.com/package/mangatv-scraper) [![license](https://img.shields.io/npm/l/mangatv-scraper)](https://www.npmjs.com/package/mangatv-scraper) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![node version](https://img.shields.io/node/v/mangatv-scraper)](https://www.npmjs.com/package/mangatv-scraper)

TypeScript scraper for [mangatv.net](https://mangatv.net/) with support for manga listings, search, detail pages, latest updates, random manga, and chapter page extraction.

This package is intended for Node.js or backend usage. It is not an official MangaTV API.

## Installation

```bash
npm install mangatv-scraper
```

## Requirements

- Node.js `>=18`
- Network access to `https://mangatv.net`
- A backend proxy if you want to render chapter images in a browser or frontend app

## Quick Start

```ts
import { MangaTVScraper } from 'mangatv-scraper';

const scraper = new MangaTVScraper({
  timeout: 30_000,
  maxRetries: 3,
  rateLimit: 1_000,
});

const search = await scraper.searchManga('One Piece');
const first = search.items[0];

if (!first) {
  throw new Error('No manga found');
}

const detail = await scraper.getMangaDetail(first.id);

console.log({
  title: detail.title,
  genres: detail.genres,
  chapters: detail.chapters.length,
});
```

## API

### `new MangaTVScraper(config?)`

Creates the main scraper instance.

Supported config fields:

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://mangatv.net` | Override only if you know what you are doing |
| `proxyUrl` | `string` | `''` | Proxy URL for bypassing Cloudflare protection (e.g., Cloudflare Worker). Replaces the origin in all requests when set. |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `maxRetries` | `number` | `3` | Retries for retryable failures |
| `retryDelay` | `number` | `1000` | Base retry delay in ms |
| `rateLimit` | `number` | `1000` | Minimum delay between requests |
| `userAgent` | `string` | browser-like UA | Used by the internal HTTP client |
| `cfCookie` | `string` | `''` | Cloudflare clearance cookie |
| `insecure` | `boolean` | `false` | Present in the public config type; current runtime code does not customize TLS handling |

### `listManga(filters?)`

Fetches `/lista` and returns a paginated result.

```ts
const result = await scraper.listManga({
  genre: ['Accion', 'Drama'],
  type: ['Manga', 'MANHWA'],
  demographic: 'Seinen',
  sort: 'popular',
  page: 2,
});

console.log(result.items);
console.log(result.page, result.totalPages, result.hasNextPage);
```

### `searchManga(query, page?)`

Searches with MangaTV's `?s=` query parameter.

```ts
const result = await scraper.searchManga('Solo Leveling', 1);

for (const manga of result.items) {
  console.log(manga.id, manga.title, manga.url);
}
```

Empty or whitespace-only queries throw `ScraperError`.

### `getLatestUpdates(page?)`

Fetches MangaTV's `/actualizado` page.

```ts
const updates = await scraper.getLatestUpdates(1);
console.log(updates.items.map(item => item.title));
```

### `getMangaDetail(id, options?)`

Fetches a manga detail page by numeric MangaTV ID.

```ts
const detail = await scraper.getMangaDetail(36031, {
  order: 'asc',
  groupVersions: true,
});

console.log(detail.title);
console.log(detail.description);
console.log(detail.chapters[0]);
```

Notes:

- Accepts a numeric ID only, not a slug.
- `order` defaults to `'asc'`.
- `groupVersions` defaults to `true`.

### `getRandomManga()`

Fetches `/random`, follows the redirect, and parses the target detail page.

```ts
const manga = await scraper.getRandomManga();
console.log(manga.id, manga.title);
```

### `getChapterPages(hash)`

Fetches `/leer/{hash}` and returns decoded image URLs for that chapter.

```ts
const chapterPages = await scraper.getChapterPages('b35a0970901f4f');

console.log(chapterPages.totalPages);
console.log(chapterPages.pages[0]);
```

Notes:

- `hash` must be a non-empty alphanumeric string.
- The hash must come from a `/leer/{hash}` URL.
- Returned image URLs are raw MangaTV CDN URLs.

### `getClient()`

Returns the internal `HttpClient` for advanced use cases.

### `setCfCookie(cookie)`

Sets the Cloudflare clearance cookie on the internal HTTP client.

### `createScraper(config?)`

Factory helper for `MangaTVScraper`.

```ts
import { createScraper } from 'mangatv-scraper';

const scraper = createScraper({ timeout: 10_000 });
```

## Lower-Level Exports

If you need more control than the main scraper class, the package also exports:

- `HttpClient` and `createHttpClient`
- Parser functions such as `parseMangaList`, `parseMangaDetail`, and `parseChapterPages`
- Constants and validators such as `BASE_URL`, `PATHS`, `isCdnUrl`, and `getCdnImageHeaders`
- Type exports such as `Manga`, `MangaDetail`, `ChapterPages`, and `MangaListFilters`

These are useful when you already have your own fetch, cache, or persistence layer.

## Cloudflare Proxy Support

If you're deploying to a serverless environment (Vercel, Netlify, AWS Lambda, etc.), mangatv.net's Cloudflare protection may block requests from datacenter IPs. The `proxyUrl` option routes requests through a proxy that can bypass this protection.

### Setup

1. **Deploy a Cloudflare Worker** that proxies requests to mangatv.net
2. **Set `proxyUrl`** in your scraper config:

```ts
import { MangaTVScraper } from 'mangatv-scraper';

const scraper = new MangaTVScraper({
  proxyUrl: process.env.MANGATV_PROXY_URL, // e.g., 'https://my-worker.workers.dev'
});
```

When `proxyUrl` is set, all requests are sent to the proxy URL instead of mangatv.net directly. Paths and query parameters are preserved; only the origin is replaced.

**Example:**

- Without proxy: `https://mangatv.net/manga/36031`
- With proxy: `https://my-worker.workers.dev/manga/36031`

### Cloudflare Worker Example

A minimal Cloudflare Worker that proxies to mangatv.net:

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upstream = new Request(`https://mangatv.net${url.pathname}${url.search}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    const response = await fetch(upstream);
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { status: response.status, headers });
  },
};
```

### Notes

- `proxyUrl` is optional; when not set, the scraper connects directly to mangatv.net
- CDN image URLs are NOT affected by `proxyUrl`; they always point to `img*.mangatv.net`
- The proxy only needs to handle HTML page requests, not images

## Chapter Image Proxy

If you want to display chapter images in a browser, mobile WebView, or frontend app, you should proxy MangaTV CDN image requests through your own backend.

Why this matters:

- `getChapterPages()` returns real upstream CDN URLs.
- Those URLs typically require `Referer: https://mangatv.net/`.
- Frontend clients usually cannot attach that header in a reliable way.

Minimal Express example:

```ts
import express from 'express';
import { getCdnImageHeaders, isCdnUrl } from 'mangatv-scraper';

const app = express();

app.get('/api/mangatv/image', async (req, res) => {
  const rawUrl = req.query.url;

  if (typeof rawUrl !== 'string' || !rawUrl) {
    res.status(400).json({ error: 'Missing url query param' });
    return;
  }

  if (!isCdnUrl(rawUrl)) {
    res.status(400).json({ error: 'Only MangaTV CDN URLs are allowed' });
    return;
  }

  const upstream = await fetch(rawUrl, {
    headers: getCdnImageHeaders(),
  });

  if (!upstream.ok) {
    res.status(upstream.status).json({ error: 'Failed to fetch upstream image' });
    return;
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/webp';
  const arrayBuffer = await upstream.arrayBuffer();

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(Buffer.from(arrayBuffer));
});
```

## Important Notes And Limitations

- This is a scraper, not an official API.
- If MangaTV changes selectors, scripts, routes, or Cloudflare behavior, parsing can break.
- `getMangaDetail(id)` expects a numeric ID only.
- `getChapterPages(hash)` requires a `/leer/{hash}` hash, not a generic chapter URL.
- Some chapter versions may expose an empty `hash` when the source only includes older URL formats.
- `parseMangaListResult().totalItems` is estimated, not exact.
- `author` and `artist` can be `null` when MangaTV does not render that data.
- Built-in rate limiting is intentional to reduce blocking risk.
- For serverless deployments, use `proxyUrl` to route through a Cloudflare Worker proxy.

## Compatibility

- ESM and CommonJS consumers are supported through package exports.
- TypeScript type declarations are included.

## License

MIT

## AI Assistance

This project was produced with full AI agent assistance. The code, documentation, and package structure were developed through an agent-driven workflow, with human direction and review.

## Contributing

Contributions are welcome. If you find a bug, notice a site change, or want to improve the package, feel free to open an issue or submit a pull request.
