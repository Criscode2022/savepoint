import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Platform } from '../models/game.model';
import { DatabaseService } from './database.service';

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

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  private db = inject(DatabaseService);

  getPlatforms(): Observable<Platform[]> {
    return this.db.select<DbPlatform>('platforms', { order: 'name.asc' }).pipe(
      map(platforms => platforms.map(p => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer,
        generation: p.generation,
        releaseYear: p.release_year,
        iconUrl: p.icon_url,
        color: p.color,
        createdAt: p.created_at
      }))),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch platforms')
      ))
    );
  }

  getPlatformById(id: string): Observable<Platform> {
    return this.db.selectOne<DbPlatform>('platforms', id).pipe(
      map(platform => {
        if (!platform) {
          throw new Error('Platform not found');
        }
        return {
          id: platform.id,
          name: platform.name,
          manufacturer: platform.manufacturer,
          generation: platform.generation,
          releaseYear: platform.release_year,
          iconUrl: platform.icon_url,
          color: platform.color,
          createdAt: platform.created_at
        };
      }),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch platform')
      ))
    );
  }
}

// Need to import map
import { map } from 'rxjs/operators';
