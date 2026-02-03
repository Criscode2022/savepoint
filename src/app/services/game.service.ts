import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
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
import { NeonRepository } from '../shared/repositories/neon.repository';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private authService = inject(AuthService);
  private repository = inject(NeonRepository);
  
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

  private async fetchGamesWithPagination(
    filter: GameFilter | undefined, 
    page: number, 
    limit: number,
    userId: string
  ): Promise<GamesResponse> {
    const offset = (page - 1) * limit;

    // Build filters
    const filters: { [key: string]: any } = { user_id: userId };
    if (filter?.search) filters['title'] = filter.search;
    if (filter?.platformId) filters['platform_id'] = filter.platformId;
    if (filter?.year) filters['release_year'] = filter.year;
    if (filter?.developerId) filters['developer_id'] = filter.developerId;
    if (filter?.directorId) filters['director_id'] = filter.directorId;
    if (filter?.genre) filters['genre'] = filter.genre;
    if (filter?.completed !== undefined) filters['completed'] = filter.completed;

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
    const sortOrder = filter?.sortOrder || 'desc';
    const order = `${sortBy}.${sortOrder}`;

    // Get total count using custom query (repository doesn't support count directly)
    const countResult = await this.repository.query<{ count: number }>(`SELECT COUNT(*) as count FROM games WHERE user_id = '${userId}'`);
    const total = parseInt(countResult[0]?.count as any) || 0;

    // Get games with joins using custom query for complex joins
    const games = await this.repository.query<any>(`
      SELECT 
        g.id::text, g.title, g.description, g.cover_image as "coverImage",
        g.platform_id as "platformId", p.name as "platformName", p.manufacturer as "platformManufacturer", p.color as "platformColor",
        g.developer_id as "developerId", c.name as "developerName", c.country as "developerCountry",
        g.director_id as "directorId", d.name as "directorName",
        g.release_year as "releaseYear", g.genre, g.rating, g.playtime_hours as "playtimeHours",
        g.completed, g.purchase_date as "purchaseDate", g.notes,
        g.user_id as "userId", g.created_at as "createdAt", g.updated_at as "updatedAt"
      FROM games g
      LEFT JOIN platforms p ON g.platform_id = p.id
      LEFT JOIN companies c ON g.developer_id = c.id
      LEFT JOIN directors d ON g.director_id = d.id
      WHERE g.user_id = '${userId}'
      ORDER BY g.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ${limit} OFFSET ${offset}
    `);

    const mappedGames: Game[] = games.map((g: any) => this.mapGameFromDb(g));

    return {
      games: mappedGames,
      total,
      page,
      limit
    };
  }

  private async fetchGames(filters: GameFilters | undefined, userId: string): Promise<Game[]> {
    // Build filters
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
    const sortOrder = filters?.sortOrder || 'desc';

    // For complex filters (platforms, years arrays), we need custom query
    let platformFilter = '';
    if (filters?.platforms?.length) {
      const platformList = filters.platforms.map(p => `'${p}'`).join(',');
      platformFilter = `AND p.name IN (${platformList})`;
    }

    let yearFilter = '';
    if (filters?.years?.length) {
      const yearList = filters.years.join(',');
      yearFilter = `AND g.release_year IN (${yearList})`;
    }

    let devFilter = '';
    if (filters?.developers?.length) {
      const devList = filters.developers.map(d => `'${d}'`).join(',');
      devFilter = `AND c.name IN (${devList})`;
    }

    let searchFilter = '';
    if (filters?.search) {
      searchFilter = `AND g.title ILIKE '%${filters.search.replace(/'/g, "''")}%'`;
    }

    const games = await this.repository.query<any>(`
      SELECT 
        g.id::text, g.title, g.description, g.cover_image as "coverImage",
        g.platform_id as "platformId", p.name as "platformName", p.manufacturer as "platformManufacturer", p.color as "platformColor",
        g.developer_id as "developerId", c.name as "developerName", c.country as "developerCountry",
        g.director_id as "directorId", d.name as "directorName",
        g.release_year as "releaseYear", g.genre, g.rating, g.playtime_hours as "playtimeHours",
        g.completed, g.purchase_date as "purchaseDate", g.notes,
        g.user_id as "userId", g.created_at as "createdAt", g.updated_at as "updatedAt"
      FROM games g
      LEFT JOIN platforms p ON g.platform_id = p.id
      LEFT JOIN companies c ON g.developer_id = c.id
      LEFT JOIN directors d ON g.director_id = d.id
      WHERE g.user_id = '${userId}' ${platformFilter} ${yearFilter} ${devFilter} ${searchFilter}
      ORDER BY g.${sortBy} ${sortOrder.toUpperCase()}
    `);

    return games.map((g: any) => this.mapGameFromDb(g));
  }

  private mapGameFromDb(g: Record<string, any>): Game {
    return {
      id: g['id'],
      title: g['title'],
      description: g['description'],
      coverImage: g['coverImage'],
      platformId: g['platformId'],
      platform: g['platformId'] ? {
        id: g['platformId'],
        name: g['platformName'] || '',
        manufacturer: g['platformManufacturer'],
        color: g['platformColor'],
        createdAt: new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      developerId: g['developerId'],
      developer: g['developerId'] ? {
        id: g['developerId'],
        name: g['developerName'] || '',
        country: g['developerCountry'],
        createdAt: new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      directorId: g['directorId'],
      director: g['directorName'],
      releaseYear: g['releaseYear'],
      genre: g['genre'] ? [g['genre']] : [],
      rating: g['rating'] ? parseFloat(g['rating']) : undefined,
      playtimeHours: g['playtimeHours'],
      completed: g['completed'],
      purchaseDate: g['purchaseDate'],
      notes: g['notes'],
      userId: g['userId'],
      createdAt: g['createdAt'],
      updatedAt: g['updatedAt']
    };
  }

  getGameById(id: string): Observable<Game> {
    return from(
      this.repository.query<any>(`
        SELECT 
          g.id::text, g.title, g.description, g.cover_image as "coverImage",
          g.platform_id as "platformId", p.name as "platformName", p.manufacturer as "platformManufacturer", p.color as "platformColor",
          g.developer_id as "developerId", c.name as "developerName", c.country as "developerCountry",
          g.director_id as "directorId", d.name as "directorName",
          g.release_year as "releaseYear", g.genre, g.rating, g.playtime_hours as "playtimeHours",
          g.completed, g.purchase_date as "purchaseDate", g.notes,
          g.user_id as "userId", g.created_at as "createdAt", g.updated_at as "updatedAt"
        FROM games g
        LEFT JOIN platforms p ON g.platform_id = p.id
        LEFT JOIN companies c ON g.developer_id = c.id
        LEFT JOIN directors d ON g.director_id = d.id
        WHERE g.id = '${id}'
      `).then((games: any[]) => {
        if (games.length === 0) {
          throw new Error('Game not found');
        }
        return this.mapGameFromDb(games[0]);
      })
    ).pipe(
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

    return from(
      this.repository.insert<any>('games', data).then((result: any) => ({
        ...game,
        id: result['id'],
        userId: currentUser.id,
        createdAt: result['created_at'],
        updatedAt: result['updated_at']
      } as Game))
    ).pipe(
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

    const data: { [key: string]: any } = {};
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

    return from(
      this.repository.updateById<any>('games', id, data).then((result: any) => {
        if (!result) {
          throw new Error('Game not found or access denied');
        }
        return this.mapGameFromDb(result);
      })
    ).pipe(
      catchError(error => this.handleError(error, 'Failed to update game'))
    );
  }

  deleteGame(id: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(
      this.repository.deleteById('games', id).then(() => undefined)
    ).pipe(
      catchError(error => this.handleError(error, 'Failed to delete game'))
    );
  }

  /**
   * Toggle completion status by ID
   */
  toggleCompleted(gameId: string): Observable<Game> {
    const game = this.gamesSubject.value.find(g => g.id === gameId);
    if (!game) {
      return throwError(() => new Error('Game not found'));
    }
    return this.updateGame(gameId, { completed: !game.completed });
  }

  /**
   * Set completion status explicitly
   */
  setCompleted(id: string, completed: boolean): Observable<Game> {
    return this.updateGame(id, { completed });
  }

  getFilterOptions(): Observable<FilterOptions> {
    return from(Promise.all([
      this.repository.select<Platform>('platforms', { order: 'name.asc' }),
      this.repository.select<Company>('companies', { order: 'name.asc' }),
      this.repository.select<Director>('directors', { order: 'name.asc' }),
      this.repository.query<{ genre: string }>('SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL'),
      this.repository.query<{ release_year: number }>('SELECT DISTINCT release_year FROM games WHERE release_year IS NOT NULL ORDER BY release_year DESC')
    ]).then(([platforms, companies, directors, genres, years]) => ({
      platforms: platforms.map(p => ({ 
        ...p, 
        createdAt: (p as any).created_at || new Date().toISOString() 
      })),
      developers: companies.map(c => ({ 
        ...c, 
        createdAt: (c as any).created_at || new Date().toISOString() 
      })),
      directors: directors.map(d => ({ 
        ...d, 
        birthYear: (d as any).birth_year,
        createdAt: (d as any).created_at || new Date().toISOString() 
      })),
      genres: genres.map(g => g.genre).filter(Boolean),
      years: years.map(y => y.release_year).filter(Boolean)
    }))).pipe(
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
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.getGames({ search: query });
  }

  getGenres(): Observable<string[]> {
    return from(
      this.repository.query<{ genre: string }>('SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL')
        .then(result => result.map(r => r.genre).filter(Boolean))
    ).pipe(
      catchError(error => this.handleError(error, 'Failed to fetch genres'))
    );
  }

  getPlatforms(): Observable<string[]> {
    return from(
      this.repository.select<{ name: string }>('platforms', { select: 'name', order: 'name.asc' })
        .then(result => result.map(r => r.name))
    ).pipe(
      catchError(() => {
        const platforms = ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Steam Deck'];
        return new BehaviorSubject(platforms).asObservable();
      })
    );
  }

  getYears(): Observable<number[]> {
    return from(
      this.repository.query<{ release_year: number }>('SELECT DISTINCT release_year FROM games WHERE release_year IS NOT NULL ORDER BY release_year DESC')
        .then(result => result.map(r => r.release_year).filter(Boolean))
    ).pipe(
      catchError(() => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);
        return new BehaviorSubject(years).asObservable();
      })
    );
  }

  getDevelopers(): Observable<string[]> {
    return from(
      this.repository.select<{ name: string }>('companies', { select: 'name', order: 'name.asc' })
        .then(result => result.map(r => r.name))
    ).pipe(
      catchError(() => {
        return new BehaviorSubject<string[]>([]).asObservable();
      })
    );
  }

  private handleError(error: any, defaultMessage: string): Observable<never> {
    const message = error?.message || defaultMessage;
    return throwError(() => new Error(message));
  }
}
