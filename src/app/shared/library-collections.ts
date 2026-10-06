import { Game } from '../models/game.model';

export type LibraryCollection =
  | 'all'
  | 'not_started'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'wishlist'
  | 'rated'
  | 'with_playtime';

export interface LibraryCollectionMeta {
  /** Short label for chips and navigation */
  label: string;
  /** Heading shown above the collection */
  title: string;
  icon: string;
  /** Empty-state copy when the collection has no games (no filters applied) */
  empty: string;
  matches: (game: Game) => boolean;
}

const inLibrary = (game: Game): boolean => game.status !== 'wishlist';

/** One definition for every smart collection — sidebar, chips, titles and counts read from here. */
export const LIBRARY_COLLECTIONS: Record<LibraryCollection, LibraryCollectionMeta> = {
  all: {
    label: 'All',
    title: 'Library',
    icon: 'game-controller-outline',
    empty: 'Your library is empty.',
    matches: inLibrary,
  },
  not_started: {
    label: 'Backlog',
    title: 'Backlog',
    icon: 'layers-outline',
    empty: 'Backlog cleared. Nothing is waiting to be started.',
    matches: (g) => g.status === 'not_started',
  },
  playing: {
    label: 'Playing',
    title: 'Playing',
    icon: 'play-circle-outline',
    empty: 'Nothing in progress. Pick something from your backlog and press start.',
    matches: (g) => g.status === 'playing',
  },
  paused: {
    label: 'Paused',
    title: 'Paused',
    icon: 'pause-circle-outline',
    empty: 'No paused games. You finish what you start.',
    matches: (g) => g.status === 'paused',
  },
  completed: {
    label: 'Completed',
    title: 'Completed',
    icon: 'checkmark-circle-outline',
    empty: 'No completed games yet. The first GG is always the best one.',
    matches: (g) => g.status === 'completed',
  },
  wishlist: {
    label: 'Wishlist',
    title: 'Wishlist',
    icon: 'heart-outline',
    empty: 'Your wishlist is empty. Add upcoming games to count down to release day.',
    matches: (g) => g.status === 'wishlist',
  },
  rated: {
    label: 'Rated',
    title: 'Rated',
    icon: 'star-outline',
    empty: 'No rated games yet.',
    matches: (g) => inLibrary(g) && g.rating != null,
  },
  with_playtime: {
    label: 'With playtime',
    title: 'With playtime',
    icon: 'time-outline',
    empty: 'No playtime logged yet.',
    matches: (g) => inLibrary(g) && (g.playtimeHours ?? 0) > 0,
  },
};

/** Status collections in navigation order */
export const STATUS_COLLECTIONS: LibraryCollection[] = [
  'not_started',
  'playing',
  'paused',
  'completed',
  'wishlist',
];

export function parseCollection(value: string | null | undefined): LibraryCollection {
  return value && value in LIBRARY_COLLECTIONS ? (value as LibraryCollection) : 'all';
}
