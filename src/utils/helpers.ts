/**
 * Utility helper functions
 * @module utils/helpers
 */

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize a string for comparison (lowercase, trim, collapse spaces)
 * @param str - String to normalize
 * @returns Normalized string
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract numeric ID from a path or URL
 * @param input - URL or path containing an ID
 * @param pattern - Regex pattern with capture group for the ID
 * @returns The extracted ID as a number, or null if not found
 */
export function extractId(input: string, pattern: RegExp): number | null {
  const match = input.match(pattern);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

/**
 * Slugify a string for URL use
 * @param text - Text to slugify
 * @returns URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Parse a date string from the site
 * Supports formats like "Hace 2 horas", "Ayer", "2024-01-15"
 * @param dateStr - Date string to parse
 * @returns ISO date string or original if parsing fails
 */
export function parseSiteDate(dateStr: string): string {
  const normalized = normalizeString(dateStr);
  
  // "Hace X horas"
  const hoursMatch = normalized.match(/hace\s+(\d+)\s+horas?/);
  if (hoursMatch?.[1]) {
    const hours = parseInt(hoursMatch[1], 10);
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  }
  
  // "Ayer"
  if (normalized === 'ayer') {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString();
  }
  
  // "Hace X dias"
  const daysMatch = normalized.match(/hace\s+(\d+)\s+dias?/);
  if (daysMatch?.[1]) {
    const days = parseInt(daysMatch[1], 10);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
  
  // Try parsing as ISO date
  const isoMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch?.[1]) {
    return new Date(isoMatch[1]).toISOString();
  }
  
  // Return original if can't parse
  return dateStr;
}

/**
 * Validate that a URL is from the expected domain
 * @param url - URL to validate
 * @param allowedDomains - Array of allowed domain patterns
 * @returns True if URL is from an allowed domain
 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  
  throw lastError ?? new Error('All retry attempts failed');
}

/**
 * Safely parse JSON with a fallback
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * Chunk an array into smaller arrays
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicate objects from an array by a key function
 * @param array - Array to deduplicate
 * @param keyFn - Function to extract the key for comparison
 * @returns Deduplicated array
 */
export function deduplicateByKey<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
