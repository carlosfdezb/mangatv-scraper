/**
 * Detail page parser - parses manga detail pages
 * @module scraper/parsers/detail-parser
 */

import * as cheerio from 'cheerio';
import type { MangaDetail, MangaType, Demographic, Genre } from '../../types/manga.js';
import { BASE_URL } from '../../constants/index.js';
import { extractMangaFromUrl, normalizeMangaType } from '../../utils/helpers.js';
import { parseChaptersFromDetail } from './chapter-parser.js';

/**
 * Parse manga detail page
 * @param html - Raw HTML string from detail page
 * @param url - URL of the detail page
 * @returns Parsed MangaDetail object
 */
export function parseMangaDetail(html: string, url: string): MangaDetail {
  const $ = cheerio.load(html);

  // Extract manga ID and slug from URL
  const extracted = extractMangaFromUrl(url);
  const id = extracted?.id ?? 0;
  const slug = extracted?.slug ?? '';

  // Main container: .bigcontent .infox
  const $infox = $('.bigcontent .infox');

  // Title from h1
  const title = $infox.find('h1').first().text().trim() || '';

  // Cover from .cover img src
  const coverUrl = $infox.find('.cover img').attr('src') ?? '';

  // Metadata from .spe span elements
  const $spe = $infox.find('.spe');

  // Type: ".type" span text (e.g., "Tipo: Manga" -> "Manga")
  const typeTextRaw = $spe.find('.type').text().trim();
  const typeText = typeTextRaw.replace(/^Tipo:\s*/i, '').trim();
  const type: MangaType = normalizeMangaType(typeText);

  // Status: ".status" span text (e.g., "Estado: En publicación" -> "En publicación")
  const statusTextRaw = $spe.find('.status').text().trim();
  const status = statusTextRaw.replace(/^Estado:\s*/i, '').trim();

  // Author: ".author" span text (e.g., "Autor: Name" -> "Name")
  const authorTextRaw = $spe.find('.author').text().trim();
  const author = authorTextRaw.replace(/^Autor:\s*/i, '').trim();

  // Artist: ".artist" span text (e.g., "Artista: Name" -> "Name")
  const artistTextRaw = $spe.find('.artist').text().trim();
  const artist = artistTextRaw.replace(/^Artista:\s*/i, '').trim() || author;

  // Genres from .mgen a elements
  const genreTexts = $infox.find('.mgen a').map((_, el) => $(el).text().trim()).get();
  const genres = genreTexts.filter(t => t.length > 0) as Genre[];

  // Demographic from .demographic span
  const demographicText = $infox.find('.demographic').text().trim();
  const demographics: Demographic[] = demographicText ? [demographicText as Demographic] : [];

  // Description from .description
  const description = $infox.find('.description').text().trim() || '';

  // Rating from .rating .rating-num
  const ratingText = $infox.find('.rating .rating-num').text().trim() || '0';
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
  const rating = ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : 0;

  // Rating count from .rating .rating-count (e.g., "(1250 votos)" -> 1250)
  const ratingCountText = $infox.find('.rating .rating-count').text().trim() || '0';
  const ratingCountMatch = ratingCountText.match(/(\d+)/);
  const ratingCount = ratingCountMatch?.[1] ? parseInt(ratingCountMatch[1], 10) : 0;

  // Latest update - not directly available in detail page, use empty string
  const latestUpdate = '';

  // ERO check: look for .hot class or type containing "+18"
  const isEro = $infox.find('.hot').length > 0 || typeTextRaw.includes('+18');

  // Parse chapters from .bxcl ul li
  const chapters = parseChaptersFromDetail($.html());

  // Full URL
  const mangaUrl = `${BASE_URL}/manga/${id}/${slug}`;

  return {
    id,
    slug,
    title,
    type,
    coverUrl,
    latestUpdate,
    rating,
    ratingCount,
    isEro,
    url: mangaUrl,
    description,
    author,
    artist,
    status,
    demographics,
    genres,
    chapters,
  };
}

/**
 * Check if this parser can handle the given URL
 * @param url - URL to check
 * @returns True if URL is a manga detail page
 */
export function canParse(url: string): boolean {
  return url.includes('/manga/') && !url.includes('/capitulo/');
}
