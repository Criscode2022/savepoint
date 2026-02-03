import { Injectable, inject, signal, effect } from '@angular/core';
import { PlatformService } from './platform.service';
import { CompanyService } from './company.service';
import { DirectorService } from './director.service';
import { GameFilter, FilterOptions, Platform, Company, Director } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private platformService = inject(PlatformService);
  private companyService = inject(CompanyService);
  private directorService = inject(DirectorService);

  // Signals for filter state
  readonly filters = signal<GameFilter>({});
  readonly filterOptions = signal<FilterOptions>({
    platforms: [],
    developers: [],
    directors: [],
    genres: [],
    years: []
  });
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Computed years range (from 1980 to current year)
  readonly availableYears = signal<number[]>(
    Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => 1980 + i).reverse()
  );

  readonly commonGenres = signal<string[]>([
    'Action',
    'Adventure',
    'RPG',
    'Strategy',
    'Shooter',
    'Platformer',
    'Puzzle',
    'Racing',
    'Sports',
    'Fighting',
    'Simulation',
    'Horror',
    'Indie',
    'MMORPG',
    'Open World'
  ]);

  constructor() {
    this.loadFilterOptions();
  }

  async loadFilterOptions(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [platforms, developers, directors] = await Promise.all([
        this.loadPlatforms(),
        this.loadCompanies(),
        this.loadDirectors()
      ]);

      this.filterOptions.set({
        platforms,
        developers,
        directors,
        genres: this.commonGenres(),
        years: this.availableYears()
      });
    } catch (err) {
      this.error.set('Failed to load filter options');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadPlatforms(): Promise<Platform[]> {
    return new Promise((resolve, reject) => {
      this.platformService.getPlatforms().subscribe({
        next: platforms => resolve(platforms),
        error: err => reject(err)
      });
    });
  }

  private async loadCompanies(): Promise<Company[]> {
    return new Promise((resolve, reject) => {
      this.companyService.getCompanies().subscribe({
        next: companies => resolve(companies),
        error: err => reject(err)
      });
    });
  }

  private async loadDirectors(): Promise<Director[]> {
    return new Promise((resolve, reject) => {
      this.directorService.getDirectors().subscribe({
        next: directors => resolve(directors),
        error: err => reject(err)
      });
    });
  }

  setFilter(key: keyof GameFilter, value: any): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  removeFilter(key: keyof GameFilter): void {
    this.filters.update(current => {
      const { [key]: _, ...rest } = current;
      return rest;
    });
  }

  clearFilters(): void {
    this.filters.set({});
  }

  hasActiveFilters(): boolean {
    const current = this.filters();
    return Object.keys(current).length > 0;
  }

  getActiveFilterCount(): number {
    const current = this.filters();
    return Object.keys(current).filter(key => {
      const value = current[key as keyof GameFilter];
      return value !== undefined && value !== '' && value !== null;
    }).length;
  }
}