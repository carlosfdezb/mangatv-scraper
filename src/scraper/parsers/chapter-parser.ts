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

  // Chapter container: .bxcl ul li
  const $chapterList = $('.bxcl ul');
  
  if ($chapterList.length === 0) {
    return chapters;
  }

  $chapterList.find('li').each((_, li) => {
    const $li = $(li);

    // Skip "no chapters" placeholder
    if ($li.find('.no-chapters').length > 0) {
      return;
    }

    // Chapter URL from .lchx a href
    const href = $li.find('.lchx a').attr('href') 
      || $li.find('a').attr('href') 
      || '';
    
    if (!href) return;

    // Extract chapter number from URL path like /capitulo/36031/45 -> "45"
    const chapterUrlMatch = href.match(/\/capitulo\/\d+\/([^\/]+)/);
    const numberFromUrl = chapterUrlMatch?.[1] ?? '';

    // Chapter title from .dt text (e.g., "Capítulo 45")
    const titleText = $li.find('.dt').text().trim() 
      || $li.find('.lchx a').text().trim() 
      || '';

    // Extract chapter number using helper
    const number = extractChapterNumber(numberFromUrl || titleText);

    // Chapter date from .chapter-date
    const dateRaw = $li.find('.chapter-date').text().trim() 
      || $li.find('.date').text().trim()
      || '';
    const date = parseSiteDate(dateRaw);

    // Extract manga ID from chapter URL if possible (for completeness)
    const mangaFromChapter = extractMangaFromUrl(href);
    const mangaId = mangaFromChapter?.id ?? 0;

    // Full chapter URL
    const chapterUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    chapters.push({
      id: mangaId, // Using mangaId as chapter identifier (no separate chapter ID in URL)
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
