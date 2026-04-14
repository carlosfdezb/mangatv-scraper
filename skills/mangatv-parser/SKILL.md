# MangaTV Parser Skill

## Overview

This skill covers HTML parsing patterns using cheerio, selector strategies, and the parser architecture for mangatv.net.

## Parser Architecture

### Parser Interface

All parsers follow a consistent interface pattern:

```typescript
interface Parser<T> {
  /** Parse HTML content into structured data */
  parse(html: string, url?: string): T;
  /** Check if this parser can handle the given URL */
  canParse(url: string): boolean;
}
```

### Parser Locations

| Parser | File | Purpose |
|--------|------|---------|
| ListParser | `src/scraper/parsers/list-parser.ts` | Manga listings, search results |
| DetailParser | `src/scraper/parsers/detail-parser.ts` | Manga detail pages |
| ChapterParser | `src/scraper/parsers/chapter-parser.ts` | Chapter pages |

### Parser Exports

Parsers are exported from `src/scraper/parsers/index.ts`:

```typescript
// List
export { buildListUrl, parseMangaList, parseMangaListResult, parsePagination, canParseList };

// Detail
export { parseMangaDetail, canParseDetail };

// Chapter
export { parseChapter, canParseChapter };
```

## MangaTV.net HTML Selectors

### Manga List Page Selectors

**Primary container**: `.listupd`

**Manga items**: `.listupd .bs .bsx`

| Data | Selector | Attribute/Text |
|------|----------|----------------|
| Link | `.listupd .bs .bsx a` | `href` attribute |
| Title | `.listupd .bs .bsx a .tt` | Text |
| Cover | `.listupd .bs .bsx a .limit img` | `src` attribute |
| Type badge | `.listupd .bs .bsx a .limit .type` | Text |
| ERO tag | `.listupd .bs .bsx a .limit .hot` | Text content = "ERO" |
| Update date | `.listupd .bs .bsx a .epxdate` | Text |
| Rating | `.listupd .bs .bsx` (element) | `rel` attribute with JSON: `{numStar, manga_id}` |

**Example structure**:
```html
<div class="listupd">
  <div class="bs">
    <div class="bsx">
      <a href="/manga/123/slug">
        <div class="limit">
          <img src="cover.jpg" alt="Title">
          <span class="type">MANGA</span>
          <span class="hot">ERO</span>
        </div>
        <div class="tt">Manga Title</div>
        <div class="epxdate">Hace 2 horas</div>
      </a>
    </div>
  </div>
</div>
```

### Filter Form Selectors

| Filter | Selector | Notes |
|--------|----------|-------|
| Genre | `select[name="genre[]"] option` | Multiple selection |
| Demographic | `select[name="demografia"] option` | Single selection |
| Type | `select[name="tipo[]"] option` | Multiple selection |
| Sort order | `select[name="order"] option` | Values: latest, title, titlereverse, popular |

### Detail Page Selectors

**Content container**: `.bigcontent .infox`

| Data | Selector | Notes |
|------|----------|-------|
| Title | `.bigcontent .infox h1` or `.bigcontent .infox h1.title` | Text |
| Cover | `.bigcontent .infox img` | `src` attribute |
| Type | `.bigcontent .infox .type` | Text |
| Description | `.bigcontent .infox .description` or `.bigcontent .infox .sinopsis` | Text |
| Author | `.bigcontent .infox .author` or `.bigcontent .infox [class*="author"]` | Text |
| Artist | `.bigcontent .infox .artist` or `.bigcontent .infox [class*="artist"]` | Text |
| Status | `.bigcontent .infox .status` or `.bigcontent .infox [class*="status"]` | Text |
| Demographics | `.bigcontent .infox .demographic` or `.bigcontent .infox [class*="demographic"]` | Text |
| Genres | `.bigcontent .infox .genre a` or `.bigcontent .infox [class*="genre"]` | Text, multiple |
| Rating | `.bigcontent .infox .rating` or `.bigcontent .infox [class*="rating"]` | Text with number |
| Votes | `.bigcontent .infox .votes` or `.bigcontent .infox [class*="votes"]` | Text with count |

**Example structure**:
```html
<div class="bigcontent">
  <div class="infox">
    <h1 class="title">Manga Title</h1>
    <img src="cover.jpg" alt="Manga Title">
    <div class="type">MANGA</div>
    <div class="description">Synopsis text...</div>
    <div class="author">Author Name</div>
    <div class="artist">Artist Name</div>
    <div class="status"> Ongoing</div>
    <div class="demographic">Seinen</div>
    <div class="genre">
      <a href="/genre/action">Accion</a>
      <a href="/genre/adventure">Aventura</a>
    </div>
    <div class="rating">4.5</div>
    <div class="votes">1234</div>
  </div>
</div>
```

### Chapter List Selectors

**Container**: `.bxcl ul li`

| Data | Selector | Notes |
|------|----------|-------|
| Chapter link | `.bxcl ul li .lchx a` or `.bxcl ul li a` | `href` attribute |
| Chapter number | Extracted from URL: `/capitulo/{id}/{number}` | Parse from URL |
| Chapter title | `.bxcl ul li .lchx a .chapter-title` or `.bxcl ul li .dt` | Text |
| Chapter date | `.bxcl ul li .lchx a .date` or `.bxcl ul li .dt` | Text |

**URL pattern for chapters**: `/capitulo/{chapter_id}/{chapter_number}`

**Example structure**:
```html
<div class="bxcl">
  <ul>
    <li>
      <div class="lchx">
        <a href="/capitulo/12345/1">
          <span class="dt">Chapter 1</span>
          <span class="chapter-title">The Beginning</span>
          <span class="date">Hace 2 horas</span>
        </a>
      </div>
    </li>
  </ul>
</div>
```

## Parser Implementation Patterns

### Fallback Selector Pattern

Always provide fallback selectors for resilience:

```typescript
// List parser example
const containerSelectors = [
  '.manga-list',
  '.list-manga',
  '.manga-items',
  '.manga-listado',
  '[class*="manga-list"]',
];

let $container: cheerio.Cheerio | null = null;
for (const selector of containerSelectors) {
  if ($(selector).length > 0) {
    $container = $(selector);
    break;
  }
}
```

### Extracting Data with Fallbacks

```typescript
function extractTitle($el: cheerio.Cheerio): string {
  return $el.find('img').attr('alt') 
    ?? $el.find('.title').text().trim()
    ?? $el.find('h2').text().trim()
    ?? $el.text().trim()
    ?? '';
}
```

### URL Parsing

Parse IDs and slugs from URLs:

```typescript
// Manga URL: /manga/123/slug
const match = href.match(/\/manga\/(\d+)\/([^/]+)/);
const id = match?.[1] ? parseInt(match[1], 10) : 0;
const slug = match?.[2] ?? '';

// Chapter URL: /capitulo/12345/1
const chapterMatch = href.match(/\/capitulo\/(\d+)\/([^\/]+)/);
const chapterId = chapterMatch?.[1] ? parseInt(chapterMatch[1], 10) : 0;
const chapterNumber = chapterMatch?.[2] ?? '';
```

### Type Mapping

Convert string values to typed enums/union types:

```typescript
function parseMangaType(typeStr: string): MangaType {
  const normalized = typeStr.trim().toUpperCase().replace(/\s+/g, '-');
  const typeMap: Record<string, MangaType> = {
    'MANGA': 'Manga',
    'MANHWA': 'MANHWA',
    'MANHUA': 'Manhua',
    'ONE-SHOT': 'One-Shot',
    // ...
  };
  return typeMap[normalized] ?? 'Manga';
}
```

## List Parser Specific Patterns

### buildListUrl Function

```typescript
export function buildListUrl(filters?: MangaListFilters): string {
  const params = new URLSearchParams();
  
  if (filters?.genre?.length) {
    filters.genre.forEach(g => params.append('g', g));
  }
  if (filters?.type?.length) {
    filters.type.forEach(t => params.append('type', t));
  }
  if (filters?.demographic) {
    params.set('demographic', filters.demographic);
  }
  if (filters?.sort && filters.sort !== 'latest') {
    params.set('order', filters.sort);
  }
  if (filters?.page && filters.page > 1) {
    params.set('page', filters.page.toString());
  }
  
  return params.toString() ? `/lista?${params}` : '/lista';
}
```

### Pagination Parsing

```typescript
function parsePagination(html: string): { page: number; totalPages: number; totalItems: number } {
  const $ = cheerio.load(html);
  
  const pageText = $('.pagination .active, .page-current').text().trim();
  const pageMatch = pageText.match(/\d+/);
  const currentPage = pageMatch ? parseInt(pageMatch[0], 10) : 1;
  
  // ... parse totalPages, totalItems
  
  return { page: currentPage, totalPages, totalItems };
}
```

## Detail Parser Specific Patterns

### canParse Function

```typescript
export function canParse(url: string): boolean {
  return url.includes('/manga/') && !url.includes('/capitulo/');
}
```

### Parsing with URL Context

```typescript
export function parseMangaDetail(html: string, url: string): MangaDetail {
  const $ = cheerio.load(html);
  
  // Extract ID and slug from URL for guaranteed accuracy
  const urlMatch = url.match(/\/manga\/(\d+)\/([^/]+)/);
  const id = urlMatch?.[1] ? parseInt(urlMatch[1], 10) : 0;
  const slug = urlMatch?.[2] ?? '';
  
  // ... parse other fields
}
```

## Chapter Parser Specific Patterns

### canParse Function

```typescript
export function canParse(url: string): boolean {
  return url.includes('/capitulo/');
}
```

## Cheerio Usage Patterns

### Loading HTML

```typescript
import * as cheerio from 'cheerio';

const $ = cheerio.load(html);
```

### Basic Traversal

```typescript
$('a').each((_, element) => {
  const $el = $(element);
  const href = $el.attr('href');
  const text = $el.text().trim();
});
```

### Attribute Access

```typescript
const src = $('img').attr('src');
const href = $('a').attr('href');
const alt = $('img').attr('alt');
const rel = $('div').attr('rel'); // For JSON data
```

### Text Content

```typescript
const title = $('h1').text().trim();
const description = $('.description').text().trim();
```

### Class-based Selection

```typescript
$('.class-name')           // Single class
$('[class*="partial"]')    // Partial match
$('.multiple .classes')    // Nested
```

### Multiple Elements

```typescript
const items = $('.item').map((_, el) => $(el).text()).get();
const genres = $('.genre a').map((_, el) => $(el).text().trim()).get();
```

## Error Handling in Parsers

```typescript
export function parseMangaList(html: string): Manga[] {
  const $ = cheerio.load(html);
  const mangaList: Manga[] = [];

  try {
    // Parsing logic
  } catch (error) {
    // Log but don't throw - return empty array for resilience
    console.error('Error parsing manga list:', error);
    return mangaList;
  }
}
```

## Testing Parsers

```typescript
import { parseMangaList } from './list-parser';
import { readFileSync } from 'fs';

describe('ListParser', () => {
  it('should parse manga items from HTML', () => {
    const html = readFileSync('./fixtures/manga-list.html', 'utf-8');
    const results = parseMangaList(html);
    
    expect(results).toHaveLength(20);
    expect(results[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      type: expect.any(String),
    });
  });
});
```
