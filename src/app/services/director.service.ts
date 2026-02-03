import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { neon } from '@neondatabase/serverless';
import { Director } from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DirectorService {
  private readonly DATABASE_URL = environment.neonDatabaseUrl;

  private get sql() {
    return neon(this.DATABASE_URL);
  }

  getDirectors(): Observable<Director[]> {
    return from(
      this.sql(`
        SELECT 
          id::text, 
          name, 
          birth_year as "birthYear", 
          nationality, 
          bio,
          created_at as "createdAt"
        FROM directors 
        ORDER BY name
      `).then((directors: any[]) => directors.map(d => ({
        id: d.id,
        name: d.name,
        birthYear: d.birthYear,
        nationality: d.nationality,
        bio: d.bio,
        createdAt: d.createdAt
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch directors')
      ))
    );
  }

  getDirectorById(id: string): Observable<Director> {
    return from(
      this.sql(`
        SELECT 
          id::text, 
          name, 
          birth_year as "birthYear", 
          nationality, 
          bio,
          created_at as "createdAt"
        FROM directors 
        WHERE id = '${id}'
      `).then((directors: any[]) => {
        if (directors.length === 0) {
          throw new Error('Director not found');
        }
        const d = directors[0];
        return {
          id: d.id,
          name: d.name,
          birthYear: d.birthYear,
          nationality: d.nationality,
          bio: d.bio,
          createdAt: d.createdAt
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
      this.sql(`
        SELECT 
          id::text, 
          name, 
          birth_year as "birthYear", 
          nationality, 
          bio,
          created_at as "createdAt"
        FROM directors 
        WHERE name ILIKE '%${query.replace(/'/g, "''")}%'
        ORDER BY name
      `).then((directors: any[]) => directors.map(d => ({
        id: d.id,
        name: d.name,
        birthYear: d.birthYear,
        nationality: d.nationality,
        bio: d.bio,
        createdAt: d.createdAt
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to search directors')
      ))
    );
  }
}
