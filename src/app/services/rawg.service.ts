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
  /** Present when loaded via getGameDetails */
  description?: string | null;
  developers?: string[];
  publishers?: string[];
  tags?: string[];
  website?: string | null;
  playtimeHours?: number | null;
}

/** Fields applied onto the add/edit game form from a RAWG result. */
export interface RawgGameImport {
  title: string;
  description?: string;
  coverImage?: string | null;
  releaseYear?: number;
  releaseDate?: string;
  developerName?: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  rawgId: number;
  rawgUrl: string;
  metacritic?: number | null;
  playtimeHours?: number | null;
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
  description_raw?: string | null;
  description?: string | null;
  developers?: Array<{ name: string }>;
  publishers?: Array<{ name: string }>;
  tags?: Array<{ name: string }>;
  website?: string | null;
  playtime?: number | null;
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

  /** Full game payload for auto-filling the add form. */
  getGameDetails(gameId: number): Observable<RawgGameSummary | null> {
    if (!this.apiKey || !gameId) {
      return of(null);
    }

    const params = new HttpParams().set('key', this.apiKey);

    return this.http
      .get<RawgGameListItem>(`${RAWG_BASE}/games/${gameId}`, { params })
      .pipe(
        map((item) => this.mapGame(item)),
        catchError(() => of(null)),
      );
  }

  /**
   * Search → fetch details → map into form-ready import fields.
   * Uses the list hit immediately, then enriches from /games/:id when available.
   */
  importGame(gameId: number, fallback?: RawgGameSummary): Observable<RawgGameImport | null> {
    return this.getGameDetails(gameId).pipe(
      map((detail) => {
        const src = detail ?? fallback;
        if (!src) return null;
        return this.toImport(src);
      }),
      catchError(() => of(fallback ? this.toImport(fallback) : null)),
    );
  }

  toImport(game: RawgGameSummary): RawgGameImport {
    const year = this.yearFromReleased(game.released);
    const description = this.cleanDescription(game.description ?? null);
    const developerName = game.developers?.[0] ?? undefined;
    const genreTags = game.genres ?? [];
    const rawgTags = (game.tags ?? []).slice(0, 8);

    return {
      title: game.name,
      description: description || undefined,
      coverImage: game.backgroundImage ?? null,
      releaseYear: year,
      releaseDate: game.released ?? undefined,
      developerName,
      genres: genreTags,
      tags: this.uniqueStrings([...genreTags.map((g) => g.toLowerCase()), ...rawgTags]).slice(0, 12),
      platforms: game.platforms ?? [],
      rawgId: game.id,
      rawgUrl: `https://rawg.io/games/${game.slug}`,
      metacritic: game.metacritic ?? null,
      playtimeHours: game.playtimeHours ?? null,
    };
  }

  /** Map RAWG platform label → local library platform id when possible. */
  matchPlatformId(
    rawgPlatforms: string[],
    libraryPlatforms: Array<{ id: string; name: string }>,
  ): string | null {
    if (!rawgPlatforms.length || !libraryPlatforms.length) return null;

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    const aliases: Array<{ idHint: string; patterns: string[] }> = [
      { idHint: 'ps5', patterns: ['playstation 5', 'ps5'] },
      { idHint: 'ps4', patterns: ['playstation 4', 'ps4'] },
      { idHint: 'xbox-series', patterns: ['xbox series', 'xbox series x', 'xbox series s'] },
      { idHint: 'xbox-one', patterns: ['xbox one'] },
      { idHint: 'switch', patterns: ['nintendo switch', 'switch'] },
      { idHint: 'pc', patterns: ['pc', 'windows', 'macos', 'linux', 'steam'] },
      { idHint: 'steam-deck', patterns: ['steam deck'] },
    ];

    const rawgNorm = rawgPlatforms.map(normalize);

    for (const alias of aliases) {
      const hit = alias.patterns.some((p) => rawgNorm.some((r) => r.includes(p)));
      if (!hit) continue;
      const byId = libraryPlatforms.find((p) => p.id === alias.idHint);
      if (byId) return byId.id;
      const byName = libraryPlatforms.find((p) =>
        alias.patterns.some((pat) => normalize(p.name).includes(pat)),
      );
      if (byName) return byName.id;
    }

    for (const rp of rawgNorm) {
      const match = libraryPlatforms.find((p) => {
        const n = normalize(p.name);
        return n === rp || n.includes(rp) || rp.includes(n);
      });
      if (match) return match.id;
    }

    return null;
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
    const description =
      this.cleanDescription(item.description_raw) ||
      this.cleanDescription(item.description);

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
      description: description || null,
      developers: (item.developers ?? []).map((d) => d.name).filter(Boolean),
      publishers: (item.publishers ?? []).map((p) => p.name).filter(Boolean),
      tags: (item.tags ?? []).map((t) => t.name).filter(Boolean),
      website: item.website ?? null,
      playtimeHours:
        item.playtime != null && item.playtime > 0 ? item.playtime : null,
    };
  }

  private cleanDescription(html?: string | null): string {
    if (!html?.trim()) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 2000);
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of values) {
      const t = v.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
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
