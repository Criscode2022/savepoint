import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Company } from '../models/game.model';
import { DatabaseService } from './database.service';

interface DbCompany {
  id: string;
  name: string;
  country?: string;
  founded_year?: number;
  website?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly db = inject(DatabaseService);

  public getCompanies(): Observable<Company[]> {
    return this.db.select<DbCompany>('companies', { order: 'name.asc' }).pipe(
      map(companies => companies.map(c => ({
        id: c.id,
        name: c.name,
        country: c.country,
        foundedYear: c.founded_year,
        website: c.website,
        createdAt: c.created_at
      }))),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch companies')
      ))
    );
  }

  public getCompanyById(id: string): Observable<Company> {
    return this.db.selectOne<DbCompany>('companies', id).pipe(
      map(company => {
        if (!company) {
          throw new Error('Company not found');
        }
        return {
          id: company.id,
          name: company.name,
          country: company.country,
          foundedYear: company.founded_year,
          website: company.website,
          createdAt: company.created_at
        };
      }),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch company')
      ))
    );
  }

  public searchCompanies(query: string): Observable<Company[]> {
    // PostgREST doesn't support ILIKE directly in eq filters
    // Would need a custom endpoint or use ilike operator
    return this.db.select<DbCompany>('companies', { 
      order: 'name.asc'
    }).pipe(
      map(companies => 
        companies
          .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
          .map(c => ({
            id: c.id,
            name: c.name,
            country: c.country,
            foundedYear: c.founded_year,
            website: c.website,
            createdAt: c.created_at
          }))
      ),
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to search companies')
      ))
    );
  }

  public findOrCreateByName(name: string): Observable<string> {
    const trimmed = name.trim();
    if (!trimmed) {
      return throwError(() => new Error('Developer name is required'));
    }

    return this.db.select<DbCompany>('companies', { order: 'name.asc' }).pipe(
      switchMap((companies) => {
        const existing = companies.find(
          (company) =>
            company.name.localeCompare(trimmed, undefined, {
              sensitivity: 'accent',
            }) === 0,
        );

        if (existing?.id) {
          return from([existing.id]);
        }

        return this.db
          .insert<DbCompany>('companies', { name: trimmed })
          .pipe(map((company) => company.id));
      }),
      catchError((error) =>
        throwError(
          () => new Error(error?.message || 'Failed to save developer'),
        ),
      ),
    );
  }
}
