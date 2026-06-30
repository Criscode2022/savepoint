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

export type GamePlayStatus = 'not_started' | 'playing' | 'completed';

export const GAME_STATUS_LABELS: Record<GamePlayStatus, string> = {
  not_started: 'Not Started',
  playing: 'Playing',
  completed: 'Completed',
};

export const GAME_STATUS_CYCLE: Record<GamePlayStatus, GamePlayStatus> = {
  not_started: 'playing',
  playing: 'completed',
  completed: 'not_started',
};

export function deriveGameStatus(game: {
  status?: GamePlayStatus | string | null;
  completed?: boolean;
}): GamePlayStatus {
  if (
    game.status === 'not_started' ||
    game.status === 'playing' ||
    game.status === 'completed'
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
  coverImage?: string;
  platformId?: string;
  platform: Platform;
  developerId?: string;
  developer: Company;
  directorId?: string;
  director?: string;
  releaseYear?: number;
  genre?: string[];
  rating?: number;
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
}

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface GameFilter {
  search?: string;
  platformId?: string;
  year?: number;
  developerId?: string;
  directorId?: string;
  genre?: string;
  status?: GamePlayStatus;
  completed?: boolean;
  sortBy?: 'title' | 'releaseYear' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GameFilters {
  search?: string;
  platforms?: string[];
  years?: number[];
  developers?: string[];
  genres?: string[];
  sortBy?: 'title' | 'releaseYear' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateGameRequest {
  title: string;
  description?: string;
  coverImage?: string;
  platformId?: string;
  developerId?: string;
  directorId?: string;
  releaseYear?: number;
  genre?: string[];
  rating?: number;
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
}

export interface GameFormPayload {
  title: string;
  description?: string;
  coverImage?: string;
  platformId?: string;
  releaseYear?: number;
  developerName: string;
  directorName?: string;
  genre?: string[];
  rating?: number;
  playtimeHours?: number;
  status?: GamePlayStatus;
  completed?: boolean;
  notes?: string;
}

export interface GamesResponse {
  games: Game[];
  total: number;
  page: number;
  limit: number;
}

export interface FilterOptions {
  platforms: Platform[];
  developers: Company[];
  directors: Director[];
  genres: string[];
  years: number[];
}

export const PLATFORMS: Platform[] = [
  { id: 'ps5', name: 'PlayStation 5', manufacturer: 'Sony', color: '#0070d1', createdAt: new Date().toISOString() },
  { id: 'ps4', name: 'PlayStation 4', manufacturer: 'Sony', color: '#003791', createdAt: new Date().toISOString() },
  { id: 'xbox-series', name: 'Xbox Series X/S', manufacturer: 'Microsoft', color: '#107c10', createdAt: new Date().toISOString() },
  { id: 'xbox-one', name: 'Xbox One', manufacturer: 'Microsoft', color: '#107c10', createdAt: new Date().toISOString() },
  { id: 'switch', name: 'Nintendo Switch', manufacturer: 'Nintendo', color: '#e60012', createdAt: new Date().toISOString() },
  { id: 'pc', name: 'PC', manufacturer: 'Various', color: '#8b5cf6', createdAt: new Date().toISOString() },
  { id: 'steam-deck', name: 'Steam Deck', manufacturer: 'Valve', color: '#1a9fff', createdAt: new Date().toISOString() }
];

export const GENRES: string[] = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing',
  'Puzzle', 'Platformer', 'Shooter', 'Fighting', 'Horror', 'Stealth', 'MMO',
  'Battle Royale', 'Survival', 'Roguelike', 'Metroidvania', 'Soulslike', 'Open World'
];
