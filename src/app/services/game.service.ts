import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { 
  Game, 
  GameFilter, 
  GameFilters,
  CreateGameRequest, 
  UpdateGameRequest, 
  GamesResponse,
  FilterOptions 
} from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/games`;
  
  private gamesSubject = new BehaviorSubject<Game[]>([]);
  games$ = this.gamesSubject.asObservable();

  /**
   * Get games with filters (returns GamesResponse with pagination)
   */
  getGamesResponse(filter?: GameFilter, page = 1, limit = 20): Observable<GamesResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter) {
      if (filter.search) {
        params = params.set('search', filter.search);
      }
      if (filter.platformId) {
        params = params.set('platformId', filter.platformId);
      }
      if (filter.year) {
        params = params.set('year', filter.year.toString());
      }
      if (filter.developerId) {
        params = params.set('developerId', filter.developerId);
      }
      if (filter.directorId) {
        params = params.set('directorId', filter.directorId);
      }
      if (filter.genre) {
        params = params.set('genre', filter.genre);
      }
      if (filter.completed !== undefined) {
        params = params.set('completed', filter.completed.toString());
      }
      if (filter.sortBy) {
        params = params.set('sortBy', filter.sortBy);
        params = params.set('sortOrder', filter.sortOrder || 'desc');
      }
    }

    return this.http.get<GamesResponse>(this.apiUrl, { params })
      .pipe(
        tap(response => this.gamesSubject.next(response.games)),
        catchError(error => this.handleError(error, 'Failed to fetch games'))
      );
  }

  /**
   * Get games with filters (returns Game[] - for home page)
   */
  getGames(filters?: GameFilters): Observable<Game[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.platforms?.length) {
        filters.platforms.forEach(p => params = params.append('platform', p));
      }
      if (filters.years?.length) {
        filters.years.forEach(y => params = params.append('year', y.toString()));
      }
      if (filters.developers?.length) {
        filters.developers.forEach(d => params = params.append('developer', d));
      }
      if (filters.genres?.length) {
        filters.genres.forEach(g => params = params.append('genre', g));
      }
      if (filters.sortBy) {
        params = params.set('sortBy', filters.sortBy);
        params = params.set('sortOrder', filters.sortOrder || 'desc');
      }
    }

    return this.http.get<GamesResponse>(this.apiUrl, { params })
      .pipe(
        map(response => response.games),
        tap(games => this.gamesSubject.next(games)),
        catchError(error => this.handleError(error, 'Failed to fetch games'))
      );
  }

  getGameById(id: string): Observable<Game> {
    return this.http.get<Game>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => this.handleError(error, 'Failed to fetch game details'))
      );
  }

  createGame(game: CreateGameRequest): Observable<Game> {
    return this.http.post<Game>(this.apiUrl, game)
      .pipe(
        catchError(error => this.handleError(error, 'Failed to create game'))
      );
  }

  addGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Observable<Game> {
    return this.createGame(game as CreateGameRequest);
  }

  updateGame(id: string, game: UpdateGameRequest): Observable<Game> {
    return this.http.patch<Game>(`${this.apiUrl}/${id}`, game)
      .pipe(
        catchError(error => this.handleError(error, 'Failed to update game'))
      );
  }

  deleteGame(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
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
    return this.http.get<FilterOptions>(`${this.apiUrl}/filters`)
      .pipe(
        catchError(error => this.handleError(error, 'Failed to fetch filter options'))
      );
  }

  uploadCoverImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${environment.apiBaseUrl}/upload`, formData)
      .pipe(
        map(response => response.url),
        catchError(error => this.handleError(error, 'Failed to upload image'))
      );
  }

  searchGames(query: string, limit = 10): Observable<Game[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<GamesResponse>(this.apiUrl, { params })
      .pipe(
        map(response => response.games),
        catchError(error => this.handleError(error, 'Search failed'))
      );
  }

  getGenres(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/genres`)
      .pipe(
        catchError(error => this.handleError(error, 'Failed to fetch genres'))
      );
  }

  // Additional methods for home page
  getPlatforms(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiBaseUrl}/platforms`)
      .pipe(
        catchError(() => {
          // Fallback: return default platforms
          const platforms = ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Steam Deck'];
          return new BehaviorSubject(platforms).asObservable();
        })
      );
  }

  getYears(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/years`)
      .pipe(
        catchError(() => {
          // Fallback: return years from 1980 to current year
          const currentYear = new Date().getFullYear();
          const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);
          return new BehaviorSubject(years).asObservable();
        })
      );
  }

  getDevelopers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/developers`)
      .pipe(
        catchError(() => {
          return new BehaviorSubject<string[]>([]).asObservable();
        })
      );
  }

  private handleError(error: any, defaultMessage: string): Observable<never> {
    const message = error.error?.message || defaultMessage;
    return throwError(() => new Error(message));
  }
}
