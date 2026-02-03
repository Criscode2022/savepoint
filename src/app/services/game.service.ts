import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject, switchMap, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
  Game, 
  GameFilter, 
  GameFilters,
  CreateGameRequest, 
  UpdateGameRequest, 
  GamesResponse,
  FilterOptions,
  Platform,
  Company,
  Director
} from '../models/game.model';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';

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
  genre?: string;
  rating?: number;
  playtime_hours?: number;
  completed: boolean;
  purchase_date?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
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

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private authService = inject(AuthService);
  private db = inject(DatabaseService);
  
  private gamesSubject = new BehaviorSubject<Game[]>([]);
  games$ = this.gamesSubject.asObservable();

  /**
   * Get games with filters (returns GamesResponse with pagination)
   */
  getGamesResponse(filter?: GameFilter, page = 1, limit = 20): Observable<GamesResponse> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(this.fetchGamesWithPagination(filter, page, limit, currentUser.id)).pipe(
      tap(response => this.gamesSubject.next(response.games)),
      catchError(error => this.handleError(error, 'Failed to fetch games'))
    );
  }

  /**
   * Get games with filters (returns Game[] - for home page)
   */
  getGames(filters?: GameFilters): Observable<Game[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(this.fetchGames(filters, currentUser.id)).pipe(
      tap(games => this.gamesSubject.next(games)),
      catchError(error => this.handleError(error, 'Failed to fetch games'))
    );
  }

  private fetchGamesWithPagination(
    filter: GameFilter | undefined, 
    page: number, 
    limit: number,
    userId: string
  ): Promise<GamesResponse> {
    const offset = (page - 1) * limit;

    // Build filters
    const filters: Record<string, any> = { user_id: userId };
    if (filter?.platformId) filters['platform_id'] = filter.platformId;
    if (filter?.year) filters['release_year'] = filter.year;
    if (filter?.developerId) filters['developer_id'] = filter.developerId;
    if (filter?.directorId) filters['director_id'] = filter.directorId;
    if (filter?.genre) filters['genre'] = filter.genre;
    if (filter?.completed !== undefined) filters['completed'] = filter.completed;

    // For search, we need to use ILIKE which isn't directly supported by simple eq filters
    // We'll fetch all and filter client-side for search, or use a custom endpoint

    // Build order
    const sortFieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at', 
      'releaseYear': 'release_year',
      'playtimeHours': 'playtime_hours',
      'title': 'title',
      'rating': 'rating'
    };
    const sortBy = sortFieldMap[filter?.sortBy || 'createdAt'] || 'created_at';
    const sortOrder = filter?.sortOrder === 'asc' ? 'asc' : 'desc';
    const order = `${sortBy}.${sortOrder}`;

    // Use select with embedded resources
    const select = `*,
      platform:platforms(id,name,manufacturer,color),
      developer:companies(id,name,country),
      director:directors(id,name)`;

    return Promise.all([
      // Get total count
      firstValueFrom(this.db.select<DbGame>('games', { 
        select: 'count',
        filters,
        limit: 1
      })).then(() => 0), // PostgREST returns count in headers, simplified here
      
      // Get games
      firstValueFrom(this.db.select<any>('games', {
        select,
        filters,
        order,
        limit,
        offset
      }))
    ]).then(([total, games]) => {
      // Count query - we need to do a separate count
      return firstValueFrom(this.db.select<DbGame>('games', { filters, limit: 10000 }))
        .then(allGames => {
          const filteredGames = filter?.search 
            ? allGames.filter(g => g.title?.toLowerCase().includes(filter.search!.toLowerCase()))
            : allGames;
          
          return {
            games: games.map(g => this.mapGameFromDb(g)),
            total: filteredGames.length,
            page,
            limit
          };
        });
    });
  }

  private fetchGames(filters: GameFilters | undefined, userId: string): Promise<Game[]> {
    // Build base filters
    const dbFilters: Record<string, any> = { user_id: userId };
    
    // Build order
    const sortFieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'releaseYear': 'release_year',
      'playtimeHours': 'playtime_hours',
      'title': 'title',
      'rating': 'rating'
    };
    const sortBy = sortFieldMap[filters?.sortBy || 'createdAt'] || 'created_at';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';
    const order = `${sortBy}.${sortOrder}`;

    // Use select with embedded resources for joins
    const select = `*,
      platform:platforms(id,name,manufacturer,color),
      developer:companies(id,name,country),
      director:directors(id,name)`;

    return firstValueFrom(
      this.db.select<any>('games', {
        select,
        filters: dbFilters,
        order
      })
    ).then(games => {
      // Client-side filtering for complex filters
      let filtered = games;
      
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter((g: any) => 
          g.title?.toLowerCase().includes(search)
        );
      }
      
      if (filters?.platforms?.length) {
        filtered = filtered.filter((g: any) => 
          g.platform && filters.platforms!.includes(g.platform.name)
        );
      }
      
      if (filters?.years?.length) {
        filtered = filtered.filter((g: any) => 
          filters.years!.includes(g.release_year)
        );
      }
      
      if (filters?.developers?.length) {
        filtered = filtered.filter((g: any) => 
          g.developer && filters.developers!.includes(g.developer.name)
        );
      }

      return filtered.map((g: any) => this.mapGameFromDb(g));
    });
  }

  private mapGameFromDb(g: any): Game {
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      coverImage: g.cover_image,
      platformId: g.platform_id,
      platform: g.platform ? {
        id: g.platform.id,
        name: g.platform.name,
        manufacturer: g.platform.manufacturer,
        color: g.platform.color,
        createdAt: g.platform.created_at
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      developerId: g.developer_id,
      developer: g.developer ? {
        id: g.developer.id,
        name: g.developer.name,
        country: g.developer.country,
        createdAt: g.developer.created_at || new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      directorId: g.director_id,
      director: g.director?.name,
      releaseYear: g.release_year,
      genre: g.genre ? [g.genre] : [],
      rating: g.rating,
      playtimeHours: g.playtime_hours,
      completed: g.completed,
      purchaseDate: g.purchase_date,
      notes: g.notes,
      userId: g.user_id,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    };
  }

  getGameById(id: string): Observable<Game> {
    const select = `*,
      platform:platforms(id,name,manufacturer,color),
      developer:companies(id,name,country),
      director:directors(id,name)`;

    return this.db.selectOne<any>('games', id, { select }).pipe(
      map(game => {
        if (!game) {
          throw new Error('Game not found');
        }
        return this.mapGameFromDb(game);
      }),
      catchError(error => this.handleError(error, 'Failed to fetch game details'))
    );
  }

  createGame(game: CreateGameRequest): Observable<Game> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    const data = {
      title: game.title,
      description: game.description || null,
      cover_image: game.coverImage || null,
      platform_id: game.platformId || null,
      developer_id: game.developerId || null,
      director_id: game.directorId || null,
      release_year: game.releaseYear || null,
      genre: game.genre?.[0] || null,
      rating: game.rating || null,
      playtime_hours: game.playtimeHours || 0,
      completed: game.completed || false,
      purchase_date: game.purchaseDate || null,
      notes: game.notes || null,
      user_id: currentUser.id
    };

    return this.db.insert<DbGame>('games', data).pipe(
      switchMap((result: DbGame) => {
        // Fetch with joins to get full data
        return this.getGameById(result.id);
      }),
      catchError(error => this.handleError(error, 'Failed to create game'))
    );
  }

  addGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Observable<Game> {
    return this.createGame(game as CreateGameRequest);
  }

  updateGame(id: string, game: UpdateGameRequest): Observable<Game> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    const data: Record<string, any> = {};
    if (game.title !== undefined) data['title'] = game.title;
    if (game.description !== undefined) data['description'] = game.description;
    if (game.coverImage !== undefined) data['cover_image'] = game.coverImage;
    if (game.platformId !== undefined) data['platform_id'] = game.platformId;
    if (game.developerId !== undefined) data['developer_id'] = game.developerId;
    if (game.directorId !== undefined) data['director_id'] = game.directorId;
    if (game.releaseYear !== undefined) data['release_year'] = game.releaseYear;
    if (game.genre !== undefined) data['genre'] = game.genre?.[0] || null;
    if (game.rating !== undefined) data['rating'] = game.rating;
    if (game.playtimeHours !== undefined) data['playtime_hours'] = game.playtimeHours;
    if (game.completed !== undefined) data['completed'] = game.completed;
    if (game.purchaseDate !== undefined) data['purchase_date'] = game.purchaseDate;
    if (game.notes !== undefined) data['notes'] = game.notes;

    if (Object.keys(data).length === 0) {
      return throwError(() => new Error('No fields to update'));
    }

    return this.db.updateById<DbGame>('games', id, data).pipe(
      switchMap((result: DbGame | undefined) => {
        if (!result) {
          throw new Error('Game not found or access denied');
        }
        // Fetch with joins to get full data
        return this.getGameById(id);
      }),
      catchError(error => this.handleError(error, 'Failed to update game'))
    );
  }

  deleteGame(id: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.db.deleteById('games', id).pipe(
      map(() => undefined),
      catchError(error => this.handleError(error, 'Failed to delete game'))
    );
  }

  toggleCompleted(gameId: string): Observable<Game> {
    const game = this.gamesSubject.value.find(g => g.id === gameId);
    if (!game) {
      return throwError(() => new Error('Game not found'));
    }
    return this.updateGame(gameId, { completed: !game.completed });
  }

  setCompleted(id: string, completed: boolean): Observable<Game> {
    return this.updateGame(id, { completed });
  }

  getFilterOptions(): Observable<FilterOptions> {
    return from(Promise.all([
      firstValueFrom(this.db.select<DbPlatform>('platforms', { order: 'name.asc' })),
      firstValueFrom(this.db.select<DbCompany>('companies', { order: 'name.asc' })),
      firstValueFrom(this.db.select<DbDirector>('directors', { order: 'name.asc' })),
      firstValueFrom(this.db.select<DbGame>('games', { 
        select: 'genre',
        filters: { genre: 'not.is.null' }
      })),
      firstValueFrom(this.db.select<DbGame>('games', {
        select: 'release_year',
        filters: { release_year: 'not.is.null' },
        order: 'release_year.desc'
      }))
    ])).pipe(
      map(([platforms, companies, directors, gamesWithGenre, gamesWithYear]) => ({
        platforms: platforms.map(p => ({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer,
          color: p.color,
          createdAt: p.created_at
        })),
        developers: companies.map(c => ({
          id: c.id,
          name: c.name,
          country: c.country,
          createdAt: c.created_at
        })),
        directors: directors.map(d => ({
          id: d.id,
          name: d.name,
          birthYear: d.birth_year,
          nationality: d.nationality,
          bio: d.bio,
          createdAt: d.created_at
        })),
        genres: [...new Set(gamesWithGenre.map(g => g.genre).filter(Boolean))] as string[],
        years: [...new Set(gamesWithYear.map(g => g.release_year).filter(Boolean))] as number[]
      })),
      catchError(error => this.handleError(error, 'Failed to fetch filter options'))
    );
  }

  uploadCoverImage(file: File): Observable<string> {
    return from(new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })).pipe(
      catchError(error => throwError(() => new Error('Failed to process image')))
    );
  }

  searchGames(query: string, limit = 10): Observable<Game[]> {
    return this.getGames({ search: query });
  }

  getGenres(): Observable<string[]> {
    return this.db.select<DbGame>('games', {
      select: 'genre',
      filters: { genre: 'not.is.null' }
    }).pipe(
      map(games => [...new Set(games.map(g => g.genre).filter(Boolean))] as string[]),
      catchError(error => this.handleError(error, 'Failed to fetch genres'))
    );
  }

  getPlatforms(): Observable<string[]> {
    return this.db.select<DbPlatform>('platforms', {
      select: 'name',
      order: 'name.asc'
    }).pipe(
      map(platforms => platforms.map(p => p.name)),
      catchError(() => {
        const platforms = ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Steam Deck'];
        return of(platforms);
      })
    );
  }

  getYears(): Observable<number[]> {
    return this.db.select<DbGame>('games', {
      select: 'release_year',
      filters: { release_year: 'not.is.null' },
      order: 'release_year.desc'
    }).pipe(
      map(games => [...new Set(games.map(g => g.release_year).filter(Boolean))] as number[]),
      catchError(() => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);
        return of(years);
      })
    );
  }

  getDevelopers(): Observable<string[]> {
    return this.db.select<DbCompany>('companies', {
      select: 'name',
      order: 'name.asc'
    }).pipe(
      map(companies => companies.map(c => c.name)),
      catchError(() => of([]))
    );
  }

  private handleError(error: any, defaultMessage: string): Observable<never> {
    const message = error?.message || defaultMessage;
    return throwError(() => new Error(message));
  }
}

// Helper function to convert Observable to Promise
function firstValueFrom<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({
      next: resolve,
      error: reject,
      complete: () => {}
    });
  });
}
