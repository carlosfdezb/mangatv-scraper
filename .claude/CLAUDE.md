# MangaTV Scraper - AI Assistant Rules

## Skill Auto-Loading
When performing these actions, ALWAYS load the corresponding skill FIRST:

| Action | Load Skill | Why |
|--------|-----------|-----|
| Adding scraper methods | `mangatv-scraper` | Class structure, method signatures |
| Adding/modifying types | `mangatv-types` | Type definitions, interfaces |
| Writing HTML parsers | `mangatv-parser` | Selectors, data extraction |
| Modifying HTTP client | `mangatv-http` | Retry, rate limiting, headers |
| Writing tests | Use vitest patterns | Table-driven, mocking, fixtures |

Load skills by reading: `skills/{skill-name}/SKILL.md`
