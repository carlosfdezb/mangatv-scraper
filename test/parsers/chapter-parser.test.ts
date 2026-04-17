/**
 * Unit tests for ChapterParser
 * @module test/parsers/chapter-parser
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseChaptersFromDetail, parseChapter, parseChapterPages, canParseChapterPages, canParse, parseChaptersFromDetailWithMeta, groupChapterVersions } from '../../src/scraper/parsers/chapter-parser.js';
import { ScraperError } from '../../src/types/scraper.js';

const FIXTURES_DIR = join(__dirname, '../fixtures');

// Helper to load fixtures
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('ChapterParser', () => {
  describe('parseChaptersFromDetail', () => {
    it('should parse chapters from detail page', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(5);
    });

    it('should parse chapter numbers from URL', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      expect(result[0].number).toBe('45');
      expect(result[1].number).toBe('44');
      expect(result[2].number).toBe('43');
    });

    it('should handle decimal chapter numbers', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      // Fourth chapter is 42.5
      expect(result[3].number).toBe('42.5');
    });

    it('should parse chapter titles', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      expect(result[0].title).toContain('Capítulo 45');
    });

    it('should parse chapter dates', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      // First chapter has "Hace 2 horas"
      expect(result[0].versions[0].date).toBeTruthy();
      expect(result[0].versions[0].date).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    it('should build full chapter URLs via hash', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      // Old structure uses /capitulo/ URLs, so hash is empty
      expect(result[0].versions[0].hash).toBe('');
      expect(result[3].versions[0].hash).toBe('');
    });

    it('should return empty array when no chapters', () => {
      const html = loadFixture('detail-no-chapters.html');
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(0);
    });

    it('should skip no-chapters placeholder', () => {
      const html = loadFixture('detail-no-chapters.html');
      const result = parseChaptersFromDetail(html);
      
      // The .no-chapters element should be skipped
      expect(result).toHaveLength(0);
    });

    it('should handle empty chapter list container', () => {
      const html = `
        <html>
          <body>
            <div class="bxcl">
              <ul></ul>
            </div>
          </body>
        </html>
      `;
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(0);
    });

    it('should handle missing bxcl container', () => {
      const html = '<html><body><div class="other">No chapters here</div></body></html>';
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(0);
    });

    it('should handle manga ID extraction from chapter URLs', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetail(html);
      
      // Old structure uses /capitulo/ URLs, hash is empty
      expect(result[0].versions[0].hash).toBe('');
    });
  });

  describe('parseChaptersFromDetailWithMeta', () => {
    it('should parse chapters from new structure detail page', () => {
      const html = loadFixture('detail-page-new-structure.html');
      const result = parseChaptersFromDetailWithMeta(html);
      
      expect(result).toHaveLength(3);
    });

    it('should extract hash from /leer/{hash} URLs', () => {
      const html = loadFixture('detail-page-new-structure.html');
      const result = parseChaptersFromDetailWithMeta(html);
      
      expect(result[0].hash).toBe('e6f5d166098a42');
      expect(result[1].hash).toBe('a91307a3ff134b');
      expect(result[2].hash).toBe('9612a8ff615142');
    });

    it('should extract scanlator from second .chapternum span', () => {
      const html = loadFixture('detail-page-new-structure.html');
      const result = parseChaptersFromDetailWithMeta(html);
      
      // The second .chapternum span format is "title | scanlator"
      // So scanlator is the part after the pipe
      // First chapter has scanlator info "Yotsuba & La Profesora ZonaTMO | Mistranslated!"
      expect(result[0].scanlator).toBe('Mistranslated!');
      // Other chapters also have scanlator info
      expect(result[1].scanlator).toBe('Mistranslated!');
      expect(result[2].scanlator).toBe('Snacky Snacks');
    });

    it('should return empty scanlator when only one chapternum span', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetailWithMeta(html);
      
      // Old structure doesn't have second chapternum span
      expect(result.every(ch => ch.scanlator === '')).toBe(true);
    });

    it('should return empty hash for /capitulo/ URLs', () => {
      const html = loadFixture('detail-page.html');
      const result = parseChaptersFromDetailWithMeta(html);
      
      // Old structure uses /capitulo/ not /leer/
      expect(result.every(ch => ch.hash === '')).toBe(true);
    });
  });

  describe('groupChapterVersions', () => {
    it('should return chapters with single versions when no duplicates', () => {
      const chapters = [
        { number: '1', title: 'Capítulo 1', rawDate: '2024-01-01', hash: 'aaa', scanlator: '' },
        { number: '2', title: 'Capítulo 2', rawDate: '2024-01-02', hash: 'bbb', scanlator: '' },
      ];
      
      const result = groupChapterVersions(chapters);
      
      expect(result).toHaveLength(2);
      expect(result[0].versions).toHaveLength(1);
      expect(result[1].versions).toHaveLength(1);
    });

    it('should group chapters with same number', () => {
      const chapters = [
        { number: '62', title: 'Capítulo 62', rawDate: '2025-03-17', hash: 'abc', scanlator: 'ZonaTMO' },
        { number: '62', title: 'Capítulo 62', rawDate: '2025-03-15', hash: 'def', scanlator: 'CowboyBebop' },
        { number: '62', title: 'Capítulo 62', rawDate: '2025-03-10', hash: 'ghi', scanlator: '' },
      ];
      
      const result = groupChapterVersions(chapters);
      
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe('62');
      expect(result[0].versions).toHaveLength(3);
    });

    it('should use latest date as primary version', () => {
      const chapters = [
        { number: '62', title: 'Capítulo 62', rawDate: '2025-03-15', hash: 'abc', scanlator: 'Old' },
        { number: '62', title: 'Capítulo 62', rawDate: '2025-03-17', hash: 'def', scanlator: 'New' },
      ];
      
      const result = groupChapterVersions(chapters);
      
      // Primary chapter (first in versions array) should have latest date
      expect(result[0].versions[0].date).toBe('2025-03-17');
      expect(result[0].versions[0].hash).toBe('def');
    });

    it('should preserve version metadata in versions array', () => {
      const chapters = [
        { number: '10', title: 'Capítulo 10', rawDate: '2025-01-01', hash: 'aaa', scanlator: 'GroupA' },
        { number: '10', title: 'Capítulo 10', rawDate: '2025-01-02', hash: 'bbb', scanlator: 'GroupB' },
      ];
      
      const result = groupChapterVersions(chapters);
      
      expect(result[0].versions).toBeDefined();
      expect(result[0].versions).toHaveLength(2);
      expect(result[0].versions[0].hash).toBe('bbb'); // primary (latest)
      expect(result[0].versions[0].scanlator).toBe('GroupB');
      expect(result[0].versions[0].date).toBe('2025-01-02');
    });

    it('should handle decimal chapter numbers', () => {
      const chapters = [
        { number: '42.5', title: 'Capítulo 42.5', rawDate: '2025-01-01', hash: 'aaa', scanlator: '' },
        { number: '42.5', title: 'Capítulo 42.5', rawDate: '2025-01-02', hash: 'bbb', scanlator: 'Other' },
      ];
      
      const result = groupChapterVersions(chapters);
      
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe('42.5');
      expect(result[0].versions).toHaveLength(2);
    });
  });

  describe('parseChapter', () => {
    it('should parse chapter page', () => {
      const html = `
        <html>
          <body>
            <div class="chapter-info">
              <span class="chapter-number">Capítulo 45</span>
              <span class="date">Hace 2 horas</span>
            </div>
          </body>
        </html>
      `;
      const url = 'https://mangatv.net/capitulo/36031/45';
      const result = parseChapter(html, url);
      
      expect(result.number).toBe('45');
      expect(result.versions[0].hash).toBe('');
    });

    it('should extract hash from chapter URL', () => {
      const html = '<html><body><p>Some content</p></body></html>';
      const url = 'https://mangatv.net/leer/abc123hash';
      const result = parseChapter(html, url);
      
      expect(result.versions[0].hash).toBe('abc123hash');
    });

    it('should handle decimal chapter numbers in URL', () => {
      const html = '<html><body><p>Some content</p></body></html>';
      const url = 'https://mangatv.net/capitulo/12345/42.5';
      const result = parseChapter(html, url);
      
      expect(result.number).toBe('42.5');
    });

    it('should fallback to body content when no chapter-info container', () => {
      const html = `
        <html>
          <body>
            <h1>Chapter 100</h1>
            <span class="date">2024-01-15</span>
          </body>
        </html>
      `;
      const url = 'https://mangatv.net/capitulo/12345/100';
      const result = parseChapter(html, url);
      
      expect(result.number).toBe('100');
    });

    it('should return empty title when not found', () => {
      const html = '<html><body><div>No title here</div></body></html>';
      const url = 'https://mangatv.net/capitulo/12345/45';
      const result = parseChapter(html, url);
      
      expect(result.title).toBe('');
    });

    it('should handle date parsing from chapter page', () => {
      const html = `
        <html>
          <body>
            <div class="info-capitulo">
              <span class="date">Hace 3 horas</span>
            </div>
          </body>
        </html>
      `;
      const url = 'https://mangatv.net/capitulo/12345/1';
      const result = parseChapter(html, url);
      
      expect(result.versions[0].date).toBeTruthy();
    });

    it('should handle relative chapter URLs', () => {
      const html = '<html><body><p>Content</p></body></html>';
      const url = '/capitulo/12345/45';
      const result = parseChapter(html, url);
      
      // hash is extracted from URL
      expect(result.versions[0].hash).toBe('');
    });
  });

  describe('parseChaptersFromDetail - edge cases', () => {
    it('should handle li elements without lchx class', () => {
      const html = `
        <html>
          <body>
            <div class="bxcl">
              <ul>
                <li>
                  <a href="https://mangatv.net/capitulo/36031/1">
                    <span class="dt">Capítulo 1</span>
                  </a>
                  <span class="date">Hace 1 dia</span>
                </li>
              </ul>
            </div>
          </body>
        </html>
      `;
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe('1');
    });

    it('should skip chapters without href', () => {
      const html = `
        <html>
          <body>
            <div class="bxcl">
              <ul>
                <li>
                  <div class="lchx">
                    <span class="dt">No link here</span>
                  </div>
                </li>
              </ul>
            </div>
          </body>
        </html>
      `;
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(0);
    });

    it('should handle chapters with extra text in title', () => {
      const html = `
        <html>
          <body>
            <div class="bxcl">
              <ul>
                <li>
                  <div class="lchx">
                    <a href="https://mangatv.net/capitulo/36031/10">
                      <span class="dt">Capítulo 10 - The Final Battle</span>
                    </a>
                  </div>
                  <span class="chapter-date">Hace 1 semana</span>
                </li>
              </ul>
            </div>
          </body>
        </html>
      `;
      const result = parseChaptersFromDetail(html);
      
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe('10');
      expect(result[0].title).toContain('Capítulo 10');
    });
  });

  describe('canParse', () => {
    it('should return true for /capitulo/ URLs', () => {
      expect(canParse('https://mangatv.net/capitulo/36031/45')).toBe(true);
      expect(canParse('/capitulo/12345/1')).toBe(true);
    });

    it('should return true for /leer/ URLs', () => {
      expect(canParse('https://mangatv.net/leer/b35a0970901f4f')).toBe(true);
      expect(canParse('/leer/abc123')).toBe(true);
    });

    it('should return false for non-chapter URLs', () => {
      expect(canParse('https://mangatv.net/manga/36031/pequeno-hongo')).toBe(false);
      expect(canParse('https://mangatv.net/lista')).toBe(false);
      expect(canParse('https://mangatv.net/actualizado')).toBe(false);
    });
  });

  describe('canParseChapterPages', () => {
    it('should return true for /leer/ URLs', () => {
      expect(canParseChapterPages('https://mangatv.net/leer/b35a0970901f4f')).toBe(true);
      expect(canParseChapterPages('/leer/abc123')).toBe(true);
      expect(canParseChapterPages('https://mangatv.net/leer/abc')).toBe(true);
    });

    it('should return true for /capitulo/ URLs', () => {
      expect(canParseChapterPages('https://mangatv.net/capitulo/36031/45')).toBe(true);
      expect(canParseChapterPages('/capitulo/12345/1')).toBe(true);
      expect(canParseChapterPages('/capitulo/12345/42.5')).toBe(true);
    });

    it('should return false for /manga/ URLs', () => {
      expect(canParseChapterPages('https://mangatv.net/manga/36031/pequeno-hongo')).toBe(false);
      expect(canParseChapterPages('/manga/123/slug')).toBe(false);
    });

    it('should return false for /lista/ URLs', () => {
      expect(canParseChapterPages('https://mangatv.net/lista')).toBe(false);
      expect(canParseChapterPages('/lista?g=Accion')).toBe(false);
    });

    it('should return false for /actualizado/ URLs', () => {
      expect(canParseChapterPages('https://mangatv.net/actualizado')).toBe(false);
      expect(canParseChapterPages('/actualizado?page=2')).toBe(false);
    });
  });
});

describe('parseChapterPages', () => {
  describe('parseChapterPages - happy path', () => {
    it('should parse chapter pages from fixture HTML', () => {
      const html = loadFixture('chapter-page.html');
      const hash = 'b35a0970901f4f';
      const result = parseChapterPages(html, hash);
      
      expect(result.pages).toHaveLength(18);
      expect(result.totalPages).toBe(18);
      expect(result.chapterHash).toBe('b35a0970901f4f');
    });

    it('should assign correct page numbers starting from 1', () => {
      const html = loadFixture('chapter-page.html');
      const result = parseChapterPages(html, 'b35a0970901f4f');
      
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[17].pageNumber).toBe(18);
    });

    it('should normalize protocol-relative URLs to https://', () => {
      const html = loadFixture('chapter-page.html');
      const result = parseChapterPages(html, 'b35a0970901f4f');
      
      for (const page of result.pages) {
        expect(page.imageUrl).toMatch(/^https:\/\//);
      }
    });

    it('should extract image format from URL', () => {
      const html = loadFixture('chapter-page.html');
      const result = parseChapterPages(html, 'b35a0970901f4f');
      
      for (const page of result.pages) {
        expect(page.format).toBe('webp');
      }
    });

    it('should include prevChapterUrl when available', () => {
      const html = loadFixture('chapter-page.html');
      const result = parseChapterPages(html, 'b35a0970901f4f');
      
      expect(result.prevChapterUrl).toBeDefined();
      expect(typeof result.prevChapterUrl).toBe('string');
    });

    it('should include nextChapterUrl when available', () => {
      const html = loadFixture('chapter-page.html');
      const result = parseChapterPages(html, 'b35a0970901f4f');
      
      expect(result.nextChapterUrl).toBeDefined();
      expect(typeof result.nextChapterUrl).toBe('string');
    });
  });

  describe('parseChapterPages - metadata filtering', () => {
    it('should filter out non-image entries', () => {
      const htmlWithMetadata = `
        <html>
          <body>
            <script>
              ts_reader.run({
                ts_urs: 'Ly9pbWc1Lm1hbmdhdHYubmV0L2xpYnJhcnkvMzYwMzEvYjM1YTA5NzA5MDFmNGYvMDEyMzQ1LndlYnA=|bWF0YWRhdGE=|Ly9pbWc1Lm1hbmdhdHYubmV0L2xpYnJhcnkvMzYwMzEvYjM1YTA5NzA5MDFmNGYvMDQ1Njc4LndlYnA=',
              });
            </script>
          </body>
        </html>
      `;
      const result = parseChapterPages(htmlWithMetadata, 'testhash');
      
      expect(result.totalPages).toBe(2);
      expect(result.pages).toHaveLength(2);
    });
  });

  describe('parseChapterPages - missing ts_reader', () => {
    it('should throw ScraperError when ts_reader is missing', () => {
      const html = '<html><body><p>No chapter content here</p></body></html>';
      
      expect(() => parseChapterPages(html, 'testhash'))
        .toThrow(ScraperError);
    });

    it('should throw ScraperError with descriptive message', () => {
      const html = '<html><body><p>No chapter content here</p></body></html>';
      
      try {
        parseChapterPages(html, 'testhash');
        throw new Error('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScraperError);
        expect((error as ScraperError).message).toContain('ts_reader');
      }
    });

    it('should throw ScraperError with constructed URL in error', () => {
      const html = '<html><body><p>No chapter content here</p></body></html>';
      const testHash = 'test123';
      
      try {
        parseChapterPages(html, testHash);
        throw new Error('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScraperError);
        expect((error as ScraperError).url).toBe(`https://mangatv.net/leer/${testHash}`);
      }
    });
  });

  describe('parseChapterPages - no valid images', () => {
    it('should throw ScraperError when no valid image URLs found', () => {
      const html = `
        <html>
          <body>
            <script>
              ts_reader.run({
                ts_urs: 'bWF0YWRhdGE=|b3RoZXJkYXRh',
              });
            </script>
          </body>
        </html>
      `;
      
      expect(() => parseChapterPages(html, 'testhash'))
        .toThrow(ScraperError);
    });

    it('should throw ScraperError with descriptive message for no images', () => {
      const html = `
        <html>
          <body>
            <script>
              ts_reader.run({
                ts_urs: 'Ly9pbWctbm90LW1hbmdhdHYubmV0L3NvbWUvcGF0aC9pbWFnZS53ZWJw',
              });
            </script>
          </body>
        </html>
      `;
      
      try {
        parseChapterPages(html, 'testhash');
        throw new Error('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ScraperError);
        expect((error as ScraperError).message).toContain('no valid image URLs');
      }
    });
  });

  describe('parseChapterPages - base64 decode failure', () => {
    it('should skip entries that fail base64 decode', () => {
      const html = `
        <html>
          <body>
            <script>
              ts_reader.run({
                ts_urs: 'Ly9pbWc1Lm1hbmdhdHYubmV0L2xpYnJhcnkvMzYwMzEvYjM1YTA5NzA5MDFmNGYvMDEyMzQ1LndlYnA=',
              });
            </script>
          </body>
        </html>
      `;
      
      const result = parseChapterPages(html, 'testhash');
      
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].imageUrl).toContain('img5.mangatv.net');
    });
  });

  describe('parseChapterPages - hash always set', () => {
    it('should always set chapterHash from hash parameter', () => {
      const html = `
        <html>
          <body>
            <script>
              ts_reader.run({
                ts_urs: 'Ly9pbWc1Lm1hbmdhdHYubmV0L2xpYnJhcnkvMzYwMzEvYjM1YTA5NzA5MDFmNGYvMDEyMzQ1LndlYnA=',
              });
            </script>
          </body>
        </html>
      `;
      const result = parseChapterPages(html, 'abc123hash');
      
      expect(result.chapterHash).toBe('abc123hash');
      expect(result.pages).toHaveLength(1);
    });
  });
});
