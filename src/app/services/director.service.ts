import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Director } from '../models/game.model';
import { DatabaseService } from './database.service';

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
export class DirectorService {
  private db = inject(DatabaseService);

  getDirectors(): Observable<Director[]> {
    return this.db.select<DbDirector>('directors', { order: 'name.asc' }).pipe(
      map(directors => directors.map(d => ({
        id: d.id,
        name: d.name,
        birthYear: d.birth_year,
        nationality: d.nationality,
        bio: d.bio,
        createdAt: d.created_at
      }))),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch directors')
      ))
    );
  }

  getDirectorById(id: string): Observable<Director> {
    return this.db.selectOne<DbDirector>('directors', id).pipe(
      map(director => {
        if (!director) {
          throw new Error('Director not found');
        }
        return {
          id: director.id,
          name: director.name,
          birthYear: director.birth_year,
          nationality: director.nationality,
          bio: director.bio,
          createdAt: director.created_at
        };
      }),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch director')
      ))
    );
  }

  searchDirectors(query: string): Observable<Director[]> {
    return this.db.select<DbDirector>('directors', { 
      order: 'name.asc'
    }).pipe(
      map(directors => 
        directors
          .filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
          .map(d => ({
            id: d.id,
            name: d.name,
            birthYear: d.birth_year,
            nationality: d.nationality,
            bio: d.bio,
            createdAt: d.created_at
          }))
      ),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to search directors')
      ))
    );
  }

  findOrCreateByName(name: string): Observable<string | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      return from([null]);
    }

    return this.db.select<DbDirector>('directors', { order: 'name.asc' }).pipe(
      switchMap((directors) => {
        const existing = directors.find(
          (director) =>
            director.name.localeCompare(trimmed, undefined, {
              sensitivity: 'accent',
            }) === 0,
        );

        if (existing?.id) {
          return from([existing.id]);
        }

        return this.db
          .insert<DbDirector>('directors', { name: trimmed })
          .pipe(map((director) => director.id));
      }),
      catchError((error) =>
        throwError(
          () => new Error(error?.message || 'Failed to save director'),
        ),
      ),
    );
  }
}
