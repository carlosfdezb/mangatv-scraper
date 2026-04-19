/**
 * Unit tests for helper functions
 * @module test/utils/helpers
 */

import { describe, it, expect } from 'vitest';
import {
  extractMangaFromUrl,
  parseRatingFromRel,
  extractChapterNumber,
  normalizeMangaType,
  buildListUrl,
  safeJsonParse,
  parseSiteDate,
  normalizeString,
  slugify,
  extractId,
  sleep,
  chunkArray,
  deduplicateByKey,
  getCdnImageHeaders,
} from '../../src/utils/helpers.js';
import { SORT_ORDERS, CDN_HEADERS, isCdnUrl } from '../../src/constants/index.js';

describe('Helpers', () => {
  describe('extractMangaFromUrl', () => {
    it('should extract id from full URL', () => {
      const result = extractMangaFromUrl('https://mangatv.net/manga/36031/peque-o-hongo');
      expect(result).toEqual({ id: 36031 });
    });

    it('should extract from URL with query params', () => {
      const result = extractMangaFromUrl('https://mangatv.net/manga/35823/one-piece?ref=search');
      expect(result).toEqual({ id: 35823 });
    });

    it('should extract from relative path', () => {
      const result = extractMangaFromUrl('/manga/35287/solo-leveling');
      expect(result).toEqual({ id: 35287 });
    });

    it('should return null for invalid URL format', () => {
      expect(extractMangaFromUrl('https://mangatv.net/lista')).toBeNull();
    });

    it('should extract id for URL without slug', () => {
      expect(extractMangaFromUrl('https://mangatv.net/manga/36031')).toEqual({ id: 36031 });
    });

    it('should return null for invalid id', () => {
      expect(extractMangaFromUrl('https://mangatv.net/manga/abc')).toBeNull();
    });

    it('should return null for negative id', () => {
      expect(extractMangaFromUrl('https://mangatv.net/manga/-1')).toBeNull();
    });

    it('should return null for zero id', () => {
      expect(extractMangaFromUrl('https://mangatv.net/manga/0')).toBeNull();
    });

    it('should handle URL with hash fragment', () => {
      const result = extractMangaFromUrl('https://mangatv.net/manga/12345/test-manga#section');
      expect(result).toEqual({ id: 12345 });
    });
  });

  describe('parseRatingFromRel', () => {
    it('should parse valid JSON rel attribute', () => {
      const result = parseRatingFromRel('{"numStar":5,"manga_id":36031}');
      expect(result).toEqual({ rating: 5, mangaId: 36031 });
    });

    it('should parse rating of 4', () => {
      const result = parseRatingFromRel('{"numStar":4,"manga_id":35287}');
      expect(result).toEqual({ rating: 4, mangaId: 35287 });
    });

    it('should return 0 rating for missing numStar', () => {
      const result = parseRatingFromRel('{"manga_id":36031}');
      expect(result).toEqual({ rating: 0, mangaId: 36031 });
    });

    it('should return 0 for invalid JSON', () => {
      const result = parseRatingFromRel('not valid json');
      expect(result).toEqual({ rating: 0, mangaId: 0 });
    });

    it('should return fallback for empty string', () => {
      const result = parseRatingFromRel('');
      expect(result).toEqual({ rating: 0, mangaId: 0 });
    });

    it('should handle partial JSON', () => {
      const result = parseRatingFromRel('{"numStar":3}');
      expect(result.rating).toBe(3);
      expect(result.mangaId).toBe(0);
    });
  });

  describe('extractChapterNumber', () => {
    it('should extract chapter number from "Capítulo 45"', () => {
      expect(extractChapterNumber('Capítulo 45')).toBe('45');
    });

    it('should extract decimal chapter from "Capítulo 42.5"', () => {
      expect(extractChapterNumber('Capítulo 42.5')).toBe('42.5');
    });

    it('should extract from "Cap 100"', () => {
      expect(extractChapterNumber('Cap 100')).toBe('100');
    });

    it('should extract from "Chapter 10"', () => {
      expect(extractChapterNumber('Chapter 10')).toBe('10');
    });

    it('should extract from "Extra 1"', () => {
      expect(extractChapterNumber('Extra 1')).toBe('1');
    });

    it('should extract plain number as fallback', () => {
      expect(extractChapterNumber('Some text 42 more')).toBe('42');
    });

    it('should return empty string when no number found', () => {
      expect(extractChapterNumber('No number here')).toBe('');
    });

    it('should handle case insensitivity', () => {
      expect(extractChapterNumber('CAPÍTULO 45')).toBe('45');
      expect(extractChapterNumber('cap 100')).toBe('100');
      expect(extractChapterNumber('CHAPTER 10')).toBe('10');
    });
  });

  describe('normalizeMangaType', () => {
    it('should normalize "Manga"', () => {
      expect(normalizeMangaType('Manga')).toBe('Manga');
    });

    it('should normalize "MANHWA"', () => {
      expect(normalizeMangaType('MANHWA')).toBe('MANHWA');
    });

    it('should normalize "Manhwa"', () => {
      expect(normalizeMangaType('Manhwa')).toBe('MANHWA');
    });

    it('should normalize "manhwa"', () => {
      expect(normalizeMangaType('manhwa')).toBe('MANHWA');
    });

    it('should normalize "Manhua"', () => {
      expect(normalizeMangaType('Manhua')).toBe('Manhua');
    });

    it('should normalize "One-Shot"', () => {
      expect(normalizeMangaType('One-Shot')).toBe('One-Shot');
    });

    it('should normalize "one shot" (with space)', () => {
      expect(normalizeMangaType('one shot')).toBe('One-Shot');
    });

    it('should return "Manga" for unknown types', () => {
      expect(normalizeMangaType('UnknownType')).toBe('Manga');
    });

    it('should handle whitespace', () => {
      expect(normalizeMangaType('  Manga  ')).toBe('Manga');
    });
  });

  describe('buildListUrl', () => {
    it('should build base list URL', () => {
      const url = buildListUrl();
      expect(url).toBe('https://mangatv.net/lista');
    });

    it('should build URL with search query', () => {
      const url = buildListUrl({ searchQuery: 'one piece' });
      expect(url).toContain('s=one+piece');
    });

    it('should build URL with genre filter', () => {
      const url = buildListUrl({ genre: ['Accion'] });
      expect(url).toContain('g=Accion');
    });

    it('should build URL with multiple genres', () => {
      const url = buildListUrl({ genre: ['Accion', 'Aventura'] });
      expect(url).toContain('g=Accion');
      expect(url).toContain('g=Aventura');
    });

    it('should build URL with type filter', () => {
      const url = buildListUrl({ type: ['MANHWA'] });
      expect(url).toContain('type=MANHWA');
    });

    it('should build URL with demographic', () => {
      const url = buildListUrl({ demographic: 'Seinen' });
      expect(url).toContain('demographic=Seinen');
    });

    it('should build URL with sort order', () => {
      const url = buildListUrl({ sort: 'popular' });
      expect(url).toContain('order=popular');
    });

    it('should not include order for latest sort', () => {
      const url = buildListUrl({ sort: 'latest' });
      expect(url).not.toContain('order=');
    });

    it('should build URL with page number', () => {
      const url = buildListUrl({ page: 2 });
      expect(url).toContain('page=2');
    });

    it('should not include page 1', () => {
      const url = buildListUrl({ page: 1 });
      expect(url).not.toContain('page=');
    });

    it('should handle explicit page parameter override', () => {
      const url = buildListUrl({ page: 3 }, 5);
      expect(url).toContain('page=5');
    });

    it('should build URL with all filters combined', () => {
      const url = buildListUrl({
        searchQuery: 'test',
        genre: ['Accion'],
        type: ['Manga'],
        demographic: 'Seinen',
        sort: 'popular',
        page: 2
      });
      
      expect(url).toContain('s=test');
      expect(url).toContain('g=Accion');
      expect(url).toContain('type=Manga');
      expect(url).toContain('demographic=Seinen');
      expect(url).toContain('order=popular');
      expect(url).toContain('page=2');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key":"value"}', { key: 'fallback' });
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const result = safeJsonParse('not json', { key: 'fallback' });
      expect(result).toEqual({ key: 'fallback' });
    });

    it('should return fallback for empty string', () => {
      const result = safeJsonParse('', { key: 'fallback' });
      expect(result).toEqual({ key: 'fallback' });
    });

    it('should handle arrays', () => {
      const result = safeJsonParse('[1,2,3]', []);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle numbers', () => {
      const result = safeJsonParse('42', 0);
      expect(result).toBe(42);
    });
  });

  describe('parseSiteDate', () => {
    it('should parse "Hace 2 horas"', () => {
      const result = parseSiteDate('Hace 2 horas');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should parse "Hace 5 horas"', () => {
      const result = parseSiteDate('Hace 5 horas');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should parse "Ayer"', () => {
      const result = parseSiteDate('Ayer');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should parse "Hace 3 dias"', () => {
      const result = parseSiteDate('Hace 3 dias');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should parse ISO date format', () => {
      const result = parseSiteDate('2024-01-15');
      expect(result).toBe('2024-01-15T00:00:00.000Z');
    });

    it('should return original for unrecognized format', () => {
      const result = parseSiteDate('Some random date');
      expect(result).toBe('Some random date');
    });
  });

  describe('normalizeString', () => {
    it('should lowercase', () => {
      expect(normalizeString('HELLO')).toBe('hello');
    });

    it('should trim whitespace', () => {
      expect(normalizeString('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeString('hello   world')).toBe('hello world');
    });
  });

  describe('slugify', () => {
    it('should lowercase', () => {
      expect(slugify('HELLO')).toBe('hello');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('should remove accents', () => {
      expect(slugify('café')).toBe('cafe');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('  hello  ')).toBe('hello');
    });

    it('should handle unicode characters', () => {
      expect(slugify('日本語')).toBe('');
    });
  });

  describe('extractId', () => {
    it('should extract ID with pattern', () => {
      const result = extractId('/manga/36031/test', /\/manga\/(\d+)/);
      expect(result).toBe(36031);
    });

    it('should return null when no match', () => {
      const result = extractId('/invalid', /\/manga\/(\d+)/);
      expect(result).toBeNull();
    });
  });

  describe('sleep', () => {
    it('should resolve after specified ms', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into specified size', () => {
      const result = chunkArray([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle array smaller than chunk size', () => {
      const result = chunkArray([1, 2], 5);
      expect(result).toEqual([[1, 2]]);
    });

    it('should handle empty array', () => {
      const result = chunkArray([], 2);
      expect(result).toEqual([]);
    });
  });

  describe('deduplicateByKey', () => {
    it('should deduplicate by key function', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }];
      const result = deduplicateByKey(items, item => item.id);
      expect(result).toHaveLength(3);
    });

    it('should preserve first occurrence', () => {
      const items = [{ id: 1, name: 'a' }, { id: 1, name: 'b' }];
      const result = deduplicateByKey(items, item => item.id);
      expect(result[0].name).toBe('a');
    });
  });

  describe('getCdnImageHeaders', () => {
    it('should return an object with Referer header', () => {
      const headers = getCdnImageHeaders();
      expect(headers).toHaveProperty('Referer');
      expect(headers.Referer).toBe('https://mangatv.net/');
    });

    it('should return the same headers object each time', () => {
      const headers1 = getCdnImageHeaders();
      const headers2 = getCdnImageHeaders();
      expect(headers1).toBe(headers2);
    });
  });

  describe('isCdnUrl', () => {
    it('should return true for img.mangatv.net', () => {
      expect(isCdnUrl('https://img.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return true for img2.mangatv.net', () => {
      expect(isCdnUrl('https://img2.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return true for img3.mangatv.net', () => {
      expect(isCdnUrl('https://img3.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return true for img4.mangatv.net', () => {
      expect(isCdnUrl('https://img4.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return true for img5.mangatv.net', () => {
      expect(isCdnUrl('https://img5.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return true for img0002.mangatv.net', () => {
      expect(isCdnUrl('https://img0002.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return true for img0001.mangatv.net', () => {
      expect(isCdnUrl('https://img0001.mangatv.net/image.jpg')).toBe(true);
    });

    it('should return false for random domain', () => {
      expect(isCdnUrl('https://random.com/image.jpg')).toBe(false);
    });

    it('should return false for non-mangatv img domain', () => {
      expect(isCdnUrl('https://img.other.com/image.jpg')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isCdnUrl('https://IMG.Mangatv.Net/image.jpg')).toBe(true);
      expect(isCdnUrl('https://IMG2.mangatv.net/image.jpg')).toBe(true);
    });
  });

  describe('CDN_HEADERS', () => {
    it('should have Referer set to mangatv.net URL', () => {
      expect(CDN_HEADERS.Referer).toBe('https://mangatv.net/');
    });
  });
});
