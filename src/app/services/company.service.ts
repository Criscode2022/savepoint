import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Company } from '../models/game.model';
import { NeonRepository } from '../shared/repositories/neon.repository';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private repository = inject(NeonRepository);

  getCompanies(): Observable<Company[]> {
    return from(
      this.repository.select<Company>('companies', { 
        select: 'id::text, name, country, founded_year as "foundedYear", website, created_at as "createdAt"',
        order: 'name.asc'
      }).then(companies => companies.map(c => ({
        ...c,
        foundedYear: (c as any).founded_year,
        createdAt: (c as any).created_at
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch companies')
      ))
    );
  }

  getCompanyById(id: string): Observable<Company> {
    return from(
      this.repository.selectById<Company>('companies', id, {
        select: 'id::text, name, country, founded_year as "foundedYear", website, created_at as "createdAt"'
      }).then(company => {
        if (!company) {
          throw new Error('Company not found');
        }
        return {
          ...company,
          foundedYear: (company as any).founded_year,
          createdAt: (company as any).created_at
        };
      })
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch company')
      ))
    );
  }

  searchCompanies(query: string): Observable<Company[]> {
    return from(
      this.repository.query<Company>(`
        SELECT id::text, name, country, founded_year as "foundedYear", website, created_at as "createdAt"
        FROM companies 
        WHERE name ILIKE '%${query.replace(/'/g, "''")}%'
        ORDER BY name
      `).then(companies => companies.map(c => ({
        ...c,
        foundedYear: (c as any).founded_year,
        createdAt: (c as any).created_at
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to search companies')
      ))
    );
  }
}
