import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Director } from '../models/game.model';
import { NeonRepository } from '../shared/repositories/neon.repository';

@Injectable({
  providedIn: 'root'
})
export class DirectorService {
  private repository = inject(NeonRepository);

  getDirectors(): Observable<Director[]> {
    return from(
      this.repository.select<Director>('directors', { 
        select: 'id::text, name, birth_year as "birthYear", nationality, bio, created_at as "createdAt"',
        order: 'name.asc'
      }).then(directors => directors.map(d => ({
        ...d,
        birthYear: (d as any).birth_year,
        createdAt: (d as any).created_at
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch directors')
      ))
    );
  }

  getDirectorById(id: string): Observable<Director> {
    return from(
      this.repository.selectById<Director>('directors', id, {
        select: 'id::text, name, birth_year as "birthYear", nationality, bio, created_at as "createdAt"'
      }).then(director => {
        if (!director) {
          throw new Error('Director not found');
        }
        return {
          ...director,
          birthYear: (director as any).birth_year,
          createdAt: (director as any).created_at
        };
      })
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch director')
      ))
    );
  }

  searchDirectors(query: string): Observable<Director[]> {
    return from(
      this.repository.query<Director>(`
        SELECT id::text, name, birth_year as "birthYear", nationality, bio, created_at as "createdAt"
        FROM directors 
        WHERE name ILIKE '%${query.replace(/'/g, "''")}%'
        ORDER BY name
      `).then(directors => directors.map(d => ({
        ...d,
        birthYear: (d as any).birth_year,
        createdAt: (d as any).created_at
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to search directors')
      ))
    );
  }
}
