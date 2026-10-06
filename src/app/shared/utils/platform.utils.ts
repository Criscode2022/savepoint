/** Brand colors per platform family; the DB stores no color, so we derive it from the name. */
const PLATFORM_FAMILY_COLORS: readonly [RegExp, string][] = [
  [/playstation|\bps[1-5]\b|\bpsp\b|vita/i, '#0070d1'],
  [/xbox/i, '#107c10'],
  [/nintendo|switch|wii|3ds|game ?boy|gamecube/i, '#e60012'],
  [/steam/i, '#1a9fff'],
];

export const DEFAULT_PLATFORM_COLOR = '#475569';

export function platformColor(name?: string | null): string {
  if (!name) {
    return DEFAULT_PLATFORM_COLOR;
  }
  return PLATFORM_FAMILY_COLORS.find(([pattern]) => pattern.test(name))?.[1] ?? DEFAULT_PLATFORM_COLOR;
}
