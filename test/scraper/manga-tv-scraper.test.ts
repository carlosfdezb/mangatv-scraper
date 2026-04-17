/**
 * Unit tests for MangaTVScraper
 * @module test/scraper/manga-tv-scraper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MangaTVScraper, createScraper } from '../../src/scraper/manga-tv-scraper.js';
import { ScraperError } from '../../src/types/scraper.js';

const FIXTURES_DIR = join(__dirname, '../fixtures');

// Helper to load fixtures
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

// Mock HTTP client response type
interface MockHttpResponse {
  data: string;
  status: number;
  headers: Record<string, string>;
  url: string;
}

describe('MangaTVScraper', () => {
  let scraper: MangaTVScraper;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scraper = new MangaTVScraper();
    // Mock the client's get method
    mockGet = vi.fn();
    // Replace the client's get with our mock
    vi.spyOn(scraper.getClient(), 'get').mockImplementation(mockGet);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create scraper with default config', () => {
      const scraper = new MangaTVScraper();
      expect(scraper).toBeInstanceOf(MangaTVScraper);
    });

    it('should create scraper with custom base URL', () => {
      const scraper = new MangaTVScraper({ baseUrl: 'https://test.example.com' });
      expect(scraper).toBeInstanceOf(MangaTVScraper);
    });

    it('should expose getClient method', () => {
      const client = scraper.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('listManga', () => {
    it('should fetch and parse manga list', async () => {
      const html = loadFixture('list-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      const result = await scraper.listManga();

      expect(result.items).toHaveLength(5);
      expect(result.items[0].id).toBe(36031);
      expect(result.items[0].title).toBe('Pequeño Hongo');
    });

    it('should build correct URL without filters', async () => {
      const html = loadFixture('list-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      await scraper.listManga();

      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/lista');
    });

    it('should build URL with genre filter', async () => {
      const html = loadFixture('list-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      await scraper.listManga({ genre: ['Accion'] });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('g=Accion')
      );
    });

    it('should build URL with pagination', async () => {
      const html = loadFixture('list-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      await scraper.listManga({ page: 2 });

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });

    it('should wrap errors in ScraperError', async () => {
      mockGet.mockRejectedValue(new Error('Network failure'));

      await expect(scraper.listManga()).rejects.toThrow(ScraperError);
    });

    it('should preserve ScraperError from catch block', async () => {
      const originalError = new ScraperError('Original error', 'https://mangatv.net/lista');
      mockGet.mockRejectedValue(originalError);

      await expect(scraper.listManga()).rejects.toThrow('Original error');
    });
  });

  describe('searchManga', () => {
    it('should search manga with query', async () => {
      const html = loadFixture('search-results.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista?s=one+piece',
      });

      const result = await scraper.searchManga('one piece');

      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('One Piece');
    });

    it('should build URL with search query', async () => {
      const html = loadFixture('search-results.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      await scraper.searchManga('one piece');

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('s=one+piece')
      );
    });

    it('should add page parameter when specified', async () => {
      const html = loadFixture('search-results.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      await scraper.searchManga('one piece', 2);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });

    it('should throw ScraperError for empty query', async () => {
      await expect(scraper.searchManga('')).rejects.toThrow('Search query cannot be empty');
    });

    it('should throw ScraperError for whitespace-only query', async () => {
      await expect(scraper.searchManga('   ')).rejects.toThrow('Search query cannot be empty');
    });

    it('should trim query before searching', async () => {
      const html = loadFixture('search-results.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/lista',
      });

      await scraper.searchManga('  one piece  ');

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('s=one+piece')
      );
    });
  });

  describe('getLatestUpdates', () => {
    it('should fetch updated page', async () => {
      const html = loadFixture('updated-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/actualizado',
      });

      const result = await scraper.getLatestUpdates();

      expect(result.items).toHaveLength(4);
      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/actualizado');
    });

    it('should add page parameter when specified', async () => {
      const html = loadFixture('updated-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/actualizado',
      });

      await scraper.getLatestUpdates(2);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
    });

    it('should not add page parameter for page 1', async () => {
      const html = loadFixture('updated-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/actualizado',
      });

      await scraper.getLatestUpdates(1);

      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/actualizado');
    });

    it('should wrap errors in ScraperError', async () => {
      mockGet.mockRejectedValue(new Error('Network failure'));

      await expect(scraper.getLatestUpdates()).rejects.toThrow(ScraperError);
    });
  });

  describe('getMangaDetail', () => {
    it('should fetch and parse manga detail', async () => {
      const html = loadFixture('detail-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/36031/peque-o-hongo',
      });

      const result = await scraper.getMangaDetail(36031);

      expect(result.id).toBe(36031);
      expect(result.title).toBe('Pequeño Hongo');
      expect(result.chapters).toHaveLength(5);
    });

    it('should build correct detail URL', async () => {
      const html = loadFixture('detail-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/36031/peque-o-hongo',
      });

      await scraper.getMangaDetail(36031);

      expect(mockGet).toHaveBeenCalledWith(
        'https://mangatv.net/manga/36031/'
      );
    });

    it('should throw ScraperError for invalid ID', async () => {
      await expect(scraper.getMangaDetail(0)).rejects.toThrow('Invalid manga ID');
    });

    it('should throw ScraperError for negative ID', async () => {
      await expect(scraper.getMangaDetail(-1)).rejects.toThrow('Invalid manga ID');
    });

    it('should work without slug (omits slug from URL)', async () => {
      const fixtureHtml = readFileSync(join(FIXTURES_DIR, 'detail-page.html'), 'utf-8');
      mockGet.mockResolvedValueOnce({ data: fixtureHtml, status: 200, headers: {}, url: 'https://mangatv.net/manga/36031/' });

      // Calling without slug should use ID-only URL
      const result = await scraper.getMangaDetail(36031);
      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/manga/36031/');
      expect(result.id).toBe(36031);
    });

    it('should work with empty options', async () => {
      const fixtureHtml = readFileSync(join(FIXTURES_DIR, 'detail-page.html'), 'utf-8');
      mockGet.mockResolvedValueOnce({ data: fixtureHtml, status: 200, headers: {}, url: 'https://mangatv.net/manga/36031/' });

      // Empty options object should work
      const result = await scraper.getMangaDetail(36031, {});
      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/manga/36031/');
      expect(result.id).toBe(36031);
    });

    it('should wrap errors in ScraperError', async () => {
      mockGet.mockRejectedValue(new Error('Network failure'));

      await expect(scraper.getMangaDetail(36031))
        .rejects.toThrow(ScraperError);
    });
  });

  describe('getMangaDetail - options', () => {
    it('should accept options parameter without error', async () => {
      const html = loadFixture('detail-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/36031/peque-o-hongo',
      });

      const result = await scraper.getMangaDetail(36031, {});
      
      expect(result.id).toBe(36031);
    });

    it('should pass options to parser', async () => {
      const html = loadFixture('detail-page-new-structure.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/1234/yotsuba',
      });

      const result = await scraper.getMangaDetail(1234, { order: 'asc' });
      
      // ASC order: oldest first
      expect(result.chapters[0].number).toBe('120');
      expect(result.chapters[2].number).toBe('122');
    });

    it('should group chapter versions when groupVersions is true', async () => {
      const html = loadFixture('detail-page-versions.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/1234/manga-versiones',
      });

      const result = await scraper.getMangaDetail(1234, { groupVersions: true });
      
      // Should be grouped: 62 (2), 61 (1), 60 (3), 1 (1) = 4 total
      expect(result.chapters).toHaveLength(4);
    });

    it('should combine order and groupVersions options', async () => {
      const html = loadFixture('detail-page-versions.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/1234/manga-versiones',
      });

      const result = await scraper.getMangaDetail(1234, { 
        order: 'asc', 
        groupVersions: true 
      });
      
      // Grouped and ordered ASC
      expect(result.chapters[0].number).toBe('1');
      expect(result.chapters[3].number).toBe('62');
    });
  });

  describe('getRandomManga', () => {
    it('should fetch random page and follow redirect', async () => {
      const html = loadFixture('detail-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/36031/peque-o-hongo', // Final URL after redirect
      });

      const result = await scraper.getRandomManga();

      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/random');
      expect(result.id).toBe(36031);
    });

    it('should use final URL from redirect for parsing', async () => {
      const html = loadFixture('detail-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/36031/peque-o-hongo',
      });

      const result = await scraper.getRandomManga();

      expect(result.url).toContain('36031');
    });

    it('should wrap errors in ScraperError', async () => {
      mockGet.mockRejectedValue(new Error('Network failure'));

      await expect(scraper.getRandomManga()).rejects.toThrow(ScraperError);
    });

    it('should throw ScraperError when response is not string', async () => {
      mockGet.mockResolvedValue({
        data: { not: 'a string' },
        status: 200,
        headers: {},
        url: 'https://mangatv.net/manga/36031/peque-o-hongo',
      });

      await expect(scraper.getRandomManga()).rejects.toThrow(ScraperError);
    });
  });

  describe('getChapterPages', () => {
    it('should fetch and parse chapter pages from hash', async () => {
      const html = loadFixture('chapter-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/leer/b35a0970901f4f',
      });

      const result = await scraper.getChapterPages('b35a0970901f4f');

      expect(result.pages).toHaveLength(18);
      expect(result.totalPages).toBe(18);
      expect(result.chapterHash).toBe('b35a0970901f4f');
      expect(result.prevChapterUrl).toBeDefined();
      expect(result.nextChapterUrl).toBeDefined();
    });

    it('should build correct /leer/ URL from hash', async () => {
      const html = loadFixture('chapter-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/leer/b35a0970901f4f',
      });

      await scraper.getChapterPages('b35a0970901f4f');

      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/leer/b35a0970901f4f');
    });

    it('should throw ScraperError for empty hash', async () => {
      await expect(scraper.getChapterPages('')).rejects.toThrow(ScraperError);
      await expect(scraper.getChapterPages('')).rejects.toThrow('Hash cannot be empty');
    });

    it('should throw ScraperError for whitespace-only hash', async () => {
      await expect(scraper.getChapterPages('   ')).rejects.toThrow(ScraperError);
      await expect(scraper.getChapterPages('   ')).rejects.toThrow('Hash cannot be empty');
    });

    it('should throw ScraperError for invalid hash with special chars', async () => {
      await expect(scraper.getChapterPages('hash-with-dashes'))
        .rejects.toThrow(ScraperError);
      await expect(scraper.getChapterPages('hash-with-dashes'))
        .rejects.toThrow(/Invalid chapter hash/);
    });

    it('should throw ScraperError for hash with spaces', async () => {
      await expect(scraper.getChapterPages('abc def'))
        .rejects.toThrow(ScraperError);
    });

    it('should trim hash before use', async () => {
      const html = loadFixture('chapter-page.html');
      mockGet.mockResolvedValue({
        data: html,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/leer/b35a0970901f4f',
      });

      await scraper.getChapterPages('  b35a0970901f4f  ');

      expect(mockGet).toHaveBeenCalledWith('https://mangatv.net/leer/b35a0970901f4f');
    });

    it('should wrap network errors in ScraperError with retryable flag', async () => {
      mockGet.mockRejectedValue(new Error('Network failure'));

      try {
        await scraper.getChapterPages('b35a0970901f4f');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScraperError);
        expect((error as ScraperError).isRetryable).toBe(true);
      }
    });

    it('should throw non-retryable ScraperError for 404', async () => {
      mockGet.mockRejectedValue(new Error('status code 404'));

      try {
        await scraper.getChapterPages('nonexistent');
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScraperError);
        expect((error as ScraperError).isRetryable).toBe(false);
        expect((error as ScraperError).statusCode).toBe(404);
      }
    });

    it('should preserve ScraperError from parser', async () => {
      const htmlWithoutTsReader = '<html><body><p>No chapter</p></body></html>';
      mockGet.mockResolvedValue({
        data: htmlWithoutTsReader,
        status: 200,
        headers: {},
        url: 'https://mangatv.net/leer/b35a0970901f4f',
      });

      await expect(scraper.getChapterPages('b35a0970901f4f'))
        .rejects.toThrow(ScraperError);
      await expect(scraper.getChapterPages('b35a0970901f4f'))
        .rejects.toThrow(/ts_reader/);
    });
  });

  describe('createScraper factory', () => {
    it('should create scraper instance', () => {
      const scraper = createScraper();
      expect(scraper).toBeInstanceOf(MangaTVScraper);
    });

    it('should pass config to scraper', () => {
      const scraper = createScraper({ timeout: 5000 });
      expect(scraper).toBeInstanceOf(MangaTVScraper);
    });
  });

  describe('setCfCookie', () => {
    it('should set Cloudflare cookie on client', () => {
      const setCfCookieSpy = vi.spyOn(scraper.getClient(), 'setCfCookie');
      
      scraper.setCfCookie('test_cookie_value');
      
      expect(setCfCookieSpy).toHaveBeenCalledWith('test_cookie_value');
    });
  });
});
