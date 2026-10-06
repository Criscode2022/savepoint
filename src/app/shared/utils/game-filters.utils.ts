import { Game, GameFilters } from '../../models/game.model';

/** True when a game passes every active filter. Search is a case-insensitive title match. */
export function matchesFilters(game: Game, filters: GameFilters | undefined): boolean {
  if (!filters) {
    return true;
  }

  const query = filters.search?.trim().toLowerCase();
  if (query && !game.title.toLowerCase().includes(query)) {
    return false;
  }

  if (filters.platforms?.length && !filters.platforms.includes(game.platform?.name)) {
    return false;
  }

  if (filters.years?.length && !(game.releaseYear && filters.years.includes(game.releaseYear))) {
    return false;
  }

  if (filters.developers?.length && !filters.developers.includes(game.developer?.name)) {
    return false;
  }

  if (filters.genres?.length) {
    const genres = game.genre ?? [];
    if (!filters.genres.some((genre) => genres.includes(genre))) {
      return false;
    }
  }

  if (filters.tags?.length) {
    const tags = (game.tags ?? []).map((t) => t.toLowerCase());
    if (!filters.tags.some((tag) => tags.includes(tag.toLowerCase()))) {
      return false;
    }
  }

  return true;
}
