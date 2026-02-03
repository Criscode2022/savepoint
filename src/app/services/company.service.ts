import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { neon } from '@neondatabase/serverless';
import { Company } from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly DATABASE_URL = environment.neonDatabaseUrl;

  private get sql() {
    return neon(this.DATABASE_URL);
  }

  getCompanies(): Observable<Company[]> {
    return from(
      this.sql(`
        SELECT 
          id::text, 
          name, 
          country, 
          founded_year as "foundedYear", 
          website,
          created_at as "createdAt"
        FROM companies 
        ORDER BY name
      `).then((companies: any[]) => companies.map(c => ({
        id: c.id,
        name: c.name,
        country: c.country,
        foundedYear: c.foundedYear,
        website: c.website,
        createdAt: c.createdAt
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to fetch companies')
      ))
    );
  }

  getCompanyById(id: string): Observable<Company> {
    return from(
      this.sql(`
        SELECT 
          id::text, 
          name, 
          country, 
          founded_year as "foundedYear", 
          website,
          created_at as "createdAt"
        FROM companies 
        WHERE id = '${id}'
      `).then((companies: any[]) => {
        if (companies.length === 0) {
          throw new Error('Company not found');
        }
        const c = companies[0];
        return {
          id: c.id,
          name: c.name,
          country: c.country,
          foundedYear: c.foundedYear,
          website: c.website,
          createdAt: c.createdAt
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
      this.sql(`
        SELECT 
          id::text, 
          name, 
          country, 
          founded_year as "foundedYear", 
          website,
          created_at as "createdAt"
        FROM companies 
        WHERE name ILIKE '%${query.replace(/'/g, "''")}%'
        ORDER BY name
      `).then((companies: any[]) => companies.map(c => ({
        id: c.id,
        name: c.name,
        country: c.country,
        foundedYear: c.foundedYear,
        website: c.website,
        createdAt: c.createdAt
      })))
    ).pipe(
      catchError(error => throwError(() => 
        new Error(error?.message || 'Failed to search companies')
      ))
    );
  }
}
