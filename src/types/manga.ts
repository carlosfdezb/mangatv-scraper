/**
 * MangaTV Scraper - TypeScript scraper for MangaTV (mangatv.net)
 * @module types/manga
 */

/**
 * Represents a manga type from the site
 */
export type MangaType = 'Manga' | 'MANHWA' | 'Manhua' | 'One-Shot' | 'Doujinshi' | 'Oel' | 'Novela' | 'ONE SHOT';

/**
 * Represents a demographic category
 */
export type Demographic = 'Seinen' | 'Shoujo' | 'Shounen' | 'Josei' | 'Kodomo';

/**
 * Represents a genre from the site
 */
export type Genre =
  | 'Accion'
  | 'Animacion'
  | 'Artes Marciales'
  | 'Aventura'
  | 'Belico'
  | 'Ciencia Ficcion'
  | 'Comedia'
  | 'Demonios'
  | 'Deportes'
  | 'Doujinshi'
  | 'Drama'
  | 'Ecchi'
  | 'Escolar'
  | 'Espacial'
  | 'Fantasía'
  | 'Gore'
  | 'Harem'
  | 'Historico'
  | 'Horror'
  | 'Infantil'
  | 'Josei'
  | 'Juegos'
  | 'Lucha Libre'
  | 'Magia'
  | 'Mecha'
  | 'Militar'
  | 'Misterio'
  | 'Musica'
  | 'Ninos'
  | 'Novela'
  | 'Parodia'
  | 'Policial'
  | 'Psicologico'
  | 'Realidad'
  | 'Romance'
  | 'Samurai'
  | 'Seinen'
  | 'Shoujo'
  | 'Shounen'
  | 'Sin Genero'
  | 'Sobrenatural'
  | 'Sof武林'
  | 'Supervivencia'
  | 'Telenovela'
  | 'Terror'
  | 'Thriller'
  | 'Vampiros'
  | 'Vida Cotidiana'
  | 'Yaoi'
  | 'Yuri';

/**
 * Represents a chapter of a manga
 */
export interface Chapter {
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
  /** Alternate scanlation versions (present only when groupVersions: true) */
  versions?: readonly ChapterVersion[];
}

/**
 * Chapter sort order
 */
export type ChapterOrder = 'asc' | 'desc';

/**
 * Alternate version of a chapter (different scanlation)
 */
export interface ChapterVersion {
  /** Chapter URL (/leer/{hash} format) */
  readonly url: string;
  /** Chapter hash from URL */
  readonly hash?: string;
  /** Scanlation group name */
  readonly scanlator?: string;
  /** Chapter release date */
  readonly date?: string;
}

/**
 * Options for getMangaDetail
 */
export interface MangaDetailOptions {
  /** Chapter order direction. Default: 'desc' (newest first) */
  readonly order?: ChapterOrder;
  /** Whether to group chapter versions. Default: false */
  readonly groupVersions?: boolean;
}

/**
 * Represents a single page in a chapter
 */
export interface ChapterPage {
  /** Page number, 1-indexed */
  readonly pageNumber: number;
  /** Full CDN image URL with https:// protocol */
  readonly imageUrl: string;
  /** Image format (webp or jpg) */
  readonly format: 'webp' | 'jpg';
}

/**
 * Represents all pages in a chapter with navigation.
 * 
 * **CDN Access**: Image URLs require a `Referer: https://mangatv.net/` header
 * to bypass Cloudflare anti-hotlink protection. Use `getCdnImageHeaders()` 
 * to get the required headers.
 */
export interface ChapterPages {
  /** Source chapter URL */
  readonly url: string;
  /** Chapter hash from URL (for /leer/ URLs) */
  readonly chapterHash?: string;
  /** Total number of pages */
  readonly totalPages: number;
  /** Ordered list of chapter pages */
  readonly pages: readonly ChapterPage[];
  /** URL to previous chapter, if available */
  readonly prevChapterUrl?: string;
  /** URL to next chapter, if available */
  readonly nextChapterUrl?: string;
}

/**
 * Represents a manga entry in list views
 */
export interface Manga {
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

/**
 * Represents detailed manga information
 */
export interface MangaDetail extends Manga {
  /** Full manga description/ synopsis */
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

/**
 * Sort order options for manga lists
 */
export type SortOrder = 'latest' | 'title' | 'titlereverse' | 'popular';

/**
 * Filters for manga list queries
 */
export interface MangaListFilters {
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
  /** Search query string (used with ?s= parameter) */
  searchQuery?: string;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
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
