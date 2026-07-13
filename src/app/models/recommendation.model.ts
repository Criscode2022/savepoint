export type RecommendationSource = 'similar' | 'genre' | 'platform' | 'developer';

export interface GameRecommendation {
  externalId: number;
  slug: string;
  title: string;
  backgroundImage?: string | null;
  releaseYear?: number;
  rating?: number | null;
  metacritic?: number | null;
  genres: string[];
  platforms: string[];
  reason: string;
  source: RecommendationSource;
  /** Seed library title that drove a "similar" pick */
  basedOn?: string;
  rawgUrl: string;
}

export interface TasteProfile {
  topGenres: Array<{ name: string; weight: number }>;
  topPlatforms: Array<{ name: string; weight: number }>;
  topDevelopers: Array<{ name: string; weight: number }>;
  seedTitles: string[];
  libraryTitleKeys: Set<string>;
}

export interface RecommendationsResult {
  items: GameRecommendation[];
  profile: TasteProfile;
  configured: boolean;
  error?: string;
}
