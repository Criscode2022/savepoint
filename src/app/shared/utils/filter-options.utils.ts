import { Game } from '../../models/game.model';
import { collectUniqueGenres } from './genre.utils';
import { collectUniqueTags } from './tag.utils';

export interface LibraryFilterOptions {
  platforms: string[];
  years: number[];
  developers: string[];
  genres: string[];
  tags: string[];
}

const UNKNOWN = 'Unknown';

function uniqueNames(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v !== UNKNOWN))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Filter choices come from the user's own library, so every option yields results. */
export function collectFilterOptions(games: Game[]): LibraryFilterOptions {
  return {
    platforms: uniqueNames(games.map((g) => g.platform?.name)),
    years: [...new Set(games.map((g) => g.releaseYear).filter((y): y is number => !!y))].sort(
      (a, b) => b - a,
    ),
    developers: uniqueNames(games.map((g) => g.developer?.name)),
    genres: collectUniqueGenres(games),
    tags: collectUniqueTags(games),
  };
}
