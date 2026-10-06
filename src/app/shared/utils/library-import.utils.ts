import { GamePlayStatus, GAME_STATUS_LABELS } from '../../models/game.model';
import { normalizeGenres } from './genre.utils';
import { normalizeTags } from './tag.utils';

export interface ImportGameDraft {
  title: string;
  description?: string;
  platformName?: string;
  developerName?: string;
  directorName?: string;
  releaseYear?: number;
  releaseDate?: string;
  genre?: string[];
  tags?: string[];
  rating?: number | null;
  playtimeHours?: number;
  status?: GamePlayStatus;
  notes?: string;
  coverImage?: string | null;
}

export interface ImportParseResult {
  games: ImportGameDraft[];
  skipped: number;
  errors: string[];
}

const STATUS_FROM_LABEL = Object.fromEntries(
  (Object.entries(GAME_STATUS_LABELS) as Array<[GamePlayStatus, string]>).map(
    ([status, label]) => [label.toLowerCase(), status],
  ),
) as Record<string, GamePlayStatus>;

function parseStatus(value: unknown): GamePlayStatus | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const raw = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (
    raw === 'not_started' ||
    raw === 'playing' ||
    raw === 'paused' ||
    raw === 'completed' ||
    raw === 'wishlist'
  ) {
    return raw;
  }
  return STATUS_FROM_LABEL[value.trim().toLowerCase()];
}

function asNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function mapObjectToDraft(raw: Record<string, unknown>): ImportGameDraft | null {
  const title =
    (typeof raw['title'] === 'string' && raw['title']) ||
    (typeof raw['Title'] === 'string' && raw['Title']) ||
    '';

  if (!title.trim()) {
    return null;
  }

  const status =
    parseStatus(raw['status']) ||
    parseStatus(raw['Status']) ||
    parseStatus(raw['statusLabel']);

  const genres =
    normalizeGenres(
      (raw['genres'] as string[] | string | undefined) ??
        (raw['Genres'] as string | undefined) ??
        (raw['genre'] as string[] | string | undefined),
    );

  const tags = normalizeTags(
    (raw['tags'] as string[] | string | undefined) ??
      (raw['Tags'] as string | undefined),
  );

  const platformName =
    (typeof raw['platform'] === 'string' && raw['platform']) ||
    (typeof raw['Platform'] === 'string' && raw['Platform']) ||
    undefined;

  const developerName =
    (typeof raw['developer'] === 'string' && raw['developer']) ||
    (typeof raw['Developer'] === 'string' && raw['Developer']) ||
    undefined;

  const directorName =
    (typeof raw['director'] === 'string' && raw['director']) ||
    (typeof raw['Director'] === 'string' && raw['Director']) ||
    undefined;

  const cover =
    typeof raw['coverImage'] === 'string' &&
    raw['coverImage'] &&
    raw['coverImage'] !== '[embedded image]'
      ? raw['coverImage']
      : undefined;

  return {
    title: title.trim(),
    description:
      (typeof raw['description'] === 'string' && raw['description']) ||
      (typeof raw['Description'] === 'string' && raw['Description']) ||
      undefined,
    platformName: platformName?.trim() || undefined,
    developerName: developerName?.trim() || undefined,
    directorName: directorName?.trim() || undefined,
    releaseYear:
      asNumber(raw['releaseYear']) ?? asNumber(raw['Release year']),
    releaseDate:
      (typeof raw['releaseDate'] === 'string' && raw['releaseDate']) ||
      (typeof raw['Release date'] === 'string' && raw['Release date']) ||
      undefined,
    genre: genres,
    tags,
    rating: asNumber(raw['rating']) ?? asNumber(raw['Rating']) ?? null,
    playtimeHours:
      asNumber(raw['playtimeHours']) ?? asNumber(raw['Playtime (hours)']),
    status,
    notes:
      (typeof raw['notes'] === 'string' && raw['notes']) ||
      (typeof raw['Notes'] === 'string' && raw['Notes']) ||
      undefined,
    coverImage: cover ?? null,
  };
}

/**
 * Accepts Savepoint (formerly GameVault) JSON export shapes:
 * - { exportedAt, games: [...] }
 * - [ ...games ]
 */
export function parseLibraryImportJson(text: string): ImportParseResult {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { games: [], skipped: 0, errors: ['File is not valid JSON.'] };
  }

  let rows: unknown[] = [];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { games?: unknown }).games)) {
    rows = (parsed as { games: unknown[] }).games;
  } else {
    return {
      games: [],
      skipped: 0,
      errors: ['JSON must be an array of games or an object with a games array.'],
    };
  }

  const games: ImportGameDraft[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      skipped += 1;
      errors.push(`Row ${index + 1}: not an object`);
      return;
    }
    const draft = mapObjectToDraft(row as Record<string, unknown>);
    if (!draft) {
      skipped += 1;
      errors.push(`Row ${index + 1}: missing title`);
      return;
    }
    games.push(draft);
  });

  return { games, skipped, errors };
}
