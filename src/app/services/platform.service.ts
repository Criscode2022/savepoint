import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Platform } from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/platforms`;

  getPlatforms(): Observable<Platform[]> {
    return this.http.get<Platform[]>(this.apiUrl)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to fetch platforms')
        ))
      );
  }

  getPlatformById(id: string): Observable<Platform> {
    return this.http.get<Platform>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to fetch platform')
        ))
      );
  }
}