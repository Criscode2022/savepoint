import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

const RAWG_BASE = 'https://api.rawg.io/api';

export interface RawgCoverCandidate {
  id: string;
  gameId: number;
  gameName: string;
  imageUrl: string;
  kind: 'cover' | 'screenshot';
  releaseYear?: number;
  rating?: number | null;
}

export interface RawgGameSummary {
  id: number;
  slug: string;
  name: string;
  backgroundImage?: string | null;
  released?: string | null;
  rating?: number | null;
  metacritic?: number | null;
  genres: string[];
  platforms: string[];
  shortScreenshots: string[];
}

interface RawgListResponse<T> {
  count?: number;
  results: T[];
}

interface RawgGameListItem {
  id: number;
  slug: string;
  name: string;
  background_image?: string | null;
  rating?: number;
  metacritic?: number | null;
  released?: string | null;
  genres?: Array<{ name: string; slug: string }>;
  platforms?: Array<{ platform: { name: string; slug: string } }>;
  short_screenshots?: Array<{ id: number; image: string }>;
}

interface RawgScreenshotItem {
  id: number;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class RawgService {
  private readonly http = inject(HttpClient);

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  get apiKey(): string {
    return ((environment as { rawgApiKey?: string }).rawgApiKey ?? '').trim();
  }

  /**
   * Search RAWG games and flatten cover + screenshot candidates for picker UI.
   */
  searchCoverImages(query: string, limit = 8): Observable<RawgCoverCandidate[]> {
    const q = query.trim();
    if (!q || !this.apiKey) {
      return of([]);
    }

    return this.searchGames(q, limit).pipe(
      map((games) => {
        const out: RawgCoverCandidate[] = [];
        const seen = new Set<string>();

        for (const game of games) {
          if (game.backgroundImage) {
            this.pushCandidate(out, seen, {
              id: `cover-${game.id}`,
              gameId: game.id,
              gameName: game.name,
              imageUrl: game.backgroundImage,
              kind: 'cover',
              releaseYear: this.yearFromReleased(game.released),
              rating: game.rating,
            });
          }

          for (const [index, shot] of game.shortScreenshots.entries()) {
            this.pushCandidate(out, seen, {
              id: `shot-${game.id}-${index}`,
              gameId: game.id,
              gameName: game.name,
              imageUrl: shot,
              kind: 'screenshot',
              releaseYear: this.yearFromReleased(game.released),
              rating: game.rating,
            });
          }
        }

        return out.slice(0, 24);
      }),
    );
  }

  searchGames(query: string, pageSize = 8): Observable<RawgGameSummary[]> {
    const q = query.trim();
    if (!q || !this.apiKey) {
      return of([]);
    }

    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('search', q)
      .set('page_size', String(pageSize))
      .set('search_precise', 'false');

    return this.http
      .get<RawgListResponse<RawgGameListItem>>(`${RAWG_BASE}/games`, { params })
      .pipe(
        map((res) => (res.results ?? []).map((item) => this.mapGame(item))),
        catchError(() => of([])),
      );
  }

  getScreenshots(gameId: number): Observable<string[]> {
    if (!this.apiKey || !gameId) {
      return of([]);
    }

    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('page_size', '12');

    return this.http
      .get<RawgListResponse<RawgScreenshotItem>>(
        `${RAWG_BASE}/games/${gameId}/screenshots`,
        { params },
      )
      .pipe(
        map((res) =>
          (res.results ?? [])
            .map((r) => r.image)
            .filter((url): url is string => !!url?.trim()),
        ),
        catchError(() => of([])),
      );
  }

  /** Shared list helper used by recommendations. */
  listGames(query: Record<string, string>): Observable<RawgGameSummary[]> {
    if (!this.apiKey) {
      return of([]);
    }

    let params = new HttpParams().set('key', this.apiKey);
    for (const [k, v] of Object.entries(query)) {
      params = params.set(k, v);
    }

    return this.http
      .get<RawgListResponse<RawgGameListItem>>(`${RAWG_BASE}/games`, { params })
      .pipe(
        map((res) => (res.results ?? []).map((item) => this.mapGame(item))),
        catchError(() => of([])),
      );
  }

  getSuggested(gameId: number, pageSize = 12): Observable<RawgGameSummary[]> {
    if (!this.apiKey || !gameId) {
      return of([]);
    }

    const params = new HttpParams()
      .set('key', this.apiKey)
      .set('page_size', String(pageSize));

    return this.http
      .get<RawgListResponse<RawgGameListItem>>(
        `${RAWG_BASE}/games/${gameId}/suggested`,
        { params },
      )
      .pipe(
        map((res) => (res.results ?? []).map((item) => this.mapGame(item))),
        catchError(() => of([])),
      );
  }

  private mapGame(item: RawgGameListItem): RawgGameSummary {
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      backgroundImage: item.background_image ?? null,
      released: item.released ?? null,
      rating: item.rating ?? null,
      metacritic: item.metacritic ?? null,
      genres: (item.genres ?? []).map((g) => g.name),
      platforms: (item.platforms ?? [])
        .map((p) => p.platform?.name)
        .filter((n): n is string => !!n),
      shortScreenshots: (item.short_screenshots ?? [])
        .map((s) => s.image)
        .filter((url): url is string => !!url?.trim()),
    };
  }

  private yearFromReleased(released?: string | null): number | undefined {
    if (!released) return undefined;
    const year = Number(released.slice(0, 4));
    return Number.isFinite(year) ? year : undefined;
  }

  private pushCandidate(
    out: RawgCoverCandidate[],
    seen: Set<string>,
    candidate: RawgCoverCandidate,
  ): void {
    const key = candidate.imageUrl.trim();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push(candidate);
  }
}
