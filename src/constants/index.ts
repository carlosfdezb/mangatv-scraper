/**
 * Constants exports
 * @module constants
 */

export { BASE_URL, PATHS, IMAGE_CDN_SUBDOMAINS, buildUrl, buildMangaUrl, isMangaTvUrl, isCdnUrl } from './urls.js';
export { MANGA_TYPES, DEMOGRAPHICS, GENRES, SORT_ORDERS, getGenreDisplayName, isValidGenre, isValidMangaType, isValidDemographic } from './genres.js';
export type { SortOrderValue } from './genres.js';

/** Headers required to access mangatv.net CDN images */
export const CDN_HEADERS: Readonly<Record<string, string>> = {
  Referer: 'https://mangatv.net/',
} as const;
