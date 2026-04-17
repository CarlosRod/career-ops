/**
 * lib/normalize.mjs — Shared normalization functions for company/role matching
 *
 * Single source of truth for all JS scripts that do dedup, merge, or verification.
 * Adopted from dedup-tracker.mjs (most thorough implementation).
 */

export const ROLE_STOPWORDS = new Set([
  'senior', 'junior', 'lead', 'staff', 'principal', 'head', 'chief',
  'manager', 'director', 'associate', 'intern', 'contractor',
  'remote', 'hybrid', 'onsite',
  'engineer', 'engineering',
]);

export const LOCATION_STOPWORDS = new Set([
  'tokyo', 'japan', 'london', 'berlin', 'paris', 'singapore',
  'york', 'francisco', 'angeles', 'seattle', 'austin', 'boston',
  'chicago', 'denver', 'toronto', 'amsterdam', 'dublin', 'sydney',
  'remote', 'global', 'emea', 'apac', 'latam',
]);

/**
 * Normalize a company name for comparison.
 * Strips parentheses, collapses whitespace, removes non-alphanumeric (except spaces).
 */
export function normalizeCompany(name) {
  return name.toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Normalize a role title for comparison.
 * Strips parentheses, collapses whitespace, keeps forward slashes.
 */
export function normalizeRole(role) {
  return role.toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 /]/g, '')
    .trim();
}

/**
 * Check if two role titles are a fuzzy match.
 * Filters stopwords (seniority, location terms), requires overlap >= 2 words
 * and overlap ratio >= 0.6 relative to the shorter role.
 */
export function roleMatch(a, b) {
  const filterStopwords = (words) =>
    words.filter(w => !ROLE_STOPWORDS.has(w) && !LOCATION_STOPWORDS.has(w));

  const wordsA = filterStopwords(normalizeRole(a).split(/\s+/).filter(w => w.length > 2));
  const wordsB = filterStopwords(normalizeRole(b).split(/\s+/).filter(w => w.length > 2));

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const overlap = wordsA.filter(w => wordsB.some(wb => wb === w));
  const smaller = Math.min(wordsA.length, wordsB.length);
  const ratio = overlap.length / smaller;

  return overlap.length >= 2 && ratio >= 0.6;
}
