import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { neon } from '@neondatabase/serverless';
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
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private authService = inject(AuthService);
  private readonly DATABASE_URL = environment.neonDatabaseUrl;
  
  private gamesSubject = new BehaviorSubject<Game[]>([]);
  games$ = this.gamesSubject.asObservable();

  private get sql() {
    return neon(this.DATABASE_URL);
  }

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
    const sql = this.sql;

    // Build WHERE conditions
    const conditions: string[] = [`g.user_id = '${userId}'`];
    
    if (filter?.search) {
      conditions.push(`g.title ILIKE '%${filter.search}%'`);
    }
    if (filter?.platformId) {
      conditions.push(`g.platform_id = '${filter.platformId}'`);
    }
    if (filter?.year) {
      conditions.push(`g.release_year = ${filter.year}`);
    }
    if (filter?.developerId) {
      conditions.push(`g.developer_id = '${filter.developerId}'`);
    }
    if (filter?.directorId) {
      conditions.push(`g.director_id = '${filter.directorId}'`);
    }
    if (filter?.genre) {
      conditions.push(`g.genre ILIKE '%${filter.genre}%'`);
    }
    if (filter?.completed !== undefined) {
      conditions.push(`g.completed = ${filter.completed}`);
    }

    const whereClause = conditions.join(' AND ');
    
    // Build ORDER BY - map camelCase to snake_case
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
    const orderBy = `g.${sortBy} ${sortOrder.toUpperCase()}`;

    // Get total count
    const countResult = await sql(`SELECT COUNT(*) as total FROM games g WHERE ${whereClause}`);
    const total = parseInt(countResult[0]['total']);

    // Get games with joins
    const games = await sql(`
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
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `);

    const mappedGames: Game[] = games.map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      coverImage: g.coverImage,
      platformId: g.platformId,
      platform: g.platformId ? {
        id: g.platformId,
        name: g.platformName || '',
        manufacturer: g.platformManufacturer,
        color: g.platformColor,
        createdAt: new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      developerId: g.developerId,
      developer: g.developerId ? {
        id: g.developerId,
        name: g.developerName || '',
        country: g.developerCountry,
        createdAt: new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      directorId: g.directorId,
      director: g.directorName,
      releaseYear: g.releaseYear,
      genre: g.genre ? [g.genre] : [],
      rating: g.rating ? parseFloat(g.rating) : undefined,
      playtimeHours: g.playtimeHours,
      completed: g.completed,
      purchaseDate: g.purchaseDate,
      notes: g.notes,
      userId: g.userId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));

    return {
      games: mappedGames,
      total,
      page,
      limit
    };
  }

  private async fetchGames(filters: GameFilters | undefined, userId: string): Promise<Game[]> {
    const sql = this.sql;

    // Build WHERE conditions
    const conditions: string[] = [`g.user_id = '${userId}'`];
    
    if (filters?.search) {
      conditions.push(`g.title ILIKE '%${filters.search}%'`);
    }
    if (filters?.platforms?.length) {
      const platformList = filters.platforms.map(p => `'${p}'`).join(',');
      conditions.push(`p.name IN (${platformList})`);
    }
    if (filters?.years?.length) {
      const yearList = filters.years.join(',');
      conditions.push(`g.release_year IN (${yearList})`);
    }
    if (filters?.developers?.length) {
      const devList = filters.developers.map(d => `'${d}'`).join(',');
      conditions.push(`c.name IN (${devList})`);
    }
    if (filters?.genres?.length) {
      const genreConditions = filters.genres.map(g => `g.genre ILIKE '%${g}%'`).join(' OR ');
      conditions.push(`(${genreConditions})`);
    }

    const whereClause = conditions.join(' AND ');
    
    // Build ORDER BY - map camelCase to snake_case
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
    const orderBy = `g.${sortBy} ${sortOrder.toUpperCase()}`;

    const games = await sql(`
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
      WHERE ${whereClause}
      ORDER BY ${orderBy}
    `);

    return games.map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      coverImage: g.coverImage,
      platformId: g.platformId,
      platform: g.platformId ? {
        id: g.platformId,
        name: g.platformName || '',
        manufacturer: g.platformManufacturer,
        color: g.platformColor,
        createdAt: new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      developerId: g.developerId,
      developer: g.developerId ? {
        id: g.developerId,
        name: g.developerName || '',
        country: g.developerCountry,
        createdAt: new Date().toISOString()
      } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
      directorId: g.directorId,
      director: g.directorName,
      releaseYear: g.releaseYear,
      genre: g.genre ? [g.genre] : [],
      rating: g.rating ? parseFloat(g.rating) : undefined,
      playtimeHours: g.playtimeHours,
      completed: g.completed,
      purchaseDate: g.purchaseDate,
      notes: g.notes,
      userId: g.userId,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));
  }

  getGameById(id: string): Observable<Game> {
    const sql = this.sql;
    
    return from(sql(`
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
      const g = games[0];
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        coverImage: g.coverImage,
        platformId: g.platformId,
        platform: g.platformId ? {
          id: g.platformId,
          name: g.platformName || '',
          manufacturer: g.platformManufacturer,
          color: g.platformColor,
          createdAt: new Date().toISOString()
        } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
        developerId: g.developerId,
        developer: g.developerId ? {
          id: g.developerId,
          name: g.developerName || '',
          country: g.developerCountry,
          createdAt: new Date().toISOString()
        } : { id: '', name: 'Unknown', createdAt: new Date().toISOString() },
        directorId: g.directorId,
        director: g.directorName,
        releaseYear: g.releaseYear,
        genre: g.genre ? [g.genre] : [],
        rating: g.rating ? parseFloat(g.rating) : undefined,
        playtimeHours: g.playtimeHours,
        completed: g.completed,
        purchaseDate: g.purchaseDate,
        notes: g.notes,
        userId: g.userId,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt
      } as Game;
    })).pipe(
      catchError(error => this.handleError(error, 'Failed to fetch game details'))
    );
  }

  createGame(game: CreateGameRequest): Observable<Game> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    const sql = this.sql;
    
    return from(sql(`
      INSERT INTO games (
        title, description, cover_image, platform_id, developer_id, director_id,
        release_year, genre, rating, playtime_hours, completed, purchase_date, notes, user_id
      ) VALUES (
        '${game.title.replace(/'/g, "''")}',
        ${game.description ? `'${game.description.replace(/'/g, "''")}'` : 'NULL'},
        ${game.coverImage ? `'${game.coverImage}'` : 'NULL'},
        ${game.platformId ? `'${game.platformId}'` : 'NULL'},
        ${game.developerId ? `'${game.developerId}'` : 'NULL'},
        ${game.directorId ? `'${game.directorId}'` : 'NULL'},
        ${game.releaseYear || 'NULL'},
        ${game.genre?.length ? `'${game.genre[0]}'` : 'NULL'},
        ${game.rating || 'NULL'},
        ${game.playtimeHours || 0},
        ${game.completed || false},
        ${game.purchaseDate ? `'${game.purchaseDate}'` : 'NULL'},
        ${game.notes ? `'${game.notes.replace(/'/g, "''")}'` : 'NULL'},
        '${currentUser.id}'
      ) RETURNING id::text, created_at as "createdAt", updated_at as "updatedAt"
    `).then((result: any[]) => {
      const r = result[0];
      return {
        ...game,
        id: r.id,
        userId: currentUser.id,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      } as Game;
    })).pipe(
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

    const sql = this.sql;
    
    // Build SET clauses
    const setClauses: string[] = [];
    
    if (game.title !== undefined) setClauses.push(`title = '${game.title.replace(/'/g, "''")}'`);
    if (game.description !== undefined) setClauses.push(`description = ${game.description ? `'${game.description.replace(/'/g, "''")}'` : 'NULL'}`);
    if (game.coverImage !== undefined) setClauses.push(`cover_image = ${game.coverImage ? `'${game.coverImage}'` : 'NULL'}`);
    if (game.platformId !== undefined) setClauses.push(`platform_id = ${game.platformId ? `'${game.platformId}'` : 'NULL'}`);
    if (game.developerId !== undefined) setClauses.push(`developer_id = ${game.developerId ? `'${game.developerId}'` : 'NULL'}`);
    if (game.directorId !== undefined) setClauses.push(`director_id = ${game.directorId ? `'${game.directorId}'` : 'NULL'}`);
    if (game.releaseYear !== undefined) setClauses.push(`release_year = ${game.releaseYear || 'NULL'}`);
    if (game.genre !== undefined) setClauses.push(`genre = ${game.genre?.length ? `'${game.genre[0]}'` : 'NULL'}`);
    if (game.rating !== undefined) setClauses.push(`rating = ${game.rating || 'NULL'}`);
    if (game.playtimeHours !== undefined) setClauses.push(`playtime_hours = ${game.playtimeHours || 0}`);
    if (game.completed !== undefined) setClauses.push(`completed = ${game.completed}`);
    if (game.purchaseDate !== undefined) setClauses.push(`purchase_date = ${game.purchaseDate ? `'${game.purchaseDate}'` : 'NULL'}`);
    if (game.notes !== undefined) setClauses.push(`notes = ${game.notes ? `'${game.notes.replace(/'/g, "''")}'` : 'NULL'}`);

    if (setClauses.length === 0) {
      return throwError(() => new Error('No fields to update'));
    }

    return from(sql(`
      UPDATE games 
      SET ${setClauses.join(', ')}
      WHERE id = '${id}' AND user_id = '${currentUser.id}'
      RETURNING id::text, title, description, cover_image as "coverImage",
        platform_id as "platformId", developer_id as "developerId", director_id as "directorId",
        release_year as "releaseYear", genre, rating, playtime_hours as "playtimeHours",
        completed, purchase_date as "purchaseDate", notes, user_id as "userId",
        created_at as "createdAt", updated_at as "updatedAt"
    `).then((result: any[]) => {
      if (result.length === 0) {
        throw new Error('Game not found or access denied');
      }
      const g = result[0];
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        coverImage: g.coverImage,
        platformId: g.platformId,
        developerId: g.developerId,
        directorId: g.directorId,
        releaseYear: g.releaseYear,
        genre: g.genre ? [g.genre] : [],
        rating: g.rating ? parseFloat(g.rating) : undefined,
        playtimeHours: g.playtimeHours,
        completed: g.completed,
        purchaseDate: g.purchaseDate,
        notes: g.notes,
        userId: g.userId,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt
      } as Game;
    })).pipe(
      catchError(error => this.handleError(error, 'Failed to update game'))
    );
  }

  deleteGame(id: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    const sql = this.sql;
    
    return from(sql(`
      DELETE FROM games WHERE id = '${id}' AND user_id = '${currentUser.id}'
    `).then(() => undefined)).pipe(
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
    const sql = this.sql;
    
    return from(Promise.all([
      sql('SELECT id::text, name, manufacturer, color, created_at as "createdAt" FROM platforms ORDER BY name'),
      sql('SELECT id::text, name, country, created_at as "createdAt" FROM companies ORDER BY name'),
      sql('SELECT id::text, name, birth_year as "birthYear", nationality, bio, created_at as "createdAt" FROM directors ORDER BY name'),
      sql('SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL'),
      sql('SELECT DISTINCT release_year FROM games WHERE release_year IS NOT NULL ORDER BY release_year DESC')
    ]).then(([platforms, companies, directors, genres, years]) => ({
      platforms: platforms as Platform[],
      developers: companies as Company[],
      directors: directors as Director[],
      genres: (genres as any[]).map(g => g.genre).filter(Boolean),
      years: (years as any[]).map(y => y.release_year).filter(Boolean)
    }))).pipe(
      catchError(error => this.handleError(error, 'Failed to fetch filter options'))
    );
  }

  uploadCoverImage(file: File): Observable<string> {
    // For image uploads without a backend, we need a different approach
    // Option 1: Use a service like Cloudinary, Imgur, or similar
    // Option 2: Convert to base64 and store directly
    // For now, we'll use base64
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
    const sql = this.sql;
    
    return from(sql(`
      SELECT DISTINCT genre FROM games WHERE genre IS NOT NULL
    `).then((result: any[]) => result.map(r => r.genre).filter(Boolean))).pipe(
      catchError(error => this.handleError(error, 'Failed to fetch genres'))
    );
  }

  // Additional methods for home page - using local data since no backend
  getPlatforms(): Observable<string[]> {
    const sql = this.sql;
    
    return from(sql('SELECT name FROM platforms ORDER BY name').then((result: any[]) => 
      result.map(r => r.name)
    )).pipe(
      catchError(() => {
        // Fallback: return default platforms
        const platforms = ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Steam Deck'];
        return new BehaviorSubject(platforms).asObservable();
      })
    );
  }

  getYears(): Observable<number[]> {
    const sql = this.sql;
    
    return from(sql('SELECT DISTINCT release_year FROM games WHERE release_year IS NOT NULL ORDER BY release_year DESC').then((result: any[]) => 
      result.map(r => r.release_year).filter(Boolean)
    )).pipe(
      catchError(() => {
        // Fallback: return years from 1980 to current year
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);
        return new BehaviorSubject(years).asObservable();
      })
    );
  }

  getDevelopers(): Observable<string[]> {
    const sql = this.sql;
    
    return from(sql('SELECT name FROM companies ORDER BY name').then((result: any[]) => 
      result.map(r => r.name)
    )).pipe(
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
