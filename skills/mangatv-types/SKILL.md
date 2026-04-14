# MangaTV Types Skill

## Overview

This skill covers TypeScript type conventions, patterns, and organization for the mangatv-scraper project.

## Type Organization

### File Structure

Types are organized by domain in `src/types/`:

| File | Contents |
|------|----------|
| `types/manga.ts` | Core domain types: Manga, MangaDetail, Chapter, filters |
| `types/scraper.ts` | Scraper configuration and HTTP types |
| `types/index.ts` | Re-exports all types |

### Core Type Definitions

#### Manga (list item)

```typescript
interface Manga {
  /** Unique manga identifier (numeric) */
  id: number;
  /** URL-friendly slug */
  slug: string;
  /** Manga title */
  title: string;
  /** Manga type (Manga, Manhwa, Manhua, etc.) */
  type: MangaType;
  /** Cover image URL */
  coverUrl: string;
  /** Latest update date string */
  latestUpdate: string;
  /** Rating from 1-5 stars */
  rating: number;
  /** Number of ratings received */
  ratingCount: number;
  /** Whether the manga is marked as 18+ (ero) */
  isEro: boolean;
  /** Full URL to the manga detail page */
  url: string;
}
```

#### MangaDetail (extends Manga)

```typescript
interface MangaDetail extends Manga {
  /** Full manga description/synopsis */
  description: string;
  /** Author name(s) */
  author: string;
  /** Artist name(s) */
  artist: string;
  /** Publication status */
  status: string;
  /** Demographic categories */
  demographics: Demographic[];
  /** Genre tags */
  genres: Genre[];
  /** List of chapters */
  chapters: Chapter[];
}
```

#### Chapter

```typescript
interface Chapter {
  /** Unique chapter identifier (numeric) */
  id: number;
  /** Chapter number (e.g., "1", "1.5", "Chapter 10") */
  number: string;
  /** Chapter title */
  title: string;
  /** Publication date string */
  date: string;
  /** Full URL to the chapter */
  url: string;
}
```

## Union Types

### MangaType

```typescript
type MangaType = 'Manga' | 'MANHWA' | 'Manhua' | 'One-Shot' | 'Doujinshi' | 'Oel' | 'Novela' | 'ONE SHOT';
```

### Demographic

```typescript
type Demographic = 'Seinen' | 'Shoujo' | 'Shounen' | 'Josei' | 'Kodomo';
```

### Genre

```typescript
type Genre = 'Accion' | 'Animacion' | 'Artes Marciales' | 'Aventura' | ...;
// Full list in src/constants/genres.ts
```

### SortOrder

```typescript
type SortOrder = 'latest' | 'title' | 'titlereverse' | 'popular';
```

## Type Patterns

### Immutable Return Types

Always use `readonly` or `Readonly<T>` for return types to prevent mutation:

```typescript
// Good - immutable
function getManga(): readonly Manga[] { ... }

// Good - Readonly wrapper
function getManga(): ReadonlyArray<Manga> { ... }

// Good - Readonly<T>
function getManga(): Readonly<Manga> { ... }
```

### Filter Interfaces

```typescript
interface MangaListFilters {
  /** Filter by genres */
  genre?: Genre[];
  /** Filter by manga types */
  type?: MangaType[];
  /** Filter by demographic */
  demographic?: Demographic;
  /** Sort order */
  sort?: SortOrder;
  /** Page number (1-indexed) */
  page?: number;
}
```

### Paginated Results

```typescript
interface PaginatedResult<T> {
  /** Items on the current page */
  items: T[];
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
}
```

## Scraper Configuration Types

### ScraperConfig

```typescript
interface ScraperConfig {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimit?: number;
  userAgent?: string;
  cfCookie?: string;
  insecure?: boolean;
}
```

### RequestOptions

```typescript
interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  rateLimit?: number;
}
```

### HttpResponse

```typescript
interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  url: string;
}
```

## Type Constants

Type constants are defined in `src/constants/genres.ts`:

```typescript
export const MANGA_TYPES = [
  'Manga', 'MANHWA', 'Manhua', 'One-Shot', 
  'Doujinshi', 'Oel', 'Novela', 'ONE SHOT',
] as const;

export const DEMOGRAPHICS = [
  'Seinen', 'Shoujo', 'Shounen', 'Josei', 'Kodomo',
] as const;

export const GENRES = [
  'Accion', 'Animacion', 'Artes Marciales', /* ... */
] as const;

export const SORT_ORDERS = {
  LATEST: 'latest',
  TITLE: 'title',
  TITLE_REVERSE: 'titlereverse',
  POPULAR: 'popular',
} as const;
```

## Adding New Types

### When to Add a New Type

- New distinct entity in the domain (e.g., `Author`, `Publisher`)
- New union type for state management
- New configuration interface

### When NOT to Add a New Type

- Simple string or number → use primitives
- Array of existing type → use `Type[]` or `ReadonlyArray<Type>`
- Optional version of existing type → use `Type | undefined`

### Type Naming Conventions

| Kind | Convention | Example |
|------|------------|---------|
| Interface | PascalCase, no prefix | `MangaDetail` |
| Type alias | PascalCase | `MangaType` |
| Enum | PascalCase | Not used (prefer union types) |
| Union members | PascalCase or 'Value' | `'Manga' \| 'Manhwa'` |

## Export Patterns

### From types/index.ts

```typescript
// Re-export from submodules
export type { Manga, MangaDetail, Chapter, ... } from './manga.js';
export type { ScraperConfig, RequestOptions, ... } from './scraper.js';
```

### From main index.ts

```typescript
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
} from './types/index.js';
```

## Discriminated Unions for State

When modeling state with loading/error/success states, use discriminated unions:

```typescript
type MangaState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: MangaDetail };

// Usage with exhaustive matching
function render(state: MangaState) {
  switch (state.status) {
    case 'idle': return null;
    case 'loading': return <Spinner />;
    case 'error': return <Error message={state.error.message} />;
    case 'success': return <MangaCard data={state.data} />;
  }
}
```

## Utility Types

The project uses these built-in utility types:

```typescript
// Readonly arrays
readonly Manga[]
ReadonlyArray<Manga>

// Optional properties
Partial<ScraperConfig>

// Required properties  
Required<ScraperConfig>

// Pick specific properties
Pick<Manga, 'id' | 'title' | 'coverUrl'>

// Omit properties
Omit<MangaDetail, 'chapters'>
```

## Strict Mode

This project uses **strict TypeScript mode**:
- No `any` types
- No implicit `any`
- Strict null checks enabled

Always define proper types:

```typescript
// Bad
function processManga(manga: any) { ... }

// Good
function processManga(manga: Manga) { ... }

// If handling uncertain data, use type guards
function isManga(obj: unknown): obj is Manga {
  return obj !== null 
    && typeof obj === 'object'
    && 'id' in obj 
    && 'title' in obj;
}
```
