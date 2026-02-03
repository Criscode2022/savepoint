import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { neon } from '@neondatabase/serverless';
import { Platform } from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  private readonly DATABASE_URL = environment.neonDatabaseUrl;

  private get sql() {
    return neon(this.DATABASE_URL);
  }

  getPlatforms(): Observable<Platform[]> {
    return from(
      this.sql(`
        SELECT 
          id::text, 
          name, 
          manufacturer, 
          generation, 
          release_year as "releaseYear", 
          icon_url as "iconUrl",
          color,
          created_at as "createdAt"
        FROM platforms 
        ORDER BY name
      `).then((platforms: any[]) => platforms.map(p => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer,
        generation: p.generation,
        releaseYear: p.releaseYear,
        iconUrl: p.iconUrl,
        color: p.color,
        createdAt: p.createdAt
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch platforms')
      ))
    );
  }

  getPlatformById(id: string): Observable<Platform> {
    return from(
      this.sql(`
        SELECT 
          id::text, 
          name, 
          manufacturer, 
          generation, 
          release_year as "releaseYear", 
          icon_url as "iconUrl",
          color,
          created_at as "createdAt"
        FROM platforms 
        WHERE id = '${id}'
      `).then((platforms: any[]) => {
        if (platforms.length === 0) {
          throw new Error('Platform not found');
        }
        const p = platforms[0];
        return {
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer,
          generation: p.generation,
          releaseYear: p.releaseYear,
          iconUrl: p.iconUrl,
          color: p.color,
          createdAt: p.createdAt
        };
      })
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch platform')
      ))
    );
  }
}
