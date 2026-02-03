import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
  private db = inject(DatabaseService);

  getCompanies(): Observable<Company[]> {
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

  getCompanyById(id: string): Observable<Company> {
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

  searchCompanies(query: string): Observable<Company[]> {
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
}
