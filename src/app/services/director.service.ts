import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Director } from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DirectorService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/directors`;

  getDirectors(): Observable<Director[]> {
    return this.http.get<Director[]>(this.apiUrl)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to fetch directors')
        ))
      );
  }

  getDirectorById(id: string): Observable<Director> {
    return this.http.get<Director>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to fetch director')
        ))
      );
  }

  searchDirectors(query: string): Observable<Director[]> {
    return this.http.get<Director[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to search directors')
        ))
      );
  }
}