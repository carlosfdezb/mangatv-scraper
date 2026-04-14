/**
 * Genre, Demographic, and Type Constants
 * @module constants/genres
 */

/**
 * All manga types available on the site
 */
export const MANGA_TYPES = [
  'Manga',
  'MANHWA',
  'Manhua',
  'One-Shot',
  'Doujinshi',
  'Oel',
  'Novela',
  'ONE SHOT',
] as const;

/**
 * All demographic categories
 */
export const DEMOGRAPHICS = [
  'Seinen',
  'Shoujo',
  'Shounen',
  'Josei',
  'Kodomo',
] as const;

/**
 * All genres available on the site
 */
export const GENRES = [
  'Accion',
  'Animacion',
  'Artes Marciales',
  'Aventura',
  'Belico',
  'Ciencia Ficcion',
  'Comedia',
  'Demonios',
  'Deportes',
  'Doujinshi',
  'Drama',
  'Ecchi',
  'Escolar',
  'Espacial',
  'Fantasía',
  'Gore',
  'Harem',
  'Historico',
  'Horror',
  'Infantil',
  'Josei',
  'Juegos',
  'Lucha Libre',
  'Magia',
  'Mecha',
  'Militar',
  'Misterio',
  'Musica',
  'Ninos',
  'Novela',
  'Parodia',
  'Policial',
  'Psicologico',
  'Realidad',
  'Romance',
  'Samurai',
  'Seinen',
  'Shoujo',
  'Shounen',
  'Sin Genero',
  'Sobrenatural',
  'Sof武林',
  'Supervivencia',
  'Telenovela',
  'Terror',
  'Thriller',
  'Vampiros',
  'Vida Cotidiana',
  'Yaoi',
  'Yuri',
] as const;

/**
 * Sort order options
 */
export const SORT_ORDERS = {
  LATEST: 'latest',
  TITLE: 'title',
  TITLE_REVERSE: 'titlereverse',
  POPULAR: 'popular',
} as const;

/**
 * Type for sort order values
 */
export type SortOrderValue = typeof SORT_ORDERS[keyof typeof SORT_ORDERS];

/**
 * Get a genre display name (same as the genre itself for this site)
 * @param genre - Genre to display
 * @returns Display name
 */
export function getGenreDisplayName(genre: string): string {
  return genre;
}

/**
 * Check if a string is a valid genre
 * @param value - String to check
 * @returns True if valid genre
 */
export function isValidGenre(value: string): value is typeof GENRES[number] {
  return (GENRES as readonly string[]).includes(value);
}

/**
 * Check if a string is a valid manga type
 * @param value - String to check
 * @returns True if valid type
 */
export function isValidMangaType(value: string): value is typeof MANGA_TYPES[number] {
  return (MANGA_TYPES as readonly string[]).includes(value);
}

/**
 * Check if a string is a valid demographic
 * @param value - String to check
 * @returns True if valid demographic
 */
export function isValidDemographic(value: string): value is typeof DEMOGRAPHICS[number] {
  return (DEMOGRAPHICS as readonly string[]).includes(value);
}
