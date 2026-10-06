import { Game, GameFilters } from '../../models/game.model';

export type GameSortField = NonNullable<GameFilters['sortBy']>;
export type SortOrder = NonNullable<GameFilters['sortOrder']>;

/** Natural direction per field: A→Z for titles, newest / highest first for everything else. */
export const DEFAULT_SORT_ORDER: Record<GameSortField, SortOrder> = {
  title: 'asc',
  releaseYear: 'desc',
  rating: 'desc',
  createdAt: 'desc',
  lastPlayedAt: 'desc',
  playtimeHours: 'desc',
};

function sortValue(game: Game, field: GameSortField): string | number | null {
  switch (field) {
    case 'title':
      return game.title;
    case 'releaseYear':
      return game.releaseYear ?? null;
    case 'rating':
      return game.rating ?? null;
    case 'playtimeHours':
      return game.playtimeHours || null;
    case 'lastPlayedAt':
      return game.lastPlayedAt ? Date.parse(game.lastPlayedAt) : null;
    case 'createdAt':
      return Date.parse(game.createdAt);
  }
}

/** Returns a sorted copy. Missing values always sort last, whatever the direction. */
export function sortGames(
  games: readonly Game[],
  field: GameSortField = 'createdAt',
  order: SortOrder = DEFAULT_SORT_ORDER[field],
): Game[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...games].sort((a, b) => {
    const av = sortValue(a, field);
    const bv = sortValue(b, field);
    if (av == null || bv == null) {
      return av == null ? (bv == null ? 0 : 1) : -1;
    }
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true }) * direction;
    }
    return ((av as number) - (bv as number)) * direction;
  });
}
