/**
 * Unit tests for ListParser
 * @module test/parsers/list-parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseMangaList, parseMangaListResult, buildListUrl, parsePagination } from '../../src/scraper/parsers/list-parser.js';

const FIXTURES_DIR = join(__dirname, '../fixtures');

// Helper to load fixtures
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('ListParser', () => {
  describe('parseMangaList', () => {
    it('should parse manga cards from list page', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaList(html);
      
      expect(result).toHaveLength(5);
      
      // Check first manga
      const first = result[0];
      expect(first.id).toBe(36031);
      expect(first.title).toBe('Pequeño Hongo');
      expect(first.type).toBe('Manga');
      expect(first.coverUrl).toContain('cover_250x350.jpg');
      expect(first.rating).toBe(5);
      expect(first.isEro).toBe(true);
    });

    it('should parse all manga fields correctly', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaList(html);
      
      // Check second manga (no ERO)
      const second = result[1];
      expect(second.id).toBe(35823);
      expect(second.title).toBe('One Piece');
      expect(second.type).toBe('Manga');
      expect(second.isEro).toBe(false);
    });

    it('should parse MANHWA type correctly', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaList(html);
      
      const third = result[2];
      expect(third.id).toBe(35287);
      expect(third.type).toBe('MANHWA');
      expect(third.isEro).toBe(true);
    });

    it('should parse Manhua type correctly', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaList(html);
      
      const fourth = result[3];
      expect(fourth.id).toBe(34567);
      expect(fourth.type).toBe('Manhua');
    });

    it('should parse dates correctly', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaList(html);
      
      // First manga has "Hace 2 horas"
      const first = result[0];
      expect(first.latestUpdate).toBeTruthy();
      expect(first.latestUpdate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should return empty array for empty list page', () => {
      const html = loadFixture('empty-list.html');
      const result = parseMangaList(html);
      
      expect(result).toHaveLength(0);
    });

    it('should return empty array for page without listupd container', () => {
      const html = '<html><body><div class="other">No listupd here</div></body></html>';
      const result = parseMangaList(html);
      
      expect(result).toHaveLength(0);
    });

    it('should handle search results page', () => {
      const html = loadFixture('search-results.html');
      const result = parseMangaList(html);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(35823);
      expect(result[0].title).toBe('One Piece');
      expect(result[1].id).toBe(35901);
      expect(result[1].title).toBe('One Piece Color');
    });

    it('should handle updated page', () => {
      const html = loadFixture('updated-page.html');
      const result = parseMangaList(html);
      
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(36031);
      expect(result[0].title).toBe('Pequeño Hongo');
    });
  });

  describe('parsePagination', () => {
    it('should parse pagination from list page', () => {
      const html = loadFixture('list-page.html');
      const result = parsePagination(html);
      
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    it('should return page 1 when no pagination found', () => {
      const html = loadFixture('empty-list.html');
      const result = parsePagination(html);
      
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('parseMangaListResult', () => {
    it('should return paginated result with items', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaListResult(html);
      
      expect(result.items).toHaveLength(5);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
    });

    it('should return empty result for empty list', () => {
      const html = loadFixture('empty-list.html');
      const result = parseMangaListResult(html);
      
      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });

    it('should use filters page when provided', () => {
      const html = loadFixture('list-page.html');
      const result = parseMangaListResult(html, { page: 2 });
      
      expect(result.page).toBe(2);
    });
  });

  describe('buildListUrl', () => {
    it('should build base list URL without filters', () => {
      const url = buildListUrl();
      expect(url).toBe('/lista');
    });

    it('should build URL with search query', () => {
      const url = buildListUrl({ searchQuery: 'one piece' });
      expect(url).toContain('s=one+piece');
    });

    it('should build URL with genre filter', () => {
      const url = buildListUrl({ genre: ['Accion'] });
      expect(url).toContain('g=Accion');
    });

    it('should build URL with multiple genre filters', () => {
      const url = buildListUrl({ genre: ['Accion', 'Aventura'] });
      expect(url).toContain('g=Accion');
      expect(url).toContain('g=Aventura');
    });

    it('should build URL with type filter', () => {
      const url = buildListUrl({ type: ['MANHWA'] });
      expect(url).toContain('type=MANHWA');
    });

    it('should build URL with demographic filter', () => {
      const url = buildListUrl({ demographic: 'Seinen' });
      expect(url).toContain('demographic=Seinen');
    });

    it('should build URL with sort order', () => {
      const url = buildListUrl({ sort: 'popular' });
      expect(url).toContain('order=popular');
    });

    it('should not include order param for latest sort', () => {
      const url = buildListUrl({ sort: 'latest' });
      expect(url).not.toContain('order=');
    });

    it('should build URL with page number', () => {
      const url = buildListUrl({ page: 2 });
      expect(url).toContain('page=2');
    });

    it('should not include page 1 in URL', () => {
      const url = buildListUrl({ page: 1 });
      expect(url).not.toContain('page=');
    });

    it('should build URL with combined filters', () => {
      const url = buildListUrl({
        searchQuery: 'test',
        genre: ['Accion'],
        type: ['Manga'],
        demographic: 'Seinen',
        sort: 'popular',
        page: 3
      });
      
      expect(url).toContain('s=test');
      expect(url).toContain('g=Accion');
      expect(url).toContain('type=Manga');
      expect(url).toContain('demographic=Seinen');
      expect(url).toContain('order=popular');
      expect(url).toContain('page=3');
    });
  });
});
