import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { 
  Game, 
  GameFilter, 
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
  private readonly apiUrl = `${environment.apiUrl}/games`;

  getGames(filter?: GameFilter, page = 1, limit = 20): Observable<GamesResponse> {
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

  toggleCompleted(id: string, completed: boolean): Observable<Game> {
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

    return this.http.post<{ url: string }>(`${environment.apiUrl}/upload`, formData)
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

  private handleError(error: any, defaultMessage: string): Observable<never> {
    const message = error.error?.message || defaultMessage;
    return throwError(() => new Error(message));
  }
}