import { Component, OnInit, OnDestroy, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonGrid, IonRow, IonCol, IonSearchbar, IonChip, IonLabel,
  IonBadge, IonFab, IonFabButton, IonList, IonItem, IonThumbnail,
  IonSelect, IonSelectOption, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gameControllerOutline, addOutline, searchOutline, filterOutline,
  logOutOutline, gridOutline, listOutline,
  starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
  arrowUpOutline, arrowDownOutline, closeOutline, imageOutline
} from 'ionicons/icons';
import { Game, GameFilters, PLATFORMS } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { GameCardComponent } from '../../components/game-card/game-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, GameCardComponent,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonGrid, IonRow, IonCol, IonSearchbar, IonChip, IonLabel,
    IonBadge, IonFab, IonFabButton, IonList, IonItem, IonThumbnail,
    IonSelect, IonSelectOption, IonToast
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <ion-title class="gaming-font ion-margin">
          <ion-icon
            name="game-controller-outline"
            class="title-icon"
          ></ion-icon>
          Game<span class="text-gradient">Vault</span>
        </ion-title>

        <ion-buttons slot="end">
          <ion-button 
            (click)="toggleViewMode()" 
            [class.active]="isListView" 
            class="view-toggle-btn" 
            [title]="isListView ? 'Grid View' : 'List View'"
          >
            <ion-icon [name]="isListView ? 'grid-outline' : 'list-outline'" slot="icon-only"></ion-icon>
          </ion-button>
          
          <ion-button (click)="logout()" class="logout-btn">
            <ion-icon name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="home-content">
      <div class="content-wrapper">
        <!-- Search and Stats Bar -->
        <div class="search-section">
          <div class="search-bar-container">
            <ion-searchbar
              [(ngModel)]="searchQuery"
              (ionInput)="onSearch($event)"
              placeholder="Search games..."
              class="gaming-searchbar"
              animated="true"
            ></ion-searchbar>

            <ion-button
              (click)="showFilters = !showFilters"
              [class.active]="hasActiveFilters()"
              class="filter-toggle-btn"
              title="Toggle Filters"
            >
              <ion-icon name="filter-outline" slot="icon-only"></ion-icon>
              <ion-badge *ngIf="activeFilterCount > 0" class="filter-badge">{{activeFilterCount}}</ion-badge>
            </ion-button>
          </div>

          <!-- Stats -->
          <div class="stats-bar">
            <div class="stat-item">
              <ion-icon [name]="isListView ? 'list-outline' : 'grid-outline'"></ion-icon>
              <span>{{filteredGames().length}} games</span>
            </div>
            <div class="stat-item">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <span>{{completedCount}} completed</span>
            </div>
            <div class="stat-item">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{totalPlaytime}}h played</span>
            </div>
          </div>
        </div>

        <!-- Filters Panel -->
        <div class="filters-panel" *ngIf="showFilters">
          <div class="filters-header">
            <h3>Filters</h3>
            <ion-button fill="clear" size="small" (click)="clearFilters()">
              Clear All
            </ion-button>
          </div>

          <ion-grid class="filters-grid">
            <ion-row>
              <!-- Platform Filter -->
              <ion-col size="12" sizeMd="6" sizeLg="3">
                <div class="filter-group">
                  <label>Platform</label>
                  <div class="filter-chips">
                    <ion-chip
                      *ngFor="let platform of platforms"
                      [class.selected]="isPlatformSelected(platform)"
                      (click)="togglePlatform(platform)"
                      [style.--platform-color]="getPlatformColor(platform)"
                    >
                      {{platform}}
                    </ion-chip>
                  </div>
                </div>
              </ion-col>

              <!-- Year Filter -->
              <ion-col size="12" sizeMd="6" sizeLg="3">
                <div class="filter-group">
                  <label>Release Year</label>
                  <div class="filter-chips">
                    <ion-chip
                      *ngFor="let year of years"
                      [class.selected]="isYearSelected(year)"
                      (click)="toggleYear(year)"
                    >
                      {{year}}
                    </ion-chip>
                  </div>
                </div>
              </ion-col>

              <!-- Developer Filter -->
              <ion-col size="12" sizeMd="6" sizeLg="3">
                <div class="filter-group">
                  <label>Developer</label>
                  <ion-select
                    [(ngModel)]="selectedDevelopers"
                    [multiple]="true"
                    placeholder="Select developers"
                    interface="popover"
                    class="gaming-select"
                    (ionChange)="applyFilters()"
                  >
                    <ion-select-option *ngFor="let dev of developers" [value]="dev"
>
                      {{dev}}
                    </ion-select-option>
                  </ion-select>
                </div>
              </ion-col>

              <!-- Sort -->
              <ion-col size="12" sizeMd="6" sizeLg="3">
                <div class="filter-group">
                  <label>Sort By</label>
                  <div class="sort-controls">
                    <ion-select
                      [(ngModel)]="sortBy"
                      (ionChange)="applyFilters()"
                      interface="popover"
                      class="gaming-select"
                    >
                      <ion-select-option value="title">Title</ion-select-option>
                      <ion-select-option value="releaseYear">Release Year</ion-select-option>
                      <ion-select-option value="rating">Rating</ion-select-option>
                      <ion-select-option value="createdAt">Date Added</ion-select-option>
                    </ion-select>

                    <ion-button
                      fill="clear"
                      (click)="toggleSortOrder()"
                      class="sort-order-btn"
                    >
                      <ion-icon [name]="sortOrder === 'desc' ? 'arrow-down-outline' : 'arrow-up-outline'"
                      ></ion-icon>
                    </ion-button>
                  </div>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>

          <!-- Active Filters -->
          <div class="active-filters" *ngIf="hasActiveFilters()">
            <ion-chip
              *ngFor="let filter of getActiveFilterChips()"
              class="active-filter-chip"
              (click)="removeFilter(filter.type, filter.value)"
            >
              {{filter.label}}
              <ion-icon name="close-outline"></ion-icon>
            </ion-chip>
          </div>
        </div>

        <!-- Games Grid View -->
        <div class="games-grid" *ngIf="!isListView && filteredGames().length > 0">
          <app-game-card
            *ngFor="let game of filteredGames(); trackBy: trackByGameId"
            [game]="game"
            [coverImage]="getGameCoverImage(game)"
            (onToggleCompleted)="toggleCompleted($event)"
            (onDelete)="deleteGame($event)"
            class="game-card-wrapper"
          ></app-game-card>
        </div>

        <!-- Games List View -->
        <ion-list class="games-list" *ngIf="isListView && filteredGames().length > 0">
          <ion-item
            *ngFor="let game of filteredGames(); trackBy: trackByGameId"
            class="game-list-item"
            button
            detail="false"
            [routerLink]="['/game', game.id]"
          >
            <ion-thumbnail slot="start" class="game-thumbnail">
              <img
                [src]="getGameCoverImage(game)"
                [alt]="game.title"
                loading="lazy"
              />
            </ion-thumbnail>

            <div class="game-info">
              <h3 class="game-title">{{game.title}}</h3>
              <p class="game-meta">
                <span *ngIf="game.platform?.name" class="platform-tag">{{game.platform.name}}</span>
                <span *ngIf="game.releaseYear">{{game.releaseYear}}</span>
                <span *ngIf="game.rating" class="rating-tag">
                  <ion-icon name="star-outline" class="star-icon"></ion-icon>
                  {{game.rating}}
                </span>
              </p>
              <p class="game-details" *ngIf="game.developer?.name || game.playtimeHours">
                <span *ngIf="game.developer?.name">{{game.developer.name}}</span>
                <span *ngIf="game.playtimeHours">{{game.playtimeHours}}h played</span>
              </p>
            </div>

            <div class="game-status" slot="end">
              <ion-badge
                [color]="game.completed ? 'success' : 'medium'"
                class="status-badge"
                (click)="$event.stopPropagation(); toggleCompleted(game.id)"
              >
                <ion-icon [name]="game.completed ? 'checkmark-circle-outline' : 'time-outline'"
                ></ion-icon>
                {{game.completed ? 'Completed' : 'Playing'}}
              </ion-badge>
            </div>
          </ion-item>
        </ion-list>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredGames().length === 0">
          <div class="empty-icon">
            <ion-icon name="game-controller-outline"></ion-icon>
          </div>
          <h3>No games found</h3>
          <p *ngIf="hasActiveFilters()">Try adjusting your filters or search query</p>
          <p *ngIf="!hasActiveFilters()">Start building your collection by adding your first game</p>

          <ion-button
            *ngIf="!hasActiveFilters()"
            routerLink="/add"
            class="add-first-game-btn"
          >
            <ion-icon name="add-outline" slot="start"></ion-icon>
            Add Game
          </ion-button>
        </div>
      </div>

      <!-- Toast -->
      <ion-toast
        [isOpen]="!!toastMessage"
        [message]="toastMessage"
        [color]="toastColor"
        duration="3000"
        position="bottom"
        (didDismiss)="toastMessage = ''"
      ></ion-toast>
    </ion-content>

    <!-- FAB - Positioned outside ion-content for iOS visibility -->
    <ion-fab vertical="bottom" horizontal="end" class="fab-container">
      <ion-fab-button routerLink="/add" class="add-fab">
        <ion-icon name="add-outline"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  `,
  styles: [`
    /* Component wrapper to handle FAB positioning */
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .header-toolbar {
      --background: rgba(15, 15, 26, 0.95);
      --border-color: rgba(139, 92, 246, 0.2);
      backdrop-filter: blur(20px);
    }

    .title-icon {
      font-size: 1.5rem;
      color: #8b5cf6;
    }

    .view-toggle-btn,
    .logout-btn {
      --color: #94a3b8;
      --color-hover: #f8fafc;
    }

    .view-toggle-btn.active {
      --color: #8b5cf6;
    }

    .home-content {
      --background: var(--color-bg-primary);
    }

    .content-wrapper {
      max-width: 1600px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Search Section */
    .search-section {
      margin-bottom: 1.5rem;
    }

    .search-bar-container {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .gaming-searchbar {
      --background: rgba(30, 30, 54, 0.8);
      --color: #f8fafc;
      --placeholder-color: #64748b;
      --icon-color: #8b5cf6;
      --clear-button-color: #64748b;
      --border-radius: 16px;
      --box-shadow: none;
      flex: 1;
      padding: 0;
    }

    .gaming-searchbar:focus-within {
      --background: rgba(30, 30, 54, 1);
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
    }

    .filter-toggle-btn {
      --background: rgba(30, 30, 54, 0.8);
      --color: #94a3b8;
      --background-hover: rgba(139, 92, 246, 0.2);
      --border-radius: 12px;
      height: 48px;
      width: 48px;
      margin: 0;
      position: relative;
    }

    .filter-toggle-btn.active {
      --background: rgba(139, 92, 246, 0.3);
      --color: #8b5cf6;
    }

    .filter-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      --background: #ef4444;
      font-size: 10px;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      gap: 2rem;
      padding: 1rem 1.5rem;
      background: rgba(30, 30, 54, 0.5);
      border-radius: 12px;
      border: 1px solid rgba(139, 92, 246, 0.1);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .stat-item ion-icon {
      color: #8b5cf6;
      font-size: 1.125rem;
    }

    /* Filters Panel */
    .filters-panel {
      background: rgba(22, 22, 42, 0.9);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .filters-header h3 {
      margin: 0;
      font-size: 1.125rem;
      color: #f8fafc;
    }

    .filter-group {
      margin-bottom: 1rem;
    }

    .filter-group label {
      display: block;
      color: #94a3b8;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    ion-chip {
      --background: rgba(30, 30, 54, 0.8);
      --color: #94a3b8;
      margin: 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    ion-chip.selected {
      --background: rgba(139, 92, 246, 0.3);
      --color: #f8fafc;
      border: 1px solid var(--platform-color, #8b5cf6);
    }

    .gaming-select {
      --background: rgba(30, 30, 54, 0.8);
      --color: #f8fafc;
      --placeholder-color: #64748b;
      border-radius: 8px;
    }

    .sort-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .sort-order-btn {
      --color: #8b5cf6;
      margin: 0;
    }

    .active-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(139, 92, 246, 0.1);
    }

    .active-filter-chip {
      --background: rgba(139, 92, 246, 0.2);
      --color: #f8fafc;
      cursor: pointer;
    }

    /* Games Grid */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .game-card-wrapper {
      animation: slideIn 0.3s ease-out;
    }

    /* Games List */
    .games-list {
      background: transparent;
      padding: 0;
    }

    .game-list-item {
      --background: rgba(30, 30, 54, 0.6);
      --border-radius: 12px;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      margin-bottom: 0.75rem;
      border: 1px solid rgba(139, 92, 246, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .game-list-item:hover {
      --background: rgba(30, 30, 54, 0.8);
      border-color: rgba(139, 92, 246, 0.3);
    }

    .game-thumbnail {
      --size: 80px;
      border-radius: 8px;
      overflow: hidden;
    }

    .game-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .game-info {
      flex: 1;
      min-width: 0;
      margin-left: 16px;
    }

    .game-title {
      margin: 0 0 8px 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .game-meta {
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .platform-tag {
      background: rgba(139, 92, 246, 0.2);
      color: #a855f7;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .rating-tag {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #fbbf24;
    }

    .star-icon {
      font-size: 14px;
    }

    .game-details {
      margin: 0;
      color: #64748b;
      font-size: 0.8rem;
      display: flex;
      gap: 12px;
    }

    .game-status {
      margin-left: 8px;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: transform 0.1s ease;
    }

    .status-badge:active {
      transform: scale(0.95);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon {
      width: 100px;
      height: 100px;
      margin: 0 auto 1.5rem;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon ion-icon {
      font-size: 48px;
      color: #8b5cf6;
    }

    .empty-state h3 {
      color: #f8fafc;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #64748b;
      margin-bottom: 1.5rem;
    }

    .add-first-game-btn {
      --background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      --border-radius: 12px;
    }

    /* FAB - Positioned as sibling to ion-content for iOS visibility */
    .fab-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: auto;
    }

    .add-fab {
      --background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      --box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5);
      width: 56px;
      height: 56px;
    }

    /* iOS-specific safe area adjustments */
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .fab-container {
        bottom: calc(20px + env(safe-area-inset-bottom));
        right: calc(20px + env(safe-area-inset-right));
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .content-wrapper {
        padding: 1rem;
      }

      .stats-bar {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .games-grid {
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1rem;
      }

      .game-thumbnail {
        --size: 60px;
      }

      .game-title {
        font-size: 1rem;
      }
    }

    @media (max-width: 480px) {
      .search-bar-container {
        flex-wrap: wrap;
      }

      .gaming-searchbar {
        width: 100%;
        order: 1;
      }

      .filter-toggle-btn,
      .view-toggle-btn {
        order: 2;
        flex: 1;
        width: auto;
        height: 44px;
      }

      .games-grid {
        grid-template-columns: 1fr;
      }

      .game-meta {
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  `],
})
export class HomePage implements OnInit, OnDestroy {
  games: Game[] = [];
  readonly filteredGames: Signal<Game[]>;

  // View mode
  isListView = false;

  // Search
  searchQuery = '';
  private searchSubject = new Subject<string>();

  // Filters
  showFilters = false;
  platforms: string[] = [];
  years: number[] = [];
  developers: string[] = [];
  genres: string[] = [];

  selectedPlatforms: string[] = [];
  selectedYears: number[] = [];
  selectedDevelopers: string[] = [];
  selectedGenres: string[] = [];

  // Sort
  sortBy: 'title' | 'releaseYear' | 'rating' | 'createdAt' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Toast
  toastMessage = '';
  toastColor = 'success';

  private destroy$ = new Subject<void>();

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private router: Router
  ) {
    this.filteredGames = this.gameService.filteredGames;
    addIcons({
      gameControllerOutline, addOutline, searchOutline, filterOutline,
      logOutOutline, gridOutline, listOutline,
      starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
      arrowUpOutline, arrowDownOutline, closeOutline, imageOutline
    });
  }

  ngOnInit(): void {
    this.loadGames();
    this.loadFilterOptions();
    this.setupSearch();
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGames(): void {
    this.gameService.games$.pipe(takeUntil(this.destroy$))
      .subscribe(games => {
        this.games = games;
      });
  }

  private loadFilterOptions(): void {
    this.gameService.getPlatforms().pipe(takeUntil(this.destroy$))
      .subscribe(platforms => this.platforms = platforms);

    this.gameService.getYears().pipe(takeUntil(this.destroy$))
      .subscribe(years => this.years = years.slice(0, 10));

    this.gameService.getDevelopers().pipe(takeUntil(this.destroy$))
      .subscribe(devs => this.developers = devs);

    this.gameService.getGenres().pipe(takeUntil(this.destroy$))
      .subscribe(genres => this.genres = genres);
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  onSearch(event: any): void {
    this.searchQuery = event.target.value || '';
    this.searchSubject.next(this.searchQuery);
  }

  applyFilters(): void {
    const filters: GameFilters = {
      search: this.searchQuery,
      platforms: this.selectedPlatforms.length > 0 ? this.selectedPlatforms : undefined,
      years: this.selectedYears.length > 0 ? this.selectedYears : undefined,
      developers: this.selectedDevelopers.length > 0 ? this.selectedDevelopers : undefined,
      genres: this.selectedGenres.length > 0 ? this.selectedGenres : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    this.gameService.getGames(filters).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => undefined,
        error: () => {
          this.showToast('Failed to load games', 'danger');
        }
      });
  }

  // View toggle
  toggleViewMode(): void {
    this.isListView = !this.isListView;
  }

  // Get game cover image with placeholder fallback
  getGameCoverImage(game: Game): string {
    if (game.coverImage) {
      return game.coverImage;
    }
    // Use placehold.co for games without images
    const title = encodeURIComponent(game.title.substring(0, 20));
    return `https://placehold.co/400x600/1e1e36/8b5cf6?text=${title}`;
  }

  // Platform filter
  isPlatformSelected(platform: string): boolean {
    return this.selectedPlatforms.includes(platform);
  }

  togglePlatform(platform: string): void {
    const index = this.selectedPlatforms.indexOf(platform);
    if (index > -1) {
      this.selectedPlatforms.splice(index, 1);
    } else {
      this.selectedPlatforms.push(platform);
    }
    this.applyFilters();
  }

  getPlatformColor(platform: string): string {
    const p = PLATFORMS.find(p => p.name === platform);
    return p?.color || '#8b5cf6';
  }

  // Year filter
  isYearSelected(year: number): boolean {
    return this.selectedYears.includes(year);
  }

  toggleYear(year: number): void {
    const index = this.selectedYears.indexOf(year);
    if (index > -1) {
      this.selectedYears.splice(index, 1);
    } else {
      this.selectedYears.push(year);
    }
    this.applyFilters();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.selectedPlatforms.length > 0 ||
           this.selectedYears.length > 0 ||
           this.selectedDevelopers.length > 0 ||
           this.selectedGenres.length > 0 ||
           !!this.searchQuery;
  }

  get activeFilterCount(): number {
    return this.selectedPlatforms.length +
           this.selectedYears.length +
           this.selectedDevelopers.length +
           this.selectedGenres.length +
           (this.searchQuery ? 1 : 0);
  }

  getActiveFilterChips(): Array<{ type: string; value: any; label: string }> {
    const chips: Array<{ type: string; value: any; label: string }> = [];

    if (this.searchQuery) {
      chips.push({ type: 'search', value: this.searchQuery, label: `Search: ${this.searchQuery}` });
    }

    this.selectedPlatforms.forEach(p => {
      chips.push({ type: 'platform', value: p, label: p });
    });

    this.selectedYears.forEach(y => {
      chips.push({ type: 'year', value: y, label: y.toString() });
    });

    this.selectedDevelopers.forEach(d => {
      chips.push({ type: 'developer', value: d, label: d });
    });

    this.selectedGenres.forEach(g => {
      chips.push({ type: 'genre', value: g, label: g });
    });

    return chips;
  }

  removeFilter(type: string, value: any): void {
    switch (type) {
      case 'search':
        this.searchQuery = '';
        break;
      case 'platform':
        this.selectedPlatforms = this.selectedPlatforms.filter(p => p !== value);
        break;
      case 'year':
        this.selectedYears = this.selectedYears.filter(y => y !== value);
        break;
      case 'developer':
        this.selectedDevelopers = this.selectedDevelopers.filter(d => d !== value);
        break;
      case 'genre':
        this.selectedGenres = this.selectedGenres.filter(g => g !== value);
        break;
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedPlatforms = [];
    this.selectedYears = [];
    this.selectedDevelopers = [];
    this.selectedGenres = [];
    this.applyFilters();
  }

  // Actions
  toggleCompleted(gameId: string): void {
    this.gameService.toggleCompleted(gameId).subscribe({
      next: () => {
        this.showToast('Game status updated', 'success');
      },
      error: () => {
        this.showToast('Failed to update game', 'danger');
      }
    });
  }

  deleteGame(gameId: string): void {
    this.gameService.deleteGame(gameId).subscribe({
      next: () => {
        this.showToast('Game deleted', 'success');
      },
      error: () => {
        this.showToast('Failed to delete game', 'danger');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }

  trackByGameId(index: number, game: Game): string {
    return game.id;
  }

  // Stats
  get completedCount(): number {
    return this.filteredGames().filter(g => g.completed).length;
  }

  get totalPlaytime(): number {
    return this.filteredGames().reduce((sum, g) => sum + (g.playtime || 0), 0);
  }
}
