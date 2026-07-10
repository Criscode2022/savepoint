export const RATING_MIN = 0;
export const RATING_MAX = 10;
export const RATING_STEP = 0.5;

export function clampRating(value: number): number {
  const stepped = Math.round(value / RATING_STEP) * RATING_STEP;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, stepped));
}

export function isValidRating(value: number | null | undefined): value is number {
  if (value == null || Number.isNaN(value)) {
    return false;
  }

  const normalized = clampRating(value);
  return normalized >= RATING_MIN && normalized <= RATING_MAX;
}

export function formatRating(value: number | null | undefined): string {
  if (!isValidRating(value)) {
    return '—';
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function formatRatingLabel(value: number | null | undefined): string {
  if (!isValidRating(value)) {
    return 'Not rated';
  }

  return `${formatRating(value)}/10`;
}

export function getStarFillStates(rating: number | null | undefined): boolean[] {
  if (!isValidRating(rating)) {
    return Array.from({ length: 10 }, () => false);
  }

  return Array.from({ length: 10 }, (_, index) => index + 1 <= Math.round(rating));
}
