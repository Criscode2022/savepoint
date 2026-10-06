import { Injectable, inject, signal } from "@angular/core";
import {
  Observable,
  from,
  of,
  switchMap,
  throwError,
} from "rxjs";
import { catchError, finalize, map, tap } from "rxjs/operators";
import {
  CreateGameRequest,
  deriveGameStatus,
  Game,
  GameFormPayload,
  GamePlayStatus,
  GAME_STATUS_CYCLE,
  PlaySession,
  PLATFORMS,
  UpdateGameRequest,
} from "../models/game.model";
import { AuthService } from "./auth.service";
import { CompanyService } from "./company.service";
import { DatabaseService } from "./database.service";
import { DirectorService } from "./director.service";
import { PlatformService } from "./platform.service";
import { canAddWishlistToLibrary } from "../shared/utils/release-countdown";
import { statusChangeClearsPlayHistory } from "../shared/utils/game-status.utils";
import {
  canRateGame,
  clampRating,
  isValidRating,
} from "../shared/utils/rating.utils";
import { normalizeGenres } from "../shared/utils/genre.utils";
import { normalizeTags } from "../shared/utils/tag.utils";
import { platformColor } from "../shared/utils/platform.utils";
import { normalizeCoverImage, processCoverImageFile } from "../shared/utils/image.utils";
import type { ImportGameDraft } from "../shared/utils/library-import.utils";

// Database row types
interface DbGame {
  id: string;
  title: string;
  description?: string;
  cover_image?: string;
  platform_id?: string;
  developer_id?: string;
  director_id?: string;
  release_year?: number;
  release_date?: string;
  genre?: string[] | null;
  tags?: string[] | null;
  rating?: number | null;
  rated_at?: string;
  playtime_hours?: number;
  completed: boolean;
  status?: GamePlayStatus;
  started_at?: string;
  completed_at?: string;
  last_played_at?: string;
  purchase_date?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  library_added_at?: string;
}

interface DbPlatform {
  id: string;
  name: string;
  manufacturer?: string;
  generation?: number;
  release_year?: number;
  icon_url?: string;
  color?: string;
  created_at: string;
}

interface DbCompany {
  id: string;
  name: string;
  country?: string;
  founded_year?: number;
  website?: string;
  created_at: string;
}

interface DbDirector {
  id: string;
  name: string;
  birth_year?: number;
  nationality?: string;
  bio?: string;
  created_at: string;
}

type HydratedDbGame = DbGame & {
  platform?: DbPlatform;
  developer?: DbCompany;
  director?: DbDirector;
};

interface DbPlaySession {
  id: string;
  game_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
}

@Injectable({
  providedIn: "root",
})
export class GameService {
  private readonly authService = inject(AuthService);
  private readonly db = inject(DatabaseService);
  private readonly companyService = inject(CompanyService);
  private readonly directorService = inject(DirectorService);
  private readonly platformService = inject(PlatformService);

  /** The whole library (every status). Pages derive their views from it with computed(). */
  private readonly _games = signal<Game[]>([]);
  public readonly games = this._games.asReadonly();

  private readonly _gamesLoading = signal(false);
  public readonly gamesLoading = this._gamesLoading.asReadonly();

  /** Fetch the library from the server and replace the cached copy. */
  public loadGames(): Observable<Game[]> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return throwError(() => new Error("User not authenticated"));
    }

    this._gamesLoading.set(true);
    return from(this.fetchGames(currentUser.id)).pipe(
      tap((games) => this._games.set(games)),
      finalize(() => this._gamesLoading.set(false)),
      catchError((error) => this.handleError(error, "Failed to fetch games")),
    );
  }

  private findGame(id: string): Game | undefined {
    return this._games().find((game) => game.id === id);
  }

  private replaceGame(updated: Game): void {
    this._games.update((games) =>
      games.map((game) => (game.id === updated.id ? updated : game)),
    );
  }

  private fetchGames(userId: string): Promise<Game[]> {
    return firstValueFrom(
      this.db.select<DbGame>("games", {
        select: "*",
        filters: { user_id: userId },
      }),
    ).then(async (games) => {
      const hydrated = await this.hydrateGames(games);
      return hydrated.map((g) => this.mapGameFromDb(g));
    });
  }

  private mapGameFromDb(g: HydratedDbGame | any): Game {
    const platform = g.platform as DbPlatform | undefined;
    const developer = g.developer as DbCompany | undefined;
    const director = g.director as DbDirector | undefined;
    const status = deriveGameStatus(g);

    return {
      id: g.id,
      title: g.title,
      description: g.description,
      coverImage: normalizeCoverImage(g.cover_image) ?? undefined,
      platformId: g.platform_id,
      platform: platform
        ? {
            id: platform.id,
            name: platform.name,
            manufacturer: platform.manufacturer,
            color: platform.color ?? platformColor(platform.name),
            createdAt: platform.created_at,
          }
        : {
            id: "",
            name: "Unknown",
            color: platformColor(),
            createdAt: new Date().toISOString(),
          },
      developerId: g.developer_id,
      developer: developer
        ? {
            id: developer.id,
            name: developer.name,
            country: developer.country,
            createdAt: developer.created_at || new Date().toISOString(),
          }
        : { id: "", name: "Unknown", createdAt: new Date().toISOString() },
      directorId: g.director_id,
      director: director?.name,
      releaseYear: g.release_year,
      releaseDate: g.release_date,
      genre: normalizeGenres(g.genre),
      tags: normalizeTags(g.tags),
      rating: g.rating != null ? Number(g.rating) : undefined,
      ratedAt: g.rated_at,
      playtimeHours: g.playtime_hours,
      playtime: g.playtime_hours,
      status,
      startedAt: g.started_at,
      completedAt: g.completed_at,
      lastPlayedAt: g.last_played_at,
      completed: status === "completed",
      purchaseDate: g.purchase_date,
      notes: g.notes,
      userId: g.user_id,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      libraryAddedAt: g.library_added_at,
    };
  }

  private mapPlaySessionFromDb(session: DbPlaySession): PlaySession {
    return {
      id: session.id,
      gameId: session.game_id,
      userId: session.user_id,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
      createdAt: session.created_at,
    };
  }

  public getCachedGameById(id: string): Game | undefined {
    return this.findGame(id);
  }

  public getGameById(id: string): Observable<Game> {
    const select = "*";

    return this.db.selectOne<DbGame>("games", id, { select }).pipe(
      switchMap((game) => {
        if (!game) {
          throw new Error("Game not found");
        }
        return from(this.hydrateGames([game]).then((rows) => rows[0]));
      }),
      map((game) => {
        return this.mapGameFromDb(game);
      }),
      catchError((error) =>
        this.handleError(error, "Failed to fetch game details"),
      ),
    );
  }

  private async hydrateGames(games: DbGame[]): Promise<HydratedDbGame[]> {
    const unique = (values: (string | undefined)[]): string[] => {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const v of values) {
        if (!v || seen.has(v)) continue;
        seen.add(v);
        out.push(v);
      }
      return out;
    };

    const platformIds = unique(games.map((g) => g.platform_id));
    const developerIds = unique(games.map((g) => g.developer_id));
    const directorIds = unique(games.map((g) => g.director_id));

    const [platforms, companies, directors] = await Promise.all([
      platformIds.length
        ? firstValueFrom(
            this.db.select<DbPlatform>("platforms", {
              select: "id,name,manufacturer,created_at",
              filters: { id: `in.(${platformIds.join(",")})` },
            }),
          )
        : Promise.resolve([] as DbPlatform[]),
      developerIds.length
        ? firstValueFrom(
            this.db.select<DbCompany>("companies", {
              select: "id,name,country,created_at",
              filters: { id: `in.(${developerIds.join(",")})` },
            }),
          )
        : Promise.resolve([] as DbCompany[]),
      directorIds.length
        ? firstValueFrom(
            this.db.select<DbDirector>("directors", {
              select: "id,name,created_at",
              filters: { id: `in.(${directorIds.join(",")})` },
            }),
          )
        : Promise.resolve([] as DbDirector[]),
    ]);

    const platformById = new Map(platforms.map((p) => [p.id, p] as const));
    const companyById = new Map(companies.map((c) => [c.id, c] as const));
    const directorById = new Map(directors.map((d) => [d.id, d] as const));

    return games.map((g) => ({
      ...g,
      platform: g.platform_id ? platformById.get(g.platform_id) : undefined,
      developer: g.developer_id ? companyById.get(g.developer_id) : undefined,
      director: g.director_id ? directorById.get(g.director_id) : undefined,
    }));
  }

  public createGame(game: CreateGameRequest): Observable<Game> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return throwError(() => new Error("User not authenticated"));
    }

    const status = this.resolveStatusForWrite(
      game.status,
      game.completed,
      undefined,
    );
    const now = new Date().toISOString();

    const data: Record<string, unknown> = {
      title: game.title,
      description: game.description || null,
      cover_image: normalizeCoverImage(game.coverImage) ?? null,
      platform_id: game.platformId || null,
      developer_id: game.developerId || null,
      director_id: game.directorId || null,
      release_year: game.releaseYear || null,
      release_date: game.releaseDate || null,
      genre: normalizeGenres(game.genre),
      rating: null,
      playtime_hours: game.playtimeHours ?? 0,
      status,
      completed: status === "completed",
      purchase_date: game.purchaseDate || null,
      notes: game.notes || null,
      user_id: currentUser.id,
    };

    data["tags"] = normalizeTags(game.tags);

    if (
      canRateGame(status) &&
      game.rating != null &&
      isValidRating(game.rating)
    ) {
      data["rating"] = clampRating(game.rating);
      data["rated_at"] = now;
    }

    if (status === "playing") {
      data["started_at"] = now;
      data["last_played_at"] = now;
    } else if (status === "completed") {
      data["started_at"] = now;
      data["completed_at"] = now;
      data["last_played_at"] = now;
    }

    return this.db.insert<DbGame>("games", data).pipe(
      switchMap((result: DbGame) => this.getGameById(result.id)),
      tap((createdGame) => {
        this._games.update((games) => this.mergeGameIntoList(games, createdGame));
      }),
      catchError((error) => this.handleError(error, "Failed to create game")),
    );
  }

  public saveGameFromForm(payload: GameFormPayload): Observable<Game> {
    return this.resolveFormPayload(payload).pipe(
      switchMap((request) => this.createGame(request)),
    );
  }

  public updateGameFromForm(id: string, payload: GameFormPayload): Observable<Game> {
    return this.resolveFormPayload(payload).pipe(
      switchMap((request) => this.updateGame(id, request)),
    );
  }

  public addGame(payload: GameFormPayload): Observable<Game> {
    return this.saveGameFromForm(payload);
  }

  private resolveFormPayload(
    payload: GameFormPayload,
  ): Observable<CreateGameRequest> {
    return this.platformService.resolvePlatformId(payload.platformId).pipe(
      switchMap((platformId) =>
        this.companyService.findOrCreateByName(payload.developerName).pipe(
          switchMap((developerId) =>
            this.directorService
              .findOrCreateByName(payload.directorName || "")
              .pipe(
                map((directorId) => {
                  const status = this.resolveStatusForWrite(
                    payload.status,
                    payload.completed,
                    undefined,
                  );
                  return {
                    title: payload.title.trim(),
                    description: payload.description?.trim() || undefined,
                    coverImage: payload.coverImage?.trim() || undefined,
                    platformId: platformId || undefined,
                    developerId,
                    directorId: directorId || undefined,
                    releaseYear: payload.releaseYear,
                    releaseDate: payload.releaseDate,
                    genre: payload.genre,
                    tags: payload.tags,
                    rating: payload.rating,
                    playtimeHours: payload.playtimeHours,
                    status,
                    completed: status === "completed",
                    notes: payload.notes?.trim() || undefined,
                  };
                }),
              ),
          ),
        ),
      ),
    );
  }

  public updateGame(id: string, game: UpdateGameRequest): Observable<Game> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return throwError(() => new Error("User not authenticated"));
    }

    const data: Record<string, any> = {};
    if (game.title !== undefined) data["title"] = game.title;
    if (game.description !== undefined) data["description"] = game.description;
    if (game.coverImage !== undefined) {
      data["cover_image"] = normalizeCoverImage(game.coverImage);
    }
    if (game.platformId !== undefined) data["platform_id"] = game.platformId;
    if (game.developerId !== undefined) data["developer_id"] = game.developerId;
    if (game.directorId !== undefined) data["director_id"] = game.directorId;
    if (game.releaseYear !== undefined) data["release_year"] = game.releaseYear;
    if (game.releaseDate !== undefined) data["release_date"] = game.releaseDate;
    if (game.genre !== undefined) {
      data["genre"] = normalizeGenres(game.genre);
    }
    if (game.tags !== undefined) {
      data["tags"] = normalizeTags(game.tags);
    }
    const existing = this.findGame(id);
    const nextStatus = game.status ?? existing?.status;

    if (!canRateGame(nextStatus)) {
      data["rating"] = null;
      data["rated_at"] = null;
    } else if (game.rating !== undefined) {
      if (game.rating == null) {
        data["rating"] = null;
        data["rated_at"] = null;
      } else {
        data["rating"] = clampRating(game.rating);
        if (game.ratedAt !== undefined) {
          data["rated_at"] = game.ratedAt;
        } else {
          data["rated_at"] = new Date().toISOString();
        }
      }
    } else if (game.ratedAt !== undefined) {
      data["rated_at"] = game.ratedAt;
    }
    if (game.playtimeHours !== undefined)
      data["playtime_hours"] = game.playtimeHours;
    if (game.status !== undefined) {
      data["status"] = game.status;
      data["completed"] = game.status === "completed";
      this.applyStatusTimestamps(id, game.status, game, data);

      if (
        existing?.status === "wishlist" &&
        game.status !== "wishlist" &&
        !existing.libraryAddedAt
      ) {
        data["library_added_at"] = new Date().toISOString();
      }
    } else if (game.completed !== undefined) {
      data["completed"] = game.completed;
      data["status"] = game.completed ? "completed" : "not_started";
    }
    if (game.startedAt !== undefined) data["started_at"] = game.startedAt;
    if (game.completedAt !== undefined) data["completed_at"] = game.completedAt;
    if (game.lastPlayedAt !== undefined)
      data["last_played_at"] = game.lastPlayedAt;
    if (game.purchaseDate !== undefined)
      data["purchase_date"] = game.purchaseDate;
    if (game.notes !== undefined) data["notes"] = game.notes;
    if (game.libraryAddedAt !== undefined) {
      data["library_added_at"] = game.libraryAddedAt;
    }

    if (Object.keys(data).length === 0) {
      return throwError(() => new Error("No fields to update"));
    }

    const shouldClearPlayHistory =
      game.status === "not_started" &&
      existing != null &&
      statusChangeClearsPlayHistory(existing.status, "not_started");

    if (shouldClearPlayHistory) {
      data["started_at"] = null;
      data["last_played_at"] = null;
      data["completed_at"] = null;
      data["playtime_hours"] = 0;
    }

    const previousStatus = existing?.status;
    const statusChanged =
      game.status !== undefined &&
      previousStatus !== undefined &&
      game.status !== previousStatus;

    return this.db.updateById<DbGame>("games", id, data).pipe(
      switchMap((result: DbGame | undefined) => {
        if (!result) {
          throw new Error("Game not found or access denied");
        }
        return this.getGameById(id);
      }),
      switchMap((updatedGame) => {
        if (shouldClearPlayHistory) {
          return this.clearPlaySessions(id).pipe(map(() => updatedGame));
        }

        if (statusChanged && game.status) {
          return this.syncPlaySession(updatedGame, game.status).pipe(
            map(() => updatedGame),
          );
        }

        return of(updatedGame);
      }),
      map((updatedGame) =>
        game.coverImage === null
          ? { ...updatedGame, coverImage: undefined }
          : updatedGame,
      ),
      tap((normalizedGame) => {
        this.replaceGame(normalizedGame);
      }),
      catchError((error) => this.handleError(error, "Failed to update game")),
    );
  }

  public deleteGame(id: string): Observable<void> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return throwError(() => new Error("User not authenticated"));
    }

    return this.db.deleteById("games", id).pipe(
      map(() => {
        this._games.update((games) => games.filter((game) => game.id !== id));
      }),
      catchError((error) => this.handleError(error, "Failed to delete game")),
    );
  }

  public cycleStatus(gameId: string): Observable<Game> {
    const game = this.findGame(gameId);
    if (!game) {
      return throwError(() => new Error("Game not found"));
    }

    const nextStatus = GAME_STATUS_CYCLE[game.status];
    if (
      game.status === "wishlist" &&
      nextStatus === "not_started" &&
      !canAddWishlistToLibrary(game)
    ) {
      return throwError(() => new Error("Game is not released yet"));
    }

    return this.setStatus(gameId, nextStatus);
  }

  public setStatus(id: string, status: GamePlayStatus, sourceGame?: Game): Observable<Game> {
    const game = sourceGame ?? this.findGame(id);

    if (
      game &&
      game.status === "wishlist" &&
      status !== "wishlist" &&
      !canAddWishlistToLibrary(game)
    ) {
      return throwError(() => new Error("Game is not released yet"));
    }

    if (game) {
      return this.applyStatusChange(game, status);
    }

    return this.getGameById(id).pipe(
      switchMap((fetched) => {
        if (!fetched) {
          return throwError(() => new Error("Game not found"));
        }
        return this.applyStatusChange(fetched, status);
      }),
    );
  }

  private applyStatusChange(game: Game, status: GamePlayStatus): Observable<Game> {
    if (game.status !== "wishlist" && status === "wishlist") {
      return throwError(
        () => new Error("Library games cannot be moved to wishlist"),
      );
    }

    const previousStatus = game.status;
    const now = new Date().toISOString();
    const update: UpdateGameRequest = {
      status,
      completed: status === "completed",
    };

    if (status === "playing") {
      update.startedAt = game.startedAt || now;
      update.lastPlayedAt = now;
      update.completedAt = null;
    } else if (status === "paused") {
      update.completedAt = null;
    } else if (status === "completed") {
      update.completedAt = now;
      update.lastPlayedAt = now;
      if (!game.startedAt) {
        update.startedAt = now;
      }
    } else if (status === "wishlist") {
      update.completedAt = null;
      update.rating = null;
      update.ratedAt = null;
    } else if (statusChangeClearsPlayHistory(previousStatus, status)) {
      update.completedAt = null;
      update.startedAt = null;
      update.lastPlayedAt = null;
      update.playtimeHours = 0;
    } else {
      update.completedAt = null;
    }

    return this.updateGame(game.id, update).pipe(
      switchMap((updatedGame) => {
        if (statusChangeClearsPlayHistory(previousStatus, status)) {
          return of(updatedGame);
        }

        return this.syncPlaySession(updatedGame, status).pipe(
          map(() => updatedGame),
        );
      }),
    );
  }

  public setCompleted(id: string, completed: boolean): Observable<Game> {
    return this.setStatus(id, completed ? "completed" : "not_started");
  }

  public setRating(id: string, rating: number | null, sourceGame?: Game): Observable<Game> {
    const game = sourceGame ?? this.findGame(id);

    if (game && !canRateGame(game.status)) {
      return throwError(() => new Error("Wishlist games cannot be rated"));
    }

    const normalized =
      rating == null ? null : isValidRating(rating) ? clampRating(rating) : null;

    const update: UpdateGameRequest = {
      rating: normalized,
      ratedAt: normalized != null ? new Date().toISOString() : null,
    };

    return this.updateGame(id, update).pipe(
      tap((updatedGame) => {
        if (sourceGame) {
          Object.assign(sourceGame, updatedGame);
        }
      }),
    );
  }

  public getPlaySessions(gameId: string): Observable<PlaySession[]> {
    return this.db
      .select<DbPlaySession>("play_sessions", {
        filters: { game_id: gameId },
        order: "started_at.desc",
      })
      .pipe(
        map((sessions) => sessions.map((s) => this.mapPlaySessionFromDb(s))),
        catchError(() => of([])),
      );
  }

  private resolveStatusForWrite(
    status: GamePlayStatus | undefined,
    completed: boolean | undefined,
    currentStatus: GamePlayStatus | undefined,
  ): GamePlayStatus {
    if (status) {
      return status;
    }
    if (completed !== undefined) {
      return completed ? "completed" : "not_started";
    }
    return currentStatus ?? "not_started";
  }

  private applyStatusTimestamps(
    id: string,
    status: GamePlayStatus,
    request: UpdateGameRequest,
    data: Record<string, any>,
  ): void {
    const existing = this.findGame(id);
    const now = new Date().toISOString();

    if (status === "playing") {
      if (request.startedAt === undefined && !existing?.startedAt) {
        data["started_at"] = now;
      }
      if (request.lastPlayedAt === undefined) {
        data["last_played_at"] = now;
      }
      if (request.completedAt === undefined) {
        data["completed_at"] = null;
      }
    } else if (status === "completed") {
      if (request.completedAt === undefined) {
        data["completed_at"] = now;
      }
      if (request.lastPlayedAt === undefined) {
        data["last_played_at"] = now;
      }
      if (request.startedAt === undefined && !existing?.startedAt) {
        data["started_at"] = now;
      }
    } else if (status === "paused") {
      if (request.completedAt === undefined) {
        data["completed_at"] = null;
      }
    } else if (request.completedAt === undefined) {
      data["completed_at"] = null;
    }
  }

  private clearPlaySessions(gameId: string): Observable<void> {
    return this.db.delete("play_sessions", { game_id: gameId }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  private syncPlaySession(
    game: Game,
    status: GamePlayStatus,
  ): Observable<void> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return of(undefined);
    }

    if (status === "playing") {
      return this.db
        .insert<DbPlaySession>("play_sessions", {
          game_id: game.id,
          user_id: currentUser.id,
          started_at: new Date().toISOString(),
        })
        .pipe(
          map(() => undefined),
          catchError(() => of(undefined)),
        );
    }

    if (status === "paused" || status === "completed") {
      return this.closeOpenPlaySession(game.id);
    }

    return of(undefined);
  }

  private closeOpenPlaySession(gameId: string): Observable<void> {
    return this.db
      .select<DbPlaySession>("play_sessions", {
        filters: { game_id: gameId, ended_at: "is.null" },
        order: "started_at.desc",
        limit: 1,
      })
      .pipe(
        switchMap((sessions) => {
          if (!sessions.length) {
            return of(undefined);
          }

          const session = sessions[0];
          const endedAt = new Date().toISOString();
          const durationMinutes = Math.max(
            1,
            Math.round(
              (Date.now() - new Date(session.started_at).getTime()) / 60000,
            ),
          );

          return this.db
            .updateById<DbPlaySession>("play_sessions", session.id, {
              ended_at: endedAt,
              duration_minutes: durationMinutes,
            })
            .pipe(
              map(() => undefined),
              catchError(() => of(undefined)),
            );
        }),
        catchError(() => of(undefined)),
      );
  }

  public uploadCoverImage(file: File): Observable<string> {
    return from(processCoverImageFile(file)).pipe(
      catchError((error) =>
        throwError(
          () =>
            new Error(
              error instanceof Error ? error.message : "Failed to process image",
            ),
        ),
      ),
    );
  }

  private handleError(error: any, defaultMessage: string): Observable<never> {
    const message = error?.message || defaultMessage;
    return throwError(() => new Error(message));
  }

  /**
   * Add playtime hours and refresh last played (ritual quick-log).
   */
  public logPlaytime(gameId: string, hours: number): Observable<Game> {
    const game = this.findGame(gameId);

    if (!game) {
      return throwError(() => new Error("Game not found"));
    }

    if (game.status === "wishlist") {
      return throwError(() => new Error("Cannot log playtime on wishlist games"));
    }

    const add = Math.max(0, Number(hours) || 0);
    if (add <= 0) {
      return throwError(() => new Error("Playtime must be greater than 0"));
    }

    const current = game.playtimeHours ?? game.playtime ?? 0;
    const nextStatus =
      game.status === "not_started" || game.status === "paused"
        ? "playing"
        : game.status;

    return this.updateGame(gameId, {
      playtimeHours: Math.round((current + add) * 10) / 10,
      status: nextStatus,
      lastPlayedAt: new Date().toISOString(),
    });
  }

  /**
   * Import games from parsed JSON drafts (sequential to reduce API race risk).
   */
  public importGames(drafts: ImportGameDraft[]): Observable<{ created: number; failed: number }> {
    if (!drafts.length) {
      return of({ created: 0, failed: 0 });
    }

    return from(this.runImport(drafts));
  }

  private async runImport(
    drafts: ImportGameDraft[],
  ): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;

    for (const draft of drafts) {
      try {
        const platformId = await firstValueFrom(
          this.platformService.resolvePlatformId(
            this.matchPlatformId(draft.platformName),
          ),
        );
        await firstValueFrom(
          this.saveGameFromForm({
            title: draft.title,
            description: draft.description,
            coverImage: draft.coverImage,
            platformId: platformId || undefined,
            developerName: draft.developerName || "Unknown",
            directorName: draft.directorName,
            releaseYear: draft.releaseYear,
            releaseDate: draft.releaseDate,
            genre: draft.genre,
            tags: draft.tags,
            rating: draft.rating,
            playtimeHours: draft.playtimeHours,
            status: draft.status || "not_started",
            notes: draft.notes,
          }),
        );
        created += 1;
      } catch {
        failed += 1;
      }
    }

    await firstValueFrom(this.loadGames());
    return { created, failed };
  }

  private matchPlatformId(name?: string): string | undefined {
    if (!name?.trim()) {
      return undefined;
    }
    const q = name.trim().toLowerCase();
    const hit = PLATFORMS.find(
      (p) =>
        p.name.toLowerCase() === q ||
        p.name.toLowerCase().includes(q) ||
        q.includes(p.name.toLowerCase()),
    );
    return hit?.id;
  }

  private mergeGameIntoList(games: Game[], createdGame: Game): Game[] {
    const existingIndex = games.findIndex(
      (game) => game.id === createdGame.id,
    );
    if (existingIndex === -1) {
      return [createdGame, ...games];
    }
    return [
      createdGame,
      ...games.slice(0, existingIndex),
      ...games.slice(existingIndex + 1),
    ];
  }
}

// Helper function to convert Observable to Promise
function firstValueFrom<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({
      next: resolve,
      error: reject,
      complete: () => {},
    });
  });
}
