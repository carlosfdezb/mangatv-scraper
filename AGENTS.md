# AGENTS.md — mangatv-scraper

## Project Overview

**mangatv-scraper** is a TypeScript npm package for scraping manga data from [mangatv.net](https://mangatv.net/), a Spanish manga reading site.

### Architecture

- **Main class**: `MangaTVScraper` — entry point with methods for `list()`, `search()`, `getDetails()`, `getUpdated()`, `getRandom()`
- **Parser pattern**: Separate parsers for list pages (`ListParser`), detail pages (`DetailParser`), and chapter pages (`ChapterParser`)
- **HTTP client**: Custom client with retry logic, rate limiting, and Cloudflare bypass
- **Strong types**: Full TypeScript coverage for Manga, MangaDetail, Chapter, Filters, and all related types

### Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript 5.x (strict) | Type safety throughout |
| Node.js 20+ (ESM) | Runtime with native ESM |
| tsup | Dual CJS/ESM builds |
| vitest | Testing with `describe/it/expect` patterns |
| cheerio | HTML parsing and selector-based extraction |
| got / undici | HTTP client with retry and interceptors |
| CFInterceptor | Cloudflare bypass when needed |

### Site Structure

| Endpoint | Description |
|----------|-------------|
| `https://mangatv.net/` | Homepage |
| `https://mangatv.net/lista` | Manga list with filters |
| `https://mangatv.net/lista?s={query}` | Search results |
| `https://mangatv.net/manga/{id}/{slug}` | Manga detail page |
| `https://mangatv.net/actualizado` | Recently updated manga |
| `https://mangatv.net/random` | Random manga redirect |

---

## Core Rule

This project follows an **ATL/SDD workflow**:

```
explore → propose → spec → design → tasks → apply → verify → archive
```

The orchestrator coordinates the workflow.
The orchestrator must delegate real work to the correct SDD phase agent or support specialist.

**Support agents must not replace the main SDD phases.**

---

## Main SDD Phases

### @sdd-explore
Use for initial investigation, codebase reading, context discovery, constraints, dependencies, and existing patterns.

### @sdd-propose
Use to propose the implementation approach, alternatives, tradeoffs, and recommended path.

### @sdd-spec
Use to write precise requirements, acceptance criteria, expected behavior, and constraints.

### @sdd-design
Use to define architecture, technical decisions, interfaces, data flow, and implementation strategy.

### @sdd-tasks
Use to break the approved design into ordered, executable tasks.

### @sdd-apply
Use to implement the approved tasks.
**Do not delegate from this agent.** Keep changes focused and aligned with spec/design.

### @sdd-verify
Use to validate implementation against spec, design, and expected behavior.
**Do not implement new features here unless explicitly requested.**

### @sdd-archive
Use to summarize final changes, decisions, verification results, and pending items.

---

## Support Agents

### @sdd-bug-hunter
Use when implemented code fails, regressions appear, logs are suspicious, or a bug is hard to reproduce.

### @sdd-contract-check
Use when changes affect API contracts, DTOs, schemas, props, validation, serialization, frontend/backend compatibility, request/response shape, or typing.

### @sdd-test-writer
Use after apply or before verify when tests are needed. Follows vitest patterns (not go-testing).

### @sdd-code-review
Use for larger changes, risky refactors, architecture-sensitive edits, or final technical review before archive.

---

## Available Skills

| Skill | Description | File |
|-------|-------------|------|
| `mangatv-scraper` | Scraper patterns, MangaTVScraper class, parsers, HTTP client | `skills/mangatv-scraper/SKILL.md` |
| `mangatv-types` | TypeScript type definitions, Manga, MangaDetail, Chapter, Filters | `skills/mangatv-types/SKILL.md` |
| `mangatv-parser` | HTML parsing patterns, cheerio/selectors, data extraction | `skills/mangatv-parser/SKILL.md` |
| `mangatv-http` | HTTP client patterns, rate limiting, retry, Cloudflare handling | `skills/mangatv-http/SKILL.md` |

---

## Auto-invoke Skills

| Action | Invoke First | Why |
|--------|--------------|-----|
| Adding scraper methods | `mangatv-scraper` | Class structure, method signatures, error handling patterns |
| Adding/modifying types | `mangatv-types` | Type definitions, interfaces, enums consistency |
| Writing HTML parsers | `mangatv-parser` | Selector patterns, data extraction, type mapping |
| Modifying HTTP client | `mangatv-http` | Retry logic, rate limiting, headers, Cloudflare bypass |
| Writing tests | `vitest` patterns | Table-driven tests, mocking HTTP, fixture loading |
| Debugging parse failures | `mangatv-parser` | Selector updates, edge case handling |

---

## How Skills Work

Skills are loaded via the `/skill` command when their trigger condition is detected.

```
User: "add a method to get manga chapters"
→ System detects "scraper method" context
→ Orchestrator loads `mangatv-scraper` skill
→ Agent receives full skill instructions before starting
```

Skills inject domain-specific instructions, conventions, and patterns into the sub-agent context.

---

## Skill Structure

```
skills/
├── setup.sh                         # Skill sync/install script
├── mangatv-scraper/
│   └── SKILL.md                     # Main scraper class patterns
├── mangatv-types/
│   └── SKILL.md                     # TypeScript type conventions
├── mangatv-parser/
│   └── SKILL.md                     # HTML parsing & selector patterns
└── mangatv-http/
    └── SKILL.md                     # HTTP client & retry patterns
```

---

## Key Conventions

### TypeScript

- **Strict mode always** — no `any` types, no implicit `any`
- **Immutable return types** — use `readonly`, `Readonly<T>`, `as const`
- **Discriminated unions** for state types (e.g., `LoadingState<T>`)
- **Exhaustive matching** on union types

### Error Handling

```typescript
// Error hierarchy
MangaTVError (base)
├── NetworkError      // Connection failures, timeouts
├── RateLimitError    // 429 responses, site blocking
├── CloudflareError   // CF challenge detected
├── ParseError        // HTML structure unexpected
├── NotFoundError      // 404, manga not found
└── ValidationError   // Invalid input parameters
```

### HTTP Client

- **Rate limit**: Minimum 1 second between requests (respect the site)
- **Retry**: 3 attempts with exponential backoff for transient failures
- **Headers**: Realistic user-agent, accept-language for Spanish content
- **Cloudflare**: Detect challenge pages, retry after challenge solved

### Parser Pattern

```typescript
interface Parser<T> {
  parse(html: string): T;
  canParse(url: string): boolean;
}

// Each parser is focused on one page type
class ListParser implements Parser<MangaListResult> { ... }
class DetailParser implements Parser<MangaDetail> { ... }
class ChapterParser implements Parser<Chapter[]> { ... }
```

### JSDoc

All public methods must have JSDoc comments:

```typescript
/**
 * Searches for manga by query.
 * @param query - Search term (title, author, artist)
 * @param filters - Optional filter criteria
 * @returns List of matching manga sorted by relevance
 * @throws {ValidationError} When query is empty or too short
 * @throws {RateLimitError} When site rate limits the request
 */
async search(query: string, filters?: SearchFilters): Promise<readonly Manga[]>
```

### File Naming

| Pattern | Example |
|---------|---------|
| Classes | `MangaTVScraper.ts` |
| Parsers | `ListParser.ts`, `DetailParser.ts` |
| Types | `types/manga.ts`, `types/filters.ts` |
| Errors | `errors/index.ts`, `errors/NetworkError.ts` |
| Tests | `mangatv-scraper.test.ts`, `parsers/list-parser.test.ts` |
| Fixtures | `fixtures/manga-list.html`, `fixtures/manga-detail.html` |

### Testing Conventions

- **Table-driven tests** for multiple scenarios
- **Fixtures** stored in `fixtures/` directory (HTML samples)
- **Mock HTTP** responses with fixtures
- **Test the parse function**, not the network call

---

## Contributing

### Before Opening an Issue

1. Check existing issues for duplicates
2. Verify with current site — selectors may need updates if mangatv.net changed

### Before Submitting Changes

1. Run `npm test` — all tests must pass
2. Run `npm run lint` — no lint errors
3. Run `npm run build` — type-check and build succeed
4. Add tests for new functionality
5. Update JSDoc for public API changes

### PR Guidelines

- One feature or fix per PR
- Descriptive title: `feat: add search by author`, `fix: handle Cloudflare redirect`
- Reference any related issues
- Include test output

---

## Project Commands

```bash
# Development
npm run dev        # Watch mode with tsx
npm run test       # Run tests with vitest
npm run test:watch # Watch mode for tests
npm run lint       # ESLint + TypeScript checks
npm run build      # tsup production build

# Utilities
npm run typecheck  # tsc --noEmit
npm run clean      # Remove dist/ and coverage/
```

---

## Entry Points

| Export | Description |
|--------|-------------|
| `MangaTVScraper` | Main class for scraping operations |
| `types/*` | All exported type definitions |
| `errors/*` | Error classes |
| `constants/*` | Site URLs, selectors, etc. |

---

## Notes

- **Cloudflare bypass is fragile** — if the site significantly changes protection, expect parsing failures and update accordingly
- **Selector stability** — mangatv.net may change HTML structure; use fixtures to detect breakage
- **Rate limiting** — do not remove delays between requests; aggressive scraping risks IP ban
