export function normalizeTags(
  tags: string | string[] | null | undefined,
): string[] {
  if (!tags) {
    return [];
  }

  const raw = Array.isArray(tags)
    ? tags
    : tags.split(/[,;]/).map((value) => value.trim());

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of raw) {
    const cleaned = value.trim().replace(/^#/, '');
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(cleaned);
  }

  return out;
}

export function collectUniqueTags(
  rows: Array<{ tags?: string[] | null }>,
): string[] {
  return [
    ...new Set(rows.flatMap((row) => normalizeTags(row.tags))),
  ].sort((a, b) => a.localeCompare(b));
}
