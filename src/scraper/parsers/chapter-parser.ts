/**
 * Chapter page parser
 * @module scraper/parsers/chapter-parser
 */

import * as cheerio from 'cheerio';
import type { Chapter, ChapterPage, ChapterPages } from '../../types/manga.js';
import { BASE_URL } from '../../constants/index.js';
import { extractChapterNumber, extractMangaFromUrl, parseSiteDate } from '../../utils/helpers.js';
import { ScraperError } from '../../types/scraper.js';

/**
 * Internal intermediate type for parsed chapters before grouping.
 * Extends Chapter with hash and scanlator extracted during parsing.
 * Not exported - only used internally.
 */
interface ParsedChapter extends Chapter {
  /** Hash extracted from /leer/{hash} URL segment */
  hash: string;
  /** Scanlator from second .chapternum span */
  scanlator: string;
}

/**
 * Group chapters with the same number into single Chapter entries with versions.
 * When multiple versions exist (different scanlators), the first occurrence becomes
 * the primary chapter and subsequent ones are collected into the versions array.
 * @param chapters - Array of ParsedChapter with hash and scanlator info
 * @returns Grouped chapters with versions array
 */
export function groupChapterVersions(chapters: ParsedChapter[]): Chapter[] {
  // Group by normalized chapter number
  const grouped = new Map<string, ParsedChapter[]>();

  for (const chapter of chapters) {
    const normalizedNum = extractChapterNumber(chapter.number) || chapter.number;
    const existing = grouped.get(normalizedNum) || [];
    existing.push(chapter);
    grouped.set(normalizedNum, existing);
  }

  // Convert grouped chapters to final format
  const result: Chapter[] = [];

  for (const [, chapterList] of grouped) {
    if (chapterList.length === 1) {
      // Single version - no grouping needed, include no versions field
      const ch = chapterList[0];
      if (!ch) continue;
      result.push({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        date: ch.date,
        url: ch.url,
      });
    } else {
      // Multiple versions - group them
      // Sort by date descending to get the latest as primary
      const sorted = [...chapterList].sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        return dateB - dateA;
      });

      const primary = sorted[0];
      if (!primary) continue;
      const versions = sorted.slice(1).map(ch => ({
        url: ch.url,
        hash: ch.hash || undefined,
        scanlator: ch.scanlator || undefined,
        date: ch.date,
      }));

      result.push({
        id: primary.id,
        number: primary.number,
        title: primary.title,
        date: primary.date,
        url: primary.url,
        versions: versions,
      });
    }
  }

  return result;
}

/**
 * Parse chapter list from detail page HTML
 * @param html - Raw HTML string from detail page
 * @param options - Optional parsing options (for future use)
 * @returns Array of parsed Chapter objects
 */
export function parseChaptersFromDetail(
  html: string,
  options?: { extractVersions?: boolean }
): Chapter[] {
  const $ = cheerio.load(html);
  const chapters: Chapter[] = [];

  // NEW site structure: .bixbox.bxcl .s li (or .bxcl .s li)
  // The chapter list is in .bxcl with a .s div containing <li> elements directly
  // OLD structure: .bxcl ul li
  const $chapterList = $('.bxcl ul li');
  
  // If no chapters found with old structure, try new structure
  // In new structure, <li> elements are directly inside .s (not wrapped in <ul>)
  let $liElements = $chapterList;
  if ($liElements.length === 0) {
    // New structure: .bxcl .s > li or .bixbox.bxcl .s > li
    $liElements = $('.bxcl .s > li');
  }
  if ($liElements.length === 0) {
    // Try even more permissive: any li directly under .bxcl
    $liElements = $('li', '.bxcl');
  }
  
  if ($liElements.length === 0) {
    return chapters;
  }

  $liElements.each((_, li) => {
    const $li = $(li);

    // Skip "no chapters" placeholder
    if ($li.find('.no-chapters').length > 0) {
      return;
    }

    // Try NEW structure selectors first (.eph-num, .chapterdate, .dt a.dload)
    // Then fall back to OLD structure (.lchx, .chapter-date, .lchx a)
    let href = '';
    let titleText = '';
    let dateRaw = '';

    // NEW structure: URL is in .dt a.dload (or just .dt a)
    const newHref = $li.find('.dt a.dload').attr('href') 
      || $li.find('.dt a').attr('href')
      || '';
    
    // NEW structure: chapter info is in .eph-num
    const $ephNum = $li.find('.eph-num');
    
    if ($ephNum.length > 0) {
      // NEW structure: multiple .chapternum spans, first has "Capítulo X", rest have subtitle
      const $chapternumSpans = $ephNum.find('.chapternum');
      if ($chapternumSpans.length > 0) {
        // First span has main chapter info
        titleText = $chapternumSpans.first().text().trim();
        // Subsequent spans may have additional info like translator
      }
      // NEW structure: date is in .chapterdate (note: no hyphen)
      dateRaw = $ephNum.find('.chapterdate').text().trim()
        || $ephNum.find('.chapter-date').text().trim()
        || '';
    }

    // OLD structure fallbacks
    if (!href) {
      href = $li.find('.lchx a').attr('href') 
        || $li.find('a').attr('href') 
        || '';
    }
    if (!titleText) {
      titleText = $li.find('.dt').text().trim() 
        || $li.find('.lchx a').text().trim() 
        || '';
    }
    if (!dateRaw) {
      dateRaw = $li.find('.chapter-date').text().trim() 
        || $li.find('.date').text().trim()
        || '';
    }
    
    if (!href) return;

    // For NEW structure (/leer/{hash}), we can't extract chapter number from URL
    // For OLD structure (/capitulo/36031/45), we can extract from URL
    const chapterUrlMatch = href.match(/\/capitulo\/\d+\/([^\/]+)/);
    const numberFromUrl = chapterUrlMatch?.[1] ?? '';

    // Extract chapter number using helper (handles "Capítulo 45" format)
    const number = extractChapterNumber(numberFromUrl || titleText);

    // Parse the date
    const date = parseSiteDate(dateRaw);

    // Extract manga ID from chapter URL if possible
    const mangaFromChapter = extractMangaFromUrl(href);
    const mangaId = mangaFromChapter?.id ?? 0;

    // Full chapter URL
    const chapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    chapters.push({
      id: mangaId,
      number: number || numberFromUrl || '0',
      title: titleText,
      date,
      url: chapterUrl,
    });
  });

  return chapters;
}

/**
 * Parse chapter list from detail page HTML with full metadata extraction.
 * Returns internal ParsedChapter[] for use in grouping/ordering pipeline.
 * @param html - Raw HTML string from detail page
 * @returns Array of parsed chapters with hash and scanlator
 */
export function parseChaptersFromDetailWithMeta(html: string): ParsedChapter[] {
  const $ = cheerio.load(html);
  const chapters: ParsedChapter[] = [];

  const $chapterList = $('.bxcl ul li');
  let $liElements = $chapterList;
  if ($liElements.length === 0) {
    $liElements = $('.bxcl .s > li');
  }
  if ($liElements.length === 0) {
    $liElements = $('li', '.bxcl');
  }
  
  if ($liElements.length === 0) {
    return chapters;
  }

  // Extract hash from /leer/{hash} URL
  const extractHash = (url: string): string => {
    const match = url.match(/\/leer\/([\w]+)/);
    return match?.[1] ?? '';
  };

  // Extract scanlator from second .chapternum span
  const extractScanlator = ($li: cheerio.Cheerio): string => {
    const $ephNum = $li.find('.eph-num');
    if ($ephNum.length === 0) return '';
    
    const $chapternumSpans = $ephNum.find('.chapternum');
    if ($chapternumSpans.length <= 1) return '';
    
    // Second span contains text like "title | scanlator" or just "scanlator"
    // We want the part after the pipe (the scanlator name)
    const scanlatorText = $chapternumSpans.eq(1).text().trim();
    
    // Split by pipe and take the last part (scanlator name)
    const parts = scanlatorText.split('|');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 1 && lastPart) {
      // Return the part after the pipe, trimmed
      return lastPart.trim();
    }
    
    // If no pipe, return the whole text (might be just the scanlator)
    return scanlatorText;
  };

  $liElements.each((_, li) => {
    const $li = $(li);

    if ($li.find('.no-chapters').length > 0) {
      return;
    }

    let href = '';
    let titleText = '';
    let dateRaw = '';

    const newHref = $li.find('.dt a.dload').attr('href') 
      || $li.find('.dt a').attr('href')
      || '';
    
    const $ephNum = $li.find('.eph-num');
    
    if ($ephNum.length > 0) {
      const $chapternumSpans = $ephNum.find('.chapternum');
      if ($chapternumSpans.length > 0) {
        titleText = $chapternumSpans.first().text().trim();
      }
      dateRaw = $ephNum.find('.chapterdate').text().trim()
        || $ephNum.find('.chapter-date').text().trim()
        || '';
      if (newHref) {
        href = newHref;
      }
    }

    if (!href) {
      href = $li.find('.lchx a').attr('href') 
        || $li.find('a').attr('href') 
        || '';
    }
    if (!titleText) {
      titleText = $li.find('.dt').text().trim() 
        || $li.find('.lchx a').text().trim() 
        || '';
    }
    if (!dateRaw) {
      dateRaw = $li.find('.chapter-date').text().trim() 
        || $li.find('.date').text().trim()
        || '';
    }
    
    if (!href) return;

    const chapterUrlMatch = href.match(/\/capitulo\/\d+\/([^\/]+)/);
    const numberFromUrl = chapterUrlMatch?.[1] ?? '';

    const number = extractChapterNumber(numberFromUrl || titleText);

    const date = parseSiteDate(dateRaw);

    const mangaFromChapter = extractMangaFromUrl(href);
    const mangaId = mangaFromChapter?.id ?? 0;

    const chapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const hash = extractHash(href);
    const scanlator = extractScanlator($li);

    chapters.push({
      id: mangaId,
      number: number || numberFromUrl || '0',
      title: titleText,
      date,
      url: chapterUrl,
      hash,
      scanlator,
    });
  });

  return chapters;
}

/**
 * Parse a single chapter page for chapter information
 * @param html - Raw HTML string from chapter page
 * @param url - URL of the chapter page
 * @returns Parsed Chapter object
 */
export function parseChapter(html: string, url: string): Chapter {
  const $ = cheerio.load(html);

  // Extract chapter ID from URL like /capitulo/12345/45
  const urlMatch = url.match(/\/capitulo\/(\d+)\/([^\/]+)/);
  const id = urlMatch?.[1] ? parseInt(urlMatch[1], 10) : 0;
  const pathNumber = urlMatch?.[2] ?? '';

  // Try multiple selectors for chapter info container
  const contentSelectors = [
    '.chapter-info',
    '.info-capitulo',
    '[class*="chapter-info"]',
  ];

  let $content: cheerio.Cheerio | null = null;
  for (const selector of contentSelectors) {
    if ($(selector).length > 0) {
      $content = $(selector);
      break;
    }
  }

  $content = $content ?? $('body');

  // Extract chapter number
  const numberText = $content.find('.chapter-number, .num, [class*="number"]').first().text().trim()
    || pathNumber
    || '';
  const number = extractChapterNumber(numberText) || numberText;

  // Extract chapter title
  const title = $content.find('.chapter-title, .title, [class*="title"]').first().text().trim()
    || $content.find('h1, h2').first().text().trim()
    || '';

  // Extract date
  const dateRaw = $content.find('.date, [class*="date"]').first().text().trim() || '';
  const date = parseSiteDate(dateRaw);

  const chapterUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  return {
    id,
    number,
    title,
    date,
    url: chapterUrl,
  };
}

/**
 * Check if this parser can handle the given URL
 * @param url - URL to check
 * @returns True if URL is a chapter page
 */
export function canParse(url: string): boolean {
  return url.includes('/capitulo/') || url.includes('/leer/');
}

/**
 * Check if URL is a chapter pages URL (/leer/ or /capitulo/)
 * @param url - URL to check
 * @returns True if URL is a chapter pages URL
 */
export function canParseChapterPages(url: string): boolean {
  return /\/leer\/[\w]+/.test(url) || /\/capitulo\/\d+\/[^/?#]+/.test(url);
}

/**
 * Extract chapter hash from /leer/ URL
 * @param url - Chapter URL
 * @returns Chapter hash or undefined
 */
function extractChapterHash(url: string): string | undefined {
  const leerMatch = url.match(/\/leer\/([\w]+)/);
  if (leerMatch?.[1]) {
    return leerMatch[1];
  }
  return undefined;
}

/**
 * Extract base64-encoded image URLs from packed JavaScript
 * The site uses Dean Edwards packer format: eval(function(p,a,c,k,e,d){...}('data',56,56,'keys'))
 * @param html - Raw HTML string from chapter page
 * @returns Pipe-separated base64 string or empty string
 */
function extractFromPackedScript(html: string): string {
  // Find script tags with eval(function...) packed content
  // Use [\s\S]*? to match any character including newlines
  const packedRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = html.match(packedRegex);

  if (!matches || matches.length === 0) {
    return '';
  }

  for (const script of matches) {
    // Extract the base64 image URLs from the packed script
    // Look for Ly9pbWc... pattern (base64 of //img)
    const base64Pattern = /Ly9pbWc[A-Za-z0-9+/=|]+/g;
    const urlMatches = script.match(base64Pattern);

    if (urlMatches && urlMatches.length > 0) {
      return urlMatches.join('|');
    }
  }

  return '';
}

/**
 * Parse chapter pages from chapter page HTML
 * Extracts image URLs from packed ts_reader JavaScript variable
 * @param html - Raw HTML string from chapter page
 * @param url - URL of the chapter page
 * @returns ChapterPages with all decoded image URLs
 * @throws {ScraperError} When image data is missing or no valid images found
 */
export function parseChapterPages(html: string, url: string): ChapterPages {
  // Try to find base64-encoded image URLs in the HTML
  // The site uses JavaScript packer format, so we look for Ly9pbWc pattern
  
  // First, try the packed script approach (current site format)
  let encodedString = extractFromPackedScript(html);
  
  // Fallback: try finding ts_reader.run with direct base64 (old format)
  if (!encodedString) {
    const scriptRegex = /ts_reader\.run\s*\(\s*\{[\s\S]*?ts_urs\s*:\s*['"]([^'"]+)['"]/gi;
    const scriptMatch = html.match(scriptRegex);
    if (scriptMatch && scriptMatch[0]) {
      const match = scriptMatch[0].match(/ts_urs\s*:\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        encodedString = match[1];
      }
    }
  }
  
  if (!encodedString) {
    throw new ScraperError(
      'Failed to extract chapter content: ts_reader variable not found in page HTML',
      url,
      undefined,
      false
    );
  }
  
  // Split by pipe and decode each part
  const parts = encodedString.split('|');
  const decodedUrls: string[] = [];
  
  for (const part of parts) {
    if (!part || part.length < 10) continue; // Skip empty or too-short strings
    
    try {
      const decoded = Buffer.from(part, 'base64').toString('utf-8');
      if (decoded.startsWith('//img')) {
        decodedUrls.push(decoded);
      }
    } catch {
      // Skip parts that fail to decode
    }
  }
  
  // Filter to only CDN image URLs (matching img{N}.mangatv.net/library/)
  const cdnPattern = /^\/\/img\d+\.mangatv\.net\/library\//;
  const imageUrls = decodedUrls.filter(url => cdnPattern.test(url));
  
  if (imageUrls.length === 0) {
    throw new ScraperError(
      'Failed to extract chapter content: no valid image URLs found after decoding',
      url,
      undefined,
      false
    );
  }
  
  // Normalize protocol-relative URLs to https://
  const normalizedUrls = imageUrls.map(u => u.replace(/^\/\//, 'https://'));
  
  // Extract format from URL (webp or jpg)
  const extractFormat = (urlString: string): 'webp' | 'jpg' => {
    if (urlString.includes('.webp')) return 'webp';
    if (urlString.includes('.jpg')) return 'jpg';
    if (urlString.includes('.jpeg')) return 'jpg';
    return 'webp'; // default to webp
  };
  
  // Build chapter pages array
  const pages: ChapterPage[] = normalizedUrls.map((imageUrl, index) => ({
    pageNumber: index + 1,
    imageUrl,
    format: extractFormat(imageUrl),
  }));
  
  // Extract chapter hash from URL if present
  const chapterHash = extractChapterHash(url);
  
  // Try to extract prev/next chapter URLs from navigation links
  const $ = cheerio.load(html);
  let prevChapterUrl: string | undefined;
  let nextChapterUrl: string | undefined;
  
  // Look for prev/next navigation links
  const navSelectors = [
    '.nav-prev a',
    '.nav-next a',
    '.chapter-nav .prev a',
    '.chapter-nav .next a',
    'a[rel="prev"]',
    'a[rel="next"]',
    '.p-2 a', // common pagination pattern
  ];
  
  for (const selector of navSelectors) {
    const $prevLink = $(selector).first();
    if ($prevLink.length > 0) {
      const href = $prevLink.attr('href');
      if (href) {
        if (!prevChapterUrl && selector.includes('prev')) {
          prevChapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        }
        if (!nextChapterUrl && selector.includes('next')) {
          nextChapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        }
      }
    }
  }
  
  // Also check for class-based nav links
  const $allLinks = $('a');
  $allLinks.each((_, el) => {
    const $el = $(el);
    const className = $el.attr('class') || '';
    const href = $el.attr('href') || '';
    
    if (className.includes('prev') && !prevChapterUrl) {
      prevChapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    }
    if (className.includes('next') && !nextChapterUrl) {
      nextChapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    }
  });
  
  return {
    url,
    chapterHash,
    totalPages: pages.length,
    pages,
    prevChapterUrl,
    nextChapterUrl,
  };
}
