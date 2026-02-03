import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Platform } from '../models/game.model';
import { NeonRepository } from '../shared/repositories/neon.repository';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  private repository = inject(NeonRepository);

  getPlatforms(): Observable<Platform[]> {
    return from(
      this.repository.select<Platform>('platforms', { 
        select: 'id::text, name, manufacturer, generation, release_year as "releaseYear", icon_url as "iconUrl", color, created_at as "createdAt"',
        order: 'name.asc'
      }).then(platforms => platforms.map(p => ({
        ...p,
        releaseYear: (p as any).release_year,
        iconUrl: (p as any).icon_url,
        createdAt: (p as any).created_at
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch platforms')
      ))
    );
  }

  getPlatformById(id: string): Observable<Platform> {
    return from(
      this.repository.selectById<Platform>('platforms', id, {
        select: 'id::text, name, manufacturer, generation, release_year as "releaseYear", icon_url as "iconUrl", color, created_at as "createdAt"'
      }).then(platform => {
        if (!platform) {
          throw new Error('Platform not found');
        }
        return {
          ...platform,
          releaseYear: (platform as any).release_year,
          iconUrl: (platform as any).icon_url,
          createdAt: (platform as any).created_at
        };
      })
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch platform')
      ))
    );
  }
}
