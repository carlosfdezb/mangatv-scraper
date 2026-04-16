/**
 * Parser exports
 * @module scraper/parsers
 */

export { 
  buildListUrl, 
  parseMangaList, 
  parseMangaListResult,
  parsePagination,
  canParse as canParseList 
} from './list-parser.js';

export { parseMangaDetail, canParse as canParseDetail } from './detail-parser.js';

export { 
  parseChapter, 
  parseChaptersFromDetail,
  parseChaptersFromDetailWithMeta,
  parseChapterPages,
  groupChapterVersions,
  canParse as canParseChapter,
  canParseChapterPages,
} from './chapter-parser.js';
