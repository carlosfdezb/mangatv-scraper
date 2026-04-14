/**
 * Chapter page parser
 * @module scraper/parsers/chapter-parser
 */

import * as cheerio from 'cheerio';
import type { Chapter } from '../../types/manga.js';
import { BASE_URL } from '../../constants/index.js';

/**
 * Parse chapter page for chapter information
 */
export function parseChapter(html: string, url: string): Chapter {
  const $ = cheerio.load(html);
  
  // Extract chapter ID from URL like /capitulo/12345/1
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
  const numberMatch = numberText.match(/(\d+(?:\.\d+)?)/);
  const number = numberMatch?.[1] ?? numberText;

  // Extract chapter title
  const title = $content.find('.chapter-title, .title, [class*="title"]').first().text().trim()
    || $content.find('h1, h2').first().text().trim()
    || '';

  // Extract date
  const date = $content.find('.date, [class*="date"]').first().text().trim()
    || '';

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
 */
export function canParse(url: string): boolean {
  return url.includes('/capitulo/');
}
