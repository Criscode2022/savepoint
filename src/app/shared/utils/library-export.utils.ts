import * as XLSX from 'xlsx';
import { Game, GAME_STATUS_LABELS } from '../../models/game.model';
import { isDataUrlImage } from './image.utils';

export type LibraryExportFormat = 'json' | 'xlsx';

export interface LibraryExportOptions {
  includeWishlist?: boolean;
  scope?: 'library' | 'filtered';
}

interface LibraryExportRow {
  Title: string;
  Status: string;
  Platform: string;
  Developer: string;
  Director: string;
  'Release year': number | string;
  'Release date': string;
  Genres: string;
  Tags: string;
  Rating: number | string;
  'Playtime (hours)': number | string;
  Description: string;
  Notes: string;
  'Added on': string;
  'Added to library': string;
}

function formatExportDate(value?: string): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function formatCoverImage(coverImage?: string | null): string {
  if (!coverImage?.trim()) {
    return '';
  }

  if (isDataUrlImage(coverImage)) {
    return '[embedded image]';
  }

  return coverImage;
}

function mapGameToExportRow(game: Game): LibraryExportRow {
  return {
    Title: game.title,
    Status: GAME_STATUS_LABELS[game.status],
    Platform: game.platform?.name ?? '',
    Developer: game.developer?.name ?? '',
    Director: game.director ?? '',
    'Release year': game.releaseYear ?? '',
    'Release date': game.releaseDate ?? '',
    Genres: (game.genre ?? []).join(', '),
    Tags: (game.tags ?? []).join(', '),
    Rating: game.rating ?? '',
    'Playtime (hours)': game.playtimeHours ?? game.playtime ?? '',
    Description: game.description ?? '',
    Notes: game.notes ?? '',
    'Added on': formatExportDate(game.createdAt),
    'Added to library': formatExportDate(game.libraryAddedAt),
  };
}

function mapGameToExportObject(game: Game): Record<string, unknown> {
  return {
    id: game.id,
    title: game.title,
    status: game.status,
    statusLabel: GAME_STATUS_LABELS[game.status],
    platform: game.platform?.name ?? null,
    developer: game.developer?.name ?? null,
    director: game.director ?? null,
    releaseYear: game.releaseYear ?? null,
    releaseDate: game.releaseDate ?? null,
    genres: game.genre ?? [],
    tags: game.tags ?? [],
    rating: game.rating ?? null,
    playtimeHours: game.playtimeHours ?? game.playtime ?? null,
    description: game.description ?? null,
    notes: game.notes ?? null,
    createdAt: game.createdAt,
    libraryAddedAt: game.libraryAddedAt ?? null,
    coverImage: formatCoverImage(game.coverImage) || null,
  };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildFilename(
  format: LibraryExportFormat,
  scope: 'library' | 'filtered' = 'library',
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = scope === 'filtered' ? 'gamevault-filtered' : 'gamevault-library';
  return `${prefix}-${stamp}.${format === 'json' ? 'json' : 'xlsx'}`;
}

export function exportLibrary(
  games: Game[],
  format: LibraryExportFormat,
  options: LibraryExportOptions = {},
): void {
  const includeWishlist = options.includeWishlist ?? true;
  const scope = options.scope ?? 'library';
  const gamesToExport = includeWishlist
    ? games
    : games.filter((game) => game.status !== 'wishlist');

  if (gamesToExport.length === 0) {
    throw new Error('No games to export');
  }

  if (format === 'json') {
    const payload = {
      exportedAt: new Date().toISOString(),
      gameCount: gamesToExport.length,
      includeWishlist,
      filtered: scope === 'filtered',
      games: gamesToExport.map(mapGameToExportObject),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    downloadBlob(blob, buildFilename('json', scope));
    return;
  }

  const rows = gamesToExport.map(mapGameToExportRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');
  XLSX.writeFile(workbook, buildFilename('xlsx', scope));
}
