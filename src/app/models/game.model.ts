export interface Platform {
  id: string;
  name: string;
  manufacturer?: string;
  generation?: number;
  releaseYear?: number;
  iconUrl?: string;
  color?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  country?: string;
  foundedYear?: number;
  website?: string;
  createdAt: string;
}

export interface Director {
  id: string;
  name: string;
  birthYear?: number;
  nationality?: string;
  bio?: string;
  createdAt: string;
}

export type GamePlayStatus = 'not_started' | 'playing' | 'paused' | 'completed' | 'wishlist';

export const GAME_STATUS_LABELS: Record<GamePlayStatus, string> = {
  not_started: 'Not started',
  playing: 'Playing',
  paused: 'Paused',
  completed: 'Completed',
  wishlist: 'Wishlist',
};

export const GAME_STATUS_ICONS: Record<GamePlayStatus, string> = {
  not_started: 'ellipse-outline',
  playing: 'play-circle-outline',
  paused: 'pause-circle-outline',
  completed: 'checkmark-circle-outline',
  wishlist: 'heart-outline',
};

export const GAME_STATUS_CYCLE: Record<GamePlayStatus, GamePlayStatus> = {
  not_started: 'playing',
  playing: 'paused',
  paused: 'playing',
  completed: 'playing',
  wishlist: 'not_started',
};

export function deriveGameStatus(game: {
  status?: GamePlayStatus | string | null;
  completed?: boolean;
}): GamePlayStatus {
  if (
    game.status === 'not_started' ||
    game.status === 'playing' ||
    game.status === 'paused' ||
    game.status === 'completed' ||
    game.status === 'wishlist'
  ) {
    return game.status;
  }
  return game.completed ? 'completed' : 'not_started';
}

export interface PlaySession {
  id: string;
  gameId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
}

export interface Game {
  id: string;
  title: string;
  description?: string;
  coverImage?: string | null;
  platformId?: string;
  platform: Platform;
  developerId?: string;
  developer: Company;
  directorId?: string;
  director?: string;
  releaseYear?: number;
  releaseDate?: string;
  genre?: string[];
  tags?: string[];
  rating?: number | null;
  ratedAt?: string;
  playtimeHours?: number;
  playtime?: number;
  status: GamePlayStatus;
  startedAt?: string;
  completedAt?: string;
  lastPlayedAt?: string;
  completed: boolean;
  purchaseDate?: string;
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  libraryAddedAt?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface GameFilters {
  search?: string;
  platforms?: string[];
  years?: number[];
  developers?: string[];
  genres?: string[];
  tags?: string[];
  sortBy?: 'title' | 'releaseYear' | 'rating' | 'createdAt' | 'lastPlayedAt' | 'playtimeHours';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateGameRequest {
  title: string;
  description?: string;
  coverImage?: string | null;
  platformId?: string;
  developerId?: string;
  directorId?: string;
  releaseYear?: number;
  releaseDate?: string;
  genre?: string[];
  tags?: string[];
  rating?: number | null;
  playtimeHours?: number;
  status?: GamePlayStatus;
  completed?: boolean;
  purchaseDate?: string;
  notes?: string;
}

export interface UpdateGameRequest extends Partial<CreateGameRequest> {
  startedAt?: string | null;
  completedAt?: string | null;
  lastPlayedAt?: string | null;
  ratedAt?: string | null;
  libraryAddedAt?: string | null;
}

export interface GameFormPayload {
  title: string;
  description?: string;
  coverImage?: string | null;
  platformId?: string;
  releaseYear?: number;
  releaseDate?: string;
  developerName: string;
  directorName?: string;
  genre?: string[];
  tags?: string[];
  rating?: number | null;
  playtimeHours?: number;
  status?: GamePlayStatus;
  completed?: boolean;
  notes?: string;
}


export const PLATFORMS: Platform[] = [
  { id: 'ps5', name: 'PlayStation 5', manufacturer: 'Sony', createdAt: new Date().toISOString() },
  { id: 'ps4', name: 'PlayStation 4', manufacturer: 'Sony', createdAt: new Date().toISOString() },
  { id: 'xbox-series', name: 'Xbox Series X/S', manufacturer: 'Microsoft', createdAt: new Date().toISOString() },
  { id: 'xbox-one', name: 'Xbox One', manufacturer: 'Microsoft', createdAt: new Date().toISOString() },
  { id: 'switch', name: 'Nintendo Switch', manufacturer: 'Nintendo', createdAt: new Date().toISOString() },
  { id: 'pc', name: 'PC', manufacturer: 'Various', createdAt: new Date().toISOString() },
  { id: 'steam-deck', name: 'Steam Deck', manufacturer: 'Valve', createdAt: new Date().toISOString() }
];

export const GENRES: string[] = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing',
  'Puzzle', 'Platformer', 'Shooter', 'Fighting', 'Horror', 'Stealth', 'MMO',
  'Battle Royale', 'Survival', 'Roguelike', 'Metroidvania', 'Soulslike', 'Open World'
];
