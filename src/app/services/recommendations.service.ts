import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';
import { Game } from '../models/game.model';
import {
  GameRecommendation,
  RecommendationSource,
  RecommendationsResult,
  TasteProfile,
} from '../models/recommendation.model';
import { RawgGameSummary, RawgService } from './rawg.service';

/** Map common library genre labels → RAWG genre slugs */
const GENRE_SLUG_MAP: Record<string, string> = {
  action: 'action',
  adventure: 'adventure',
  rpg: 'role-playing-games-rpg',
  'role-playing': 'role-playing-games-rpg',
  strategy: 'strategy',
  simulation: 'simulation',
  sports: 'sports',
  racing: 'racing',
  puzzle: 'puzzle',
  platformer: 'platformer',
  shooter: 'shooter',
  fighting: 'fighting',
  horror: 'action',
  stealth: 'action',
  mmo: 'massively-multiplayer',
  'battle royale': 'action',
  survival: 'adventure',
  roguelike: 'indie',
  metroidvania: 'adventure',
  soulslike: 'role-playing-games-rpg',
  'open world': 'adventure',
  indie: 'indie',
  casual: 'casual',
  arcade: 'arcade',
};

@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  private readonly rawg = inject(RawgService);

  public get apiConfigured(): boolean {
    return this.rawg.isConfigured;
  }

  /**
   * Build online recommendations from the user's library (no AI).
   * Uses RAWG: similar titles from seeds + top genres / platforms.
   */
  public getRecommendations(games: Game[]): Observable<RecommendationsResult> {
    const profile = this.buildTasteProfile(games);

    if (!this.rawg.isConfigured) {
      return of({
        items: [],
        profile,
        configured: false,
        error:
          'Add a free RAWG API key (RAWG_API_KEY in .env) to fetch online recommendations.',
      });
    }

    if (games.length === 0) {
      return of({
        items: [],
        profile,
        configured: true,
        error: 'Add games to your library to unlock recommendations.',
      });
    }

    const similar$ = this.fetchSimilarFromSeeds(profile.seedTitles);
    const genre$ = this.fetchByTopGenres(profile);
    const platform$ = this.fetchByTopPlatforms(profile);

    return forkJoin([similar$, genre$, platform$]).pipe(
      map(([similar, byGenre, byPlatform]) => {
        const merged = this.mergeAndRank(
          [...similar, ...byGenre, ...byPlatform],
          profile,
        );
        return {
          items: merged,
          profile,
          configured: true,
        } satisfies RecommendationsResult;
      }),
      catchError((err) =>
        of({
          items: [],
          profile,
          configured: true,
          error:
            err?.message ||
            'Could not reach RAWG. Check your API key and network.',
        }),
      ),
    );
  }

  private buildTasteProfile(games: Game[]): TasteProfile {
    const genreWeight = new Map<string, number>();
    const platformWeight = new Map<string, number>();
    const developerWeight = new Map<string, number>();
    const libraryTitleKeys = new Set<string>();

    for (const game of games) {
      libraryTitleKeys.add(this.normalizeTitle(game.title));
      const weight = this.gameWeight(game);

      for (const genre of game.genre ?? []) {
        const name = genre.trim();
        if (!name) continue;
        genreWeight.set(name, (genreWeight.get(name) ?? 0) + weight);
      }

      if (game.platform?.name) {
        platformWeight.set(
          game.platform.name,
          (platformWeight.get(game.platform.name) ?? 0) + weight,
        );
      }

      if (game.developer?.name && game.developer.name !== 'Unknown') {
        developerWeight.set(
          game.developer.name,
          (developerWeight.get(game.developer.name) ?? 0) + weight,
        );
      }
    }

    const topGenres = this.topEntries(genreWeight, 5);
    const topPlatforms = this.topEntries(platformWeight, 4);
    const topDevelopers = this.topEntries(developerWeight, 4);

    const seeds = [...games]
      .filter((g) => g.status !== 'wishlist')
      .sort((a, b) => this.gameWeight(b) - this.gameWeight(a))
      .slice(0, 5)
      .map((g) => g.title);

    return {
      topGenres,
      topPlatforms,
      topDevelopers,
      seedTitles: seeds,
      libraryTitleKeys,
    };
  }

  private gameWeight(game: Game): number {
    let w = 1;
    if (game.status === 'completed') w += 3;
    if (game.status === 'playing') w += 2.5;
    if (game.status === 'paused') w += 1.5;
    if (game.rating != null) w += game.rating / 2;
    const hours = game.playtimeHours ?? game.playtime ?? 0;
    if (hours > 0) w += Math.min(hours / 20, 3);
    return w;
  }

  private topEntries(
    map: Map<string, number>,
    limit: number,
  ): Array<{ name: string; weight: number }> {
    return [...map.entries()]
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
  }

  private fetchSimilarFromSeeds(seeds: string[]): Observable<GameRecommendation[]> {
    if (!seeds.length) {
      return of([]);
    }

    const requests = seeds.slice(0, 4).map((title) =>
      this.rawg.searchGames(title, 5).pipe(
        switchMap((hits) => {
          if (!hits.length) {
            return of([] as GameRecommendation[]);
          }
          const want = this.normalizeTitle(title);
          const exact = hits.find((r) => this.normalizeTitle(r.name) === want);
          const hit = exact ?? hits[0];
          return this.rawg.getSuggested(hit.id, 12).pipe(
            map((list) =>
              list.map((item) =>
                this.toRecommendation(
                  item,
                  'similar',
                  `Similar to ${title}`,
                  title,
                ),
              ),
            ),
          );
        }),
        catchError(() => of([] as GameRecommendation[])),
      ),
    );

    return forkJoin(requests).pipe(map((chunks) => chunks.flat()));
  }

  private fetchByTopGenres(
    profile: TasteProfile,
  ): Observable<GameRecommendation[]> {
    const slugs = profile.topGenres
      .map((g) => this.toRawgGenreSlug(g.name))
      .filter((s): s is string => !!s)
      .slice(0, 3);

    if (!slugs.length) {
      return of([]);
    }

    const requests = slugs.map((slug, index) => {
      const genreLabel = profile.topGenres[index]?.name ?? slug;
      return this.rawg
        .listGames({
          genres: slug,
          ordering: '-rating',
          page_size: '16',
          metacritic: '75,100',
        })
        .pipe(
          map((results) =>
            results.map((item) =>
              this.toRecommendation(
                item,
                'genre',
                `Because you play ${genreLabel}`,
              ),
            ),
          ),
          catchError(() => of([] as GameRecommendation[])),
        );
    });

    return forkJoin(requests).pipe(map((chunks) => chunks.flat()));
  }

  private fetchByTopPlatforms(
    profile: TasteProfile,
  ): Observable<GameRecommendation[]> {
    const platform = profile.topPlatforms[0]?.name;
    if (!platform) {
      return of([]);
    }

    const rawgPlatform = this.toRawgPlatformId(platform);
    if (!rawgPlatform) {
      return of([]);
    }

    return this.rawg
      .listGames({
        platforms: String(rawgPlatform),
        ordering: '-added',
        page_size: '12',
        metacritic: '70,100',
      })
      .pipe(
        map((results) =>
          results.map((item) =>
            this.toRecommendation(item, 'platform', `Popular on ${platform}`),
          ),
        ),
        catchError(() => of([] as GameRecommendation[])),
      );
  }

  private toRecommendation(
    item: RawgGameSummary,
    source: RecommendationSource,
    reason: string,
    basedOn?: string,
  ): GameRecommendation {
    const year = item.released
      ? Number(item.released.slice(0, 4))
      : undefined;

    return {
      externalId: item.id,
      slug: item.slug,
      title: item.name,
      backgroundImage: item.backgroundImage ?? null,
      releaseYear: Number.isFinite(year) ? year : undefined,
      rating: item.rating ?? null,
      metacritic: item.metacritic ?? null,
      genres: item.genres,
      platforms: item.platforms.slice(0, 4),
      reason,
      source,
      basedOn,
      rawgUrl: `https://rawg.io/games/${item.slug}`,
    };
  }

  private mergeAndRank(
    items: GameRecommendation[],
    profile: TasteProfile,
  ): GameRecommendation[] {
    const byId = new Map<number, GameRecommendation & { score: number }>();

    for (const item of items) {
      if (profile.libraryTitleKeys.has(this.normalizeTitle(item.title))) {
        continue;
      }

      const genreBoost = item.genres.reduce((sum, g) => {
        const hit = profile.topGenres.find(
          (tg) => tg.name.toLowerCase() === g.toLowerCase(),
        );
        return sum + (hit ? hit.weight : 0);
      }, 0);

      const sourceBoost =
        item.source === 'similar' ? 8 : item.source === 'genre' ? 4 : 2;
      const ratingBoost = (item.metacritic ?? (item.rating ?? 0) * 10) / 20;
      const score = sourceBoost + genreBoost + ratingBoost;

      const existing = byId.get(item.externalId);
      if (!existing || score > existing.score) {
        byId.set(item.externalId, { ...item, score });
      } else if (existing && item.source === 'similar' && !existing.basedOn) {
        byId.set(item.externalId, {
          ...existing,
          reason: item.reason,
          basedOn: item.basedOn,
          source: 'similar',
          score: existing.score + 2,
        });
      }
    }

    return [...byId.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map(({ score: _score, ...rest }) => rest);
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toRawgGenreSlug(genre: string): string | null {
    const key = genre.trim().toLowerCase();
    if (GENRE_SLUG_MAP[key]) {
      return GENRE_SLUG_MAP[key];
    }
    for (const [label, slug] of Object.entries(GENRE_SLUG_MAP)) {
      if (key.includes(label) || label.includes(key)) {
        return slug;
      }
    }
    return null;
  }

  private toRawgPlatformId(platformName: string): number | null {
    const p = platformName.toLowerCase();
    if (p.includes('pc') || p.includes('windows')) return 4;
    if (p.includes('playstation 5') || p.includes('ps5')) return 187;
    if (p.includes('playstation 4') || p.includes('ps4')) return 18;
    if (p.includes('xbox series')) return 186;
    if (p.includes('xbox one')) return 1;
    if (p.includes('switch')) return 7;
    if (p.includes('steam deck')) return 4;
    if (p.includes('playstation')) return 187;
    if (p.includes('xbox')) return 186;
    return null;
  }
}
