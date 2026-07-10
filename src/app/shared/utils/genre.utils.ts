export function normalizeGenres(
  genre: string | string[] | null | undefined,
): string[] {
  if (!genre) {
    return [];
  }

  if (Array.isArray(genre)) {
    return genre.map((value) => value.trim()).filter(Boolean);
  }

  const trimmed = genre.trim();
  return trimmed ? [trimmed] : [];
}

export function collectUniqueGenres(
  rows: Array<{ genre?: string | string[] | null }>,
): string[] {
  return [
    ...new Set(rows.flatMap((row) => normalizeGenres(row.genre))),
  ].sort((a, b) => a.localeCompare(b));
}
