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

  // Check for new site structure (.tsinfo exists) vs old fixture structure (.spe exists)
  const hasNewStructure = $('.tsinfo').length > 0;
  const hasOldStructure = $('.spe').length > 0;

  // Title: try new structure first (h1.entry-title), then old (h1 in infox)
  const title = 
    $('.infox h1.entry-title').text().trim() ||
    $('.bigcontent .infox h1').first().text().trim() || 
    '';

  // Cover: new structure uses .thumbook .thumb img, old uses .infox .cover img
  const coverUrl = 
    $('.thumbook .thumb img').attr('src') ||
    $('.bigcontent .infox .cover img').attr('src') ||
    '';

  // Type, Status, Demographics - new structure uses .tsinfo .imptdt
  let type: MangaType = 'Manga';
  let status = '';
  let demographics: Demographic[] = [];

  if (hasNewStructure) {
    // New structure: .tsinfo .imptdt contains "Estado", "Tipo", "Demografia"
    const $imptdt = $('.tsinfo .imptdt');
    
    $imptdt.each((_, el) => {
      const text = $(el).text();
      if (text.includes('Estado')) {
        // "Estado <i>Publicándose</i>" -> "Publicándose"
        status = $(el).find('i').text().trim() || text.replace('Estado', '').trim();
      } else if (text.includes('Tipo')) {
        // "Tipo <a>Manhua</a>" -> "Manhua"
        const typeLink = $(el).find('a');
        const typeText = typeLink.text().trim() || text.replace('Tipo', '').trim();
        type = normalizeMangaType(typeText);
      } else if (text.includes('Demografia')) {
        const demoLink = $(el).find('a');
        const demoText = demoLink.text().trim() || text.replace('Demografia', '').trim();
        if (demoText) {
          demographics = [demoText as Demographic];
        }
      }
    });
  } else if (hasOldStructure) {
    // Old structure: .spe .type, .spe .status, .spe .demographic
    const $spe = $('.bigcontent .infox .spe');
    
    const typeTextRaw = $spe.find('.type').text().trim();
    const typeText = typeTextRaw.replace(/^Tipo:\s*/i, '').trim();
    type = normalizeMangaType(typeText);
    
    const statusTextRaw = $spe.find('.status').text().trim();
    status = statusTextRaw.replace(/^Estado:\s*/i, '').trim();
    
    // Demographics can be in .spe .demographic OR in .wd-full .demographic
    const demographicText = 
      $spe.find('.demographic').text().trim() ||
      $('.bigcontent .infox .wd-full .demographic').text().trim();
    if (demographicText) {
      demographics = [demographicText as Demographic];
    }
  }

  // Author and Artist - new structure may not have these, fall back to old or empty
  let author = '';
  let artist = '';

  if (hasOldStructure) {
    const $spe = $('.bigcontent .infox .spe');
    const authorTextRaw = $spe.find('.author').text().trim();
    author = authorTextRaw.replace(/^Autor:\s*/i, '').trim();
    
    const artistTextRaw = $spe.find('.artist').text().trim();
    artist = artistTextRaw.replace(/^Artista:\s*/i, '').trim() || author;
  }

  // Genres from .mgen a elements (works for both structures)
  const genreTexts = 
    $('.wd-full .mgen a, .infox .mgen a').map((_, el) => $(el).text().trim()).get();
  const genres = genreTexts.filter(t => t.length > 0) as Genre[];

  // Description: new structure uses .wd-full containing "Sinopsis", old uses .description
  let description = '';
  
  if ($('.wd-full b').filter((_, el) => $(el).text().includes('Sinopsis')).length > 0) {
    // New structure: <b>Sinopsis</b><span>text</span>
    description = $('.wd-full')
      .filter((_, el) => $(el).find('b').text().includes('Sinopsis'))
      .find('span')
      .text()
      .trim();
  } else {
    // Old structure
    description = $('.bigcontent .infox .description').text().trim() || '';
  }

  // Rating - new structure uses .resultMedia{mangaId} format, old uses .rating .rating-num
  let rating = 0;
  let ratingCount = 0;
  
  // New structure: rating is in a div with class containing "resultMedia{mangaId}"
  const ratingSelector = `[class*="resultMedia${id}"]`;
  const resultMedia = $(ratingSelector).text();
  if (resultMedia) {
    // New: "Valoración: 5.00/5 (3 votos)"
    const ratingMatch = resultMedia.match(/Valoración:\s*(\d+(?:\.\d+)?)\/5\s*\((\d+)\s*votos?\)/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1] ?? '0');
      ratingCount = parseInt(ratingMatch[2] ?? '0', 10);
    }
  } else {
    // Old structure
    const ratingText = $('.bigcontent .infox .rating .rating-num').text().trim() || '0';
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    rating = ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : 0;
    
    const ratingCountText = $('.bigcontent .infox .rating .rating-count').text().trim() || '0';
    const ratingCountMatch = ratingCountText.match(/(\d+)/);
    ratingCount = ratingCountMatch?.[1] ? parseInt(ratingCountMatch[1], 10) : 0;
  }

  // Latest update - not directly available in detail page, use empty string
  const latestUpdate = '';

  // ERO check: look for .hot class or type containing "+18"
  const isEro = $('.bigcontent .infox .hot').length > 0 || 
    (hasOldStructure && $('.bigcontent .infox .spe .type').text().includes('+18'));

  // Parse chapters from .bxcl ul li
  const chapters = parseChaptersFromDetail($.html());

  // Full URL - use slug if available, otherwise omit
  const mangaUrl = slug && slug !== '-' 
    ? `${BASE_URL}/manga/${id}/${slug}` 
    : `${BASE_URL}/manga/${id}/`;

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
