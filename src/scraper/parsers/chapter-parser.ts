/**
 * Chapter page parser
 * @module scraper/parsers/chapter-parser
 */

import * as cheerio from 'cheerio';
import type { Chapter } from '../../types/manga.js';
import { BASE_URL } from '../../constants/index.js';
import { extractChapterNumber, extractMangaFromUrl, parseSiteDate } from '../../utils/helpers.js';

/**
 * Parse chapter list from detail page HTML
 * @param html - Raw HTML string from detail page
 * @returns Array of parsed Chapter objects
 */
export function parseChaptersFromDetail(html: string): Chapter[] {
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
  return url.includes('/capitulo/');
}
