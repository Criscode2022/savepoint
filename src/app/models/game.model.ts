export interface Game {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  platformId?: string;
  platform?: Platform;
  developerId?: string;
  developer?: Company;
  directorId?: string;
  director?: Director;
  releaseYear?: number;
  genre?: string;
  rating?: number;
  playtimeHours?: number;
  completed: boolean;
  purchaseDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Platform {
  id: string;
  name: string;
  manufacturer?: string;
  generation?: number;
  releaseYear?: number;
  iconUrl?: string;
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
  completed?: boolean;
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
  genre?: string;
  rating?: number;
  playtimeHours?: number;
  completed?: boolean;
  purchaseDate?: string;
}

export interface UpdateGameRequest extends Partial<CreateGameRequest> {}

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