import { Game } from '../../models/game.model';

export interface ReleaseCountdown {
  label: string;
  isReleased: boolean;
  isUnknown: boolean;
  target: Date | null;
}

export function getReleaseTarget(game: Pick<Game, 'releaseDate' | 'releaseYear'>): Date | null {
  if (game.releaseDate) {
    const parsed = new Date(`${game.releaseDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (game.releaseYear) {
    const now = new Date();
    if (game.releaseYear >= now.getFullYear()) {
      return new Date(game.releaseYear, 0, 1);
    }
  }

  return null;
}

export function formatReleaseCountdown(
  game: Pick<Game, 'releaseDate' | 'releaseYear'>,
  now = new Date(),
): ReleaseCountdown {
  const target = getReleaseTarget(game);

  if (!target) {
    return {
      label: 'Release date TBD',
      isReleased: false,
      isUnknown: true,
      target: null,
    };
  }

  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      label: 'Out now',
      isReleased: true,
      isUnknown: false,
      target,
    };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return {
      label: `${days}d ${hours}h ${minutes}m`,
      isReleased: false,
      isUnknown: false,
      target,
    };
  }

  if (hours > 0) {
    return {
      label: `${hours}h ${minutes}m`,
      isReleased: false,
      isUnknown: false,
      target,
    };
  }

  return {
    label: `${minutes}m`,
    isReleased: false,
    isUnknown: false,
    target,
  };
}
