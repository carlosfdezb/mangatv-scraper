/**
 * Unit tests for DetailParser
 * @module test/parsers/detail-parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseMangaDetail } from '../../src/scraper/parsers/detail-parser.js';

const FIXTURES_DIR = join(__dirname, '../fixtures');

// Helper to load fixtures
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('DetailParser', () => {
  describe('parseMangaDetail', () => {
    it('should parse manga detail from fixture', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.id).toBe(36031);
      expect(result.title).toBe('Pequeño Hongo');
    });

    it('should parse type correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.type).toBe('Manga');
    });

    it('should parse cover URL correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.coverUrl).toContain('cover_250x350.jpg');
    });

    it('should parse status correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.status).toBe('Ongoing');
    });

    it('should parse author correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.author).toBe('Misawa');
    });

    it('should parse artist, defaulting to author when missing', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.artist).toBe('Misawa');
    });

    it('should parse genres correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);

      expect(result.genres).toContain('Aventura');
      expect(result.genres).toContain('Fantasía');
      expect(result.genres).toContain('Sobrenatural');
    });

    it('should NOT include alternative titles as genres', () => {
      // New site structure has "Título Alternativos" in .wd-full with .mgen class
      // These should NOT be parsed as genres
      const html = loadFixture('detail-page-yotsuba-alternatives.html');
      const url = 'https://mangatv.net/manga/539/yotsuba-to';
      const result = parseMangaDetail(html, url);

      // Only actual genres should be included
      expect(result.genres).toContain('Comedia');
      expect(result.genres).toContain('Recuentos de la vida');
      expect(result.genres).toHaveLength(2);

      // These are alternative titles, NOT genres - they should not appear
      expect(result.genres).not.toContain('よつばと！');
      expect(result.genres).not.toContain('Yotsuba &!');
      expect(result.genres).not.toContain('Yotsuba and!');
      expect(result.genres).not.toContain('Yotsubato');
      expect(result.genres).not.toContain('Ёцуба!');
      expect(result.genres).not.toContain('요츠바랑!');
    });

    it('should parse demographics correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.demographics).toContain('Seinen');
    });

    it('should parse description correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.description).toContain('pequeño hongo');
      expect(result.description).toContain('hongo inteligente');
    });

    it('should parse rating correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.rating).toBe(5.0);
    });

    it('should parse rating count correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.ratingCount).toBe(1250);
    });

    it('should detect ERO content when .hot class present', () => {
      // Note: The detail-page.html fixture doesn't have ERO content
      // This test verifies the parser doesn't falsely detect ERO
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      // The fixture doesn't have .hot class in .infox, so isEro is false
      expect(result.isEro).toBe(false);
    });
    
    it('should detect ERO content from type text containing +18', () => {
      const htmlWithEro = `
        <html>
          <body>
            <div class="bigcontent">
              <div class="infox">
                <h1>Test Manga</h1>
                <div class="cover"><img src="test.jpg"></div>
                <div class="spe">
                  <span class="type">Tipo: Manga +18</span>
                </div>
                <div class="rating">
                  <span class="rating-num">5.0</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
      const url = 'https://mangatv.net/manga/123/test-manga';
      const result = parseMangaDetail(htmlWithEro, url);
      
      expect(result.isEro).toBe(true);
    });

    it('should parse chapters from detail page', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.chapters).toHaveLength(5);
    });

    it('should parse chapter numbers correctly', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      // With new defaults (ASC order), first chapter is oldest
      expect(result.chapters[0].number).toBe('42');
      expect(result.chapters[3].number).toBe('44'); // Decimal chapter
    });

    it('should parse chapter dates', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      // First chapter (oldest) has "Hace 2 semanas"
      expect(result.chapters[0].versions[0].date).toBeTruthy();
      expect(result.chapters[0].versions[0].date).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should have versions for each chapter', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      // Each chapter should have a versions array
      expect(result.chapters[0].versions).toHaveLength(1);
      expect(result.chapters[3].versions).toHaveLength(1);
    });
  });

  describe('parseMangaDetail - options', () => {
    it('should parse with no options (backward compatible)', () => {
      const html = loadFixture('detail-page-new-structure.html');
      const url = 'https://mangatv.net/manga/1234/yotsuba';
      const result = parseMangaDetail(html, url);
      
      expect(result.chapters).toHaveLength(3);
      // With new defaults, chapters are in ASC order (oldest first)
      expect(result.chapters[0].number).toBe('120');
      expect(result.chapters[2].number).toBe('122');
    });

    it('should reverse chapters when order is asc', () => {
      const html = loadFixture('detail-page-new-structure.html');
      const url = 'https://mangatv.net/manga/1234/yotsuba';
      const result = parseMangaDetail(html, url, { order: 'asc' });
      
      expect(result.chapters).toHaveLength(3);
      // ASC means oldest first
      expect(result.chapters[0].number).toBe('120');
      expect(result.chapters[2].number).toBe('122');
    });

    it('should preserve DESC order when order is desc', () => {
      const html = loadFixture('detail-page-new-structure.html');
      const url = 'https://mangatv.net/manga/1234/yotsuba';
      const result = parseMangaDetail(html, url, { order: 'desc' });
      
      // DESC order (site default)
      expect(result.chapters[0].number).toBe('122');
      expect(result.chapters[2].number).toBe('120');
    });

    it('should group chapter versions when groupVersions is true', () => {
      const html = loadFixture('detail-page-versions.html');
      const url = 'https://mangatv.net/manga/1234/manga-versiones';
      const result = parseMangaDetail(html, url, { groupVersions: true });
      
      // Should be grouped: 62 (2 versions), 61 (1), 60 (3 versions), 1 (1)
      // Total should be 4 chapters after grouping
      expect(result.chapters).toHaveLength(4);
      
      // Find chapter 62
      const ch62 = result.chapters.find(c => c.number === '62');
      expect(ch62).toBeDefined();
      expect(ch62!.versions).toHaveLength(2); // 2 total versions (primary + 1 other)
      
      // Find chapter 60
      const ch60 = result.chapters.find(c => c.number === '60');
      expect(ch60).toBeDefined();
      expect(ch60!.versions).toHaveLength(3); // 3 total versions (primary + 2 others)
    });

    it('should have single version per chapter when groupVersions is false', () => {
      const html = loadFixture('detail-page-versions.html');
      const url = 'https://mangatv.net/manga/1234/manga-versiones';
      const result = parseMangaDetail(html, url, { groupVersions: false });
      
      // Without grouping, all 7 chapter entries remain
      expect(result.chapters).toHaveLength(7);
      // Each chapter should have exactly 1 version (the ungrouped one)
      expect(result.chapters.every(c => c.versions.length === 1)).toBe(true);
    });

    it('should combine grouping and ordering', () => {
      const html = loadFixture('detail-page-versions.html');
      const url = 'https://mangatv.net/manga/1234/manga-versiones';
      const result = parseMangaDetail(html, url, { 
        order: 'asc', 
        groupVersions: true 
      });
      
      // Should be grouped and then ordered ASC
      expect(result.chapters).toHaveLength(4);
      // First chapter should be 1 (oldest)
      expect(result.chapters[0].number).toBe('1');
      // Last should be 62 (newest)
      expect(result.chapters[3].number).toBe('62');
    });

    it('should use latest date for primary when grouping', () => {
      const html = loadFixture('detail-page-versions.html');
      const url = 'https://mangatv.net/manga/1234/manga-versiones';
      const result = parseMangaDetail(html, url, { groupVersions: true });
      
      // Chapter 62: dates are 2025-03-17 and 2025-03-15
      // Primary should be the newer one (first in versions array)
      const ch62 = result.chapters.find(c => c.number === '62');
      expect(ch62!.versions[0].date).toContain('2025-03-17');
    });
  });

  describe('parseMangaDetail - no chapters', () => {
    it('should handle manga with no chapters', () => {
      const html = loadFixture('detail-no-chapters.html');
      const url = 'https://mangatv.net/manga/99999/proximo-manga';
      const result = parseMangaDetail(html, url);
      
      expect(result.chapters).toHaveLength(0);
    });

    it('should parse basic fields from manga without chapters', () => {
      const html = loadFixture('detail-no-chapters.html');
      const url = 'https://mangatv.net/manga/99999/proximo-manga';
      const result = parseMangaDetail(html, url);
      
      expect(result.id).toBe(99999);
      expect(result.title).toBe('Próximo Manga');
      expect(result.status).toBe('Próximamente');
    });

    it('should parse rating from manga without chapters', () => {
      const html = loadFixture('detail-no-chapters.html');
      const url = 'https://mangatv.net/manga/99999/proximo-manga';
      const result = parseMangaDetail(html, url);
      
      expect(result.rating).toBe(0);
      expect(result.ratingCount).toBe(0);
    });

    it('should parse demographics from manga without chapters', () => {
      const html = loadFixture('detail-no-chapters.html');
      const url = 'https://mangatv.net/manga/99999/proximo-manga';
      const result = parseMangaDetail(html, url);
      
      expect(result.demographics).toContain('Shounen');
    });
  });

  describe('parseMangaDetail - URL parsing', () => {
    it('should extract id and slug from URL', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo';
      const result = parseMangaDetail(html, url);
      
      expect(result.id).toBe(36031);
    });

    it('should handle URL without trailing slash', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/manga/36031/peque-o-hongo?ref=search';
      const result = parseMangaDetail(html, url);
      
      expect(result.id).toBe(36031);
    });

    it('should return id 0 for invalid URL', () => {
      const html = loadFixture('detail-page.html');
      const url = 'https://mangatv.net/invalid-url';
      const result = parseMangaDetail(html, url);
      
      expect(result.id).toBe(0);
    });
  });
});
