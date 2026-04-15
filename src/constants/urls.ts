/**
 * MangaTV Site URL Constants
 * @module constants/urls
 */

export const BASE_URL = 'https://mangatv.net';

export const PATHS = {
  HOME: '/',
  LIST: '/lista',
  MANGA: '/manga',
  UPDATED: '/actualizado',
  RANDOM: '/random',
  BOOKMARKS: '/boomark',
} as const;

export const IMAGE_CDN_SUBDOMAINS = [
  'img.mangatv.net',
  'img2.mangatv.net',
  'img3.mangatv.net',
  'img4.mangatv.net',
  'img5.mangatv.net',
] as const;

/**
 * Build a full URL from a path
 * @param path - The path (e.g., '/lista' or '/manga/123/slug')
 * @returns Full URL
 */
export function buildUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

/**
 * Build a manga detail URL
 * @param id - Manga ID (required)
 * @param slug - Manga slug (optional, omit for ID-only URL)
 * @returns Full manga detail URL
 */
export function buildMangaUrl(id: number, slug?: string): string {
  if (!slug || slug.trim() === '') {
    // No slug provided - use ID-only URL (site accepts /manga/{id} and /manga/{id}/)
    return buildUrl(`${PATHS.MANGA}/${id}/`);
  }
  return buildUrl(`${PATHS.MANGA}/${id}/${slug.trim()}`);
}

/**
 * Check if a URL is from the MangaTV domain
 * @param url - URL to check
 * @returns True if from MangaTV
 */
export function isMangaTvUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'mangatv.net' || 
           parsed.hostname.endsWith('.mangatv.net');
  } catch {
    return false;
  }
}

/**
 * Check if a URL is from the image CDN
 * @param url - URL to check
 * @returns True if from image CDN
 */
export function isCdnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return IMAGE_CDN_SUBDOMAINS.some(subdomain => 
      parsed.hostname === subdomain || parsed.hostname.endsWith(`.${subdomain}`)
    );
  } catch {
    return false;
  }
}
