/**
 * Detail page parser - parses manga detail pages
 * @module scraper/parsers/detail-parser
 */

import * as cheerio from 'cheerio';
import type { MangaDetail, Chapter, MangaType, Demographic, Genre } from '../../types/manga.js';
import { BASE_URL } from '../../constants/index.js';

/**
 * Parse manga type from text
 */
function parseMangaType(typeStr: string): MangaType {
  const normalized = typeStr.trim().toUpperCase().replace(/\s+/g, '-');
  const typeMap: Record<string, MangaType> = {
    'MANGA': 'Manga',
    'MANHWA': 'MANHWA',
    'MANHUA': 'Manhua',
    'ONE-SHOT': 'One-Shot',
    'DOUJINSHI': 'Doujinshi',
    'OEL': 'Oel',
    'NOVELA': 'Novela',
    'ONE SHOT': 'ONE SHOT',
  };
  return typeMap[normalized] ?? 'Manga';
}

/**
 * Parse demographics from text array
 */
function parseDemographics(texts: string[]): Demographic[] {
  const demographics: Demographic[] = [];
  const validDemographics: Demographic[] = ['Seinen', 'Shoujo', 'Shounen', 'Josei', 'Kodomo'];
  
  for (const text of texts) {
    const normalized = text.trim();
    if (validDemographics.includes(normalized as Demographic)) {
      demographics.push(normalized as Demographic);
    }
  }
  
  return demographics;
}

/**
 * Parse genres from text array
 */
function parseGenres(texts: string[]): Genre[] {
  // This would typically be validated against the full GENRES list
  return texts.map(t => t.trim()).filter(t => t.length > 0) as Genre[];
}

/**
 * Parse chapter list from HTML
 */
function parseChapters($: cheerio.Root, containerSelector: string): Chapter[] {
  const chapters: Chapter[] = [];
  
  $(containerSelector).find('a').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href') ?? '';
    
    // Parse chapter ID from URL like /capitulo/12345/1
    const match = href.match(/\/capitulo\/(\d+)\/([^\/]+)/);
    if (!match || !match[1]) return;

    const id = parseInt(match[1], 10);
    const chapterPath = match[2] ?? '';
    
    // Extract chapter number from path or text
    const numberText = $el.find('.chapter-number, .num, [class*="number"]').text().trim()
      || chapterPath
      || '';
    const numberMatch = numberText.match(/(\d+(?:\.\d+)?)/);
    const number = numberMatch?.[1] ?? (numberText || chapterPath);
    
    // Extract chapter title
    const title = $el.find('.chapter-title, .title, [class*="title"]').text().trim()
      || $el.text().trim()
      || '';
    
    // Extract date
    const date = $el.find('.date, [class*="date"]').text().trim()
      || '';
    
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    chapters.push({
      id,
      number,
      title,
      date,
      url,
    });
  });

  return chapters;
}

/**
 * Parse manga detail page
 */
export function parseMangaDetail(html: string, url: string): MangaDetail {
  const $ = cheerio.load(html);
  
  // Extract manga ID and slug from URL
  const urlMatch = url.match(/\/manga\/(\d+)\/([^/]+)/);
  const id = urlMatch?.[1] ? parseInt(urlMatch[1], 10) : 0;
  const slug = urlMatch?.[2] ?? '';
  
  // Try multiple selectors for the main content container
  const contentSelectors = [
    '.manga-detail',
    '.manga-info',
    '.info-manga',
    '[class*="manga-detail"]',
    '[class*="manga-info"]',
  ];
  
  let $content: cheerio.Cheerio | null = null;
  for (const selector of contentSelectors) {
    if ($(selector).length > 0) {
      $content = $(selector);
      break;
    }
  }
  
  // Default to body if no specific container found
  $content = $content ?? $('body');

  // Extract title
  const title = $content.find('h1.title, h1, .manga-title, [class*="title"]').first().text().trim()
    ?? $('h1').first().text().trim()
    ?? '';

  // Extract cover image
  const coverUrl = $content.find('img.cover, .cover img, [class*="cover"] img').attr('src')
    ?? $content.find('img').first().attr('src')
    ?? '';

  // Extract type
  const typeText = $content.find('.type, .badge, [class*="type"]').first().text().trim() ?? 'Manga';
  const type = parseMangaType(typeText);

  // Extract description/synopsis
  const description = $content.find('.description, .sinopsis, [class*="description"], [class*="sinopsis"]').text().trim()
    ?? '';

  // Extract author
  const author = $content.find('.author, [class*="author"]').first().text().trim()
    ?? '';

  // Extract artist
  const artist = $content.find('.artist, [class*="artist"]').first().text().trim()
    ?? author; // Fallback to author

  // Extract status
  const status = $content.find('.status, [class*="status"]').first().text().trim()
    ?? '';

  // Extract demographics
  const demographicTexts = $content.find('.demographic, [class*="demographic"]').map((_, el) => $(el).text()).get();
  const demographics = parseDemographics(demographicTexts);

  // Extract genres
  const genreTexts = $content.find('.genre, .genres a, [class*="genre"]').map((_, el) => $(el).text()).get();
  const genres = parseGenres(genreTexts);

  // Extract rating
  const ratingText = $content.find('.rating, [class*="rating"]').first().text().trim() || '0';
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
  const rating = ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : 0;

  // Extract rating count
  const ratingCountText = $content.find('.votes, [class*="votes"]').first().text().trim() || '0';
  const ratingCountMatch = ratingCountText.match(/(\d+)/);
  const ratingCount = ratingCountMatch?.[1] ? parseInt(ratingCountMatch[1], 10) : 0;

  // Extract latest update
  const latestUpdate = $content.find('.update, [class*="update"]').first().text().trim()
    ?? '';

  // Extract chapters
  const chapters = parseChapters($, '.chapters, .chapter-list, [class*="chapter"]');

  // Check for 18+ content
  const isEro = $content.find('.ero, [class*="ero"]').length > 0 
    || typeText.toLowerCase().includes('ero');

  // Build full URL
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
 */
export function canParse(url: string): boolean {
  return url.includes('/manga/') && !url.includes('/capitulo/');
}
