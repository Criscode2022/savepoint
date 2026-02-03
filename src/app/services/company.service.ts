import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Company } from '../models/game.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/companies`;

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiUrl)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to fetch companies')
        ))
      );
  }

  getCompanyById(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to fetch company')
        ))
      );
  }

  searchCompanies(query: string): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`)
      .pipe(
        catchError(error => throwError(() => 
          new Error(error.error?.message || 'Failed to search companies')
        ))
      );
  }
}