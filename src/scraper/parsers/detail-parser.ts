/**
 * Detail page parser - parses manga detail pages
 * @module scraper/parsers/detail-parser
 */

import * as cheerio from 'cheerio';
import type { MangaDetail, MangaType, Demographic, Genre, MangaDetailOptions, Chapter } from '../../types/manga.js';
import { BASE_URL } from '../../constants/index.js';
import { extractMangaFromUrl, normalizeMangaType, normalizeImageUrl, normalizeStatus } from '../../utils/helpers.js';
import { parseChaptersFromDetail, parseChaptersFromDetailWithMeta, groupChapterVersions } from './chapter-parser.js';

/**
 * Parse manga detail page
 * @param html - Raw HTML string from detail page
 * @param url - URL of the detail page
 * @param options - Optional parsing options for chapter processing
 * @returns Parsed MangaDetail object
 */
export function parseMangaDetail(
  html: string, 
  url: string,
  options?: MangaDetailOptions
): MangaDetail {
  const $ = cheerio.load(html);

  // Extract manga ID from URL
  const extracted = extractMangaFromUrl(url);
  const id = extracted?.id ?? 0;

  // Check for new site structure (.tsinfo exists) vs old fixture structure (.spe exists)
  const hasNewStructure = $('.tsinfo').length > 0;
  const hasOldStructure = $('.spe').length > 0;

  // Title: try new structure first (h1.entry-title), then old (h1 in infox)
  const title = 
    $('.infox h1.entry-title').text().trim() ||
    $('.bigcontent .infox h1').first().text().trim() || 
    '';

  // Cover: new structure uses .thumbook .thumb img, old uses .infox .cover img
  const coverUrlRaw =
    $('.thumbook .thumb img').attr('src') ||
    $('.bigcontent .infox .cover img').attr('src') ||
    null;
  const coverUrl = coverUrlRaw ? normalizeImageUrl(coverUrlRaw) : null;

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
        const extractedStatus = $(el).find('i').text().trim() || text.replace('Estado', '').trim();
        status = normalizeStatus(extractedStatus);
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
    const extractedStatus = statusTextRaw.replace(/^Estado:\s*/i, '').trim();
    status = normalizeStatus(extractedStatus);
    
    // Demographics can be in .spe .demographic OR in .wd-full .demographic
    const demographicText = 
      $spe.find('.demographic').text().trim() ||
      $('.bigcontent .infox .wd-full .demographic').text().trim();
    if (demographicText) {
      demographics = [demographicText as Demographic];
    }
  }

  // Author and Artist - new structure may not have these, fall back to old or empty
  let author: string | null = null;
  let artist: string | null = null;

  if (hasOldStructure) {
    const $spe = $('.bigcontent .infox .spe');
    const authorTextRaw = $spe.find('.author').text().trim();
    const authorMatch = authorTextRaw.match(/^Autor:\s*(.+)/);
    author = authorMatch?.[1]?.trim() || null;
    
    const artistTextRaw = $spe.find('.artist').text().trim();
    const artistMatch = artistTextRaw.match(/^Artista:\s*(.+)/);
    artist = artistMatch?.[1]?.trim() || author; // default to author if artist not found
  }

  // Genres: new structure has .wd-full with <b>Generos</b> label (NOT "Título Alternativos" or "Sinonimos")
  // Old structure has genres directly in .infox .mgen
  let genreTexts: string[] = [];
  
  // Try new structure first: .wd-full containing "Generos" label
  const newStructureGenres = 
    $('.wd-full')
      .filter((_, el) => $(el).find('b').text().includes('Generos'))
      .find('.mgen a')
      .map((_, el) => $(el).text().trim())
      .get();
  
  if (newStructureGenres.length > 0) {
    genreTexts = newStructureGenres;
  } else {
    // Fallback to old structure: .infox .mgen a
    genreTexts = $('.infox .mgen a')
      .map((_, el) => $(el).text().trim())
      .get();
  }
  
  const genres = genreTexts.filter(t => t.length > 0) as Genre[];

  // Description: new structure uses .wd-full containing "Sinopsis", old uses .description
  let description: string | null = null;
  
  if ($('.wd-full b').filter((_, el) => $(el).text().includes('Sinopsis')).length > 0) {
    // New structure: <b>Sinopsis</b><span>text</span>
    const descText = $('.wd-full')
      .filter((_, el) => $(el).find('b').text().includes('Sinopsis'))
      .find('span')
      .text()
      .trim();
    description = descText || null;
  } else {
    // Old structure
    const descText = $('.bigcontent .infox .description').text().trim();
    description = descText || null;
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

  // Latest update - not directly available in detail page
  const latestUpdate: string | null = null;

  // ERO check: look for .hot class or type containing "+18"
  const isEro = $('.bigcontent .infox .hot').length > 0 || 
    (hasOldStructure && $('.bigcontent .infox .spe .type').text().includes('+18'));

  // Parse chapters from .bxcl ul li
  // Apply grouping and ordering based on options
  // Always use version-aware parser to extract hash/scanlator (versions is required on Chapter)
  // Default order is ASC (oldest first), reverse from site's DESC order
  // Only skip reversal when order is explicitly 'desc'
  let chapters: Chapter[];
  if (!options || options.order !== 'desc') {
    // Use the version-aware parser (always extracts hash/scanlator)
    const parsedChapters = parseChaptersFromDetailWithMeta($.html(), id);

    if (options?.groupVersions ?? true) {
      // Group versions if requested (default true)
      chapters = groupChapterVersions(parsedChapters);
    } else {
      // Convert ParsedChapter[] to Chapter[] with single-element versions
      chapters = parsedChapters.map(ch => ({
        number: ch.number,
        title: ch.title,
        versions: [{
          hash: ch.hash || '',
          scanlator: ch.scanlator || '',
          date: ch.rawDate,
        }],
      }));
    }

    // Reverse for ASC order (site order is DESC)
    // Default is ASC when no options or order is 'asc' or order is undefined
    // Only skip reversal when order is explicitly 'desc'
    if (!options || options.order !== 'desc') {
      chapters = [...chapters].reverse();
    }
    // If order is 'desc', keep natural DESC order (no reversal)
  } else {
    // Explicit order: 'desc' - use simpler parser, no grouping, no ordering
    chapters = parseChaptersFromDetail($.html(), id);
  }

  // Full URL - ID-only format
  const mangaUrl = `${BASE_URL}/manga/${id}/`;

  return {
    id,
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
