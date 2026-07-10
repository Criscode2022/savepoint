import { Component, OnInit, OnDestroy, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, forkJoin, take } from 'rxjs';
import { 
  IonContent, IonHeader, IonToolbar, IonButton,
  IonIcon, IonGrid, IonRow, IonCol, IonInput, IonChip,
  IonBadge, IonList, IonItem, IonThumbnail, IonLabel,
  IonSelect, IonSelectOption, IonToast, IonSpinner, AlertController, ViewWillEnter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gameControllerOutline, addOutline, searchOutline, filterOutline,
  logOutOutline, gridOutline, listOutline,
  starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
  closeOutline, imageOutline, chevronForwardOutline, heartOutline, ellipseOutline,
  personCircleOutline
} from 'ionicons/icons';
import { Game, GameFilters, PLATFORMS, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { formatReleaseCountdown, canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { GameCardComponent } from '../../components/game-card/game-card.component';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';

type LibraryStatusFilter = 'all' | 'not_started' | 'playing' | 'completed' | 'with_playtime';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, GameCardComponent, GameCoverComponent,
    IonContent, IonHeader, IonToolbar, IonButton,
    IonIcon, IonGrid, IonRow, IonCol, IonInput, IonChip,
    IonBadge, IonList, IonItem, IonThumbnail, IonLabel,
    IonSelect, IonSelectOption, IonToast, IonSpinner
  ],
  template: `
    <ion-header class="ion-no-border home-header">
      <ion-toolbar class="header-toolbar">
        <div class="header-inner">
          <div class="header-brand">
            <div class="brand-mark" aria-hidden="true">
              <ion-icon name="game-controller-outline"></ion-icon>
            </div>
            <div class="brand-copy">
              <span class="brand-name gaming-font">Game<span class="text-gradient">Vault</span></span>
              <span class="brand-tagline">Your collection</span>
            </div>
          </div>

          <div class="header-actions">
            <ion-button
              (click)="toggleViewMode()"
              [class.active]="isListView"
              class="header-icon-btn view-toggle-btn"
              fill="clear"
              [title]="isListView ? 'Grid view' : 'List view'"
              [attr.aria-label]="isListView ? 'Switch to grid view' : 'Switch to list view'"
            >
              <ion-icon [name]="isListView ? 'grid-outline' : 'list-outline'" slot="icon-only"></ion-icon>
            </ion-button>

            <ion-button
              (click)="logout()"
              class="header-icon-btn logout-btn"
              fill="clear"
              title="Log out"
              aria-label="Log out"
            >
              <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="home-content">
      <div class="content-wrapper">
        <!-- Search and Stats Bar -->
        <div class="search-section">
          <div class="search-bar-container">
            <div class="search-field">
              <ion-icon name="search-outline" class="search-field__icon" aria-hidden="true"></ion-icon>
              <ion-input
                [(ngModel)]="searchQuery"
                (ionInput)="onSearch($event)"
                placeholder="Search games..."
                class="search-field__input"
                clearInput="true"
                enterkeyhint="search"
              ></ion-input>
            </div>

            <div class="filter-toggle-wrap">
              <button
                type="button"
                (click)="showFilters = !showFilters"
                [class.active]="showFilters || hasActiveFilters()"
                class="filter-toggle-btn"
                title="Toggle filters"
                [attr.aria-expanded]="showFilters"
                aria-label="Toggle filters"
              >
                <ion-icon name="filter-outline" aria-hidden="true" class="filter-toggle-icon"></ion-icon>
                <span class="filter-toggle-label">Filters</span>
              </button>
              <span
                *ngIf="activeFilterCount > 0"
                class="filter-badge"
                aria-hidden="true"
              >{{ activeFilterCount }}</span>
            </div>
          </div>

          <a routerLink="/play-history" class="play-history-btn">
            <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
            <span class="play-history-btn__label">Play History</span>
            <span class="play-history-btn__count">{{ completedCount }}</span>
            <ion-icon name="chevron-forward-outline" class="play-history-btn__chevron" aria-hidden="true"></ion-icon>
          </a>

          <button type="button" class="wishlist-nav-btn" (click)="scrollToWishlist()">
            <ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
            <span class="wishlist-nav-btn__label">Wishlist</span>
            <span class="wishlist-nav-btn__count">{{ wishlistGames.length }}</span>
            <ion-icon name="chevron-forward-outline" class="wishlist-nav-btn__chevron" aria-hidden="true"></ion-icon>
          </button>

          <a routerLink="/profile" class="profile-nav-btn">
            <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
            <span class="profile-nav-btn__label">Profile</span>
            <span class="profile-nav-btn__count">{{ totalCollectionCount }}</span>
            <ion-icon name="chevron-forward-outline" class="profile-nav-btn__chevron" aria-hidden="true"></ion-icon>
          </a>

          <!-- Library filters -->
          <div class="stats-bar" role="group" aria-label="Library filters">
            <button
              type="button"
              class="stat-item"
              [class.stat-item--clickable]="libraryGamesCount > 0"
              [class.stat-item--active]="isLibraryFilterActive('all')"
              [disabled]="libraryGamesCount === 0"
              (click)="setLibraryFilter('all')"
              [attr.aria-pressed]="isLibraryFilterActive('all')"
              [attr.aria-label]="libraryGamesCount > 0 ? 'Show all library games' : null"
            >
              <ion-icon [name]="isListView ? 'list-outline' : 'grid-outline'"></ion-icon>
              <span>{{ libraryGamesCount }} games</span>
            </button>
            <button
              type="button"
              class="stat-item"
              [class.stat-item--clickable]="notStartedCount > 0"
              [class.stat-item--active]="isLibraryFilterActive('not_started')"
              [disabled]="notStartedCount === 0"
              (click)="setLibraryFilter('not_started')"
              [attr.aria-pressed]="isLibraryFilterActive('not_started')"
              [attr.aria-label]="notStartedCount > 0 ? 'Filter by not started games' : null"
            >
              <ion-icon name="ellipse-outline"></ion-icon>
              <span>{{ notStartedCount }} not started</span>
            </button>
            <button
              type="button"
              class="stat-item"
              [class.stat-item--clickable]="playingCount > 0"
              [class.stat-item--active]="isLibraryFilterActive('playing')"
              [disabled]="playingCount === 0"
              (click)="setLibraryFilter('playing')"
              [attr.aria-pressed]="isLibraryFilterActive('playing')"
              [attr.aria-label]="playingCount > 0 ? 'Filter by currently playing' : null"
            >
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ playingCount }} playing</span>
            </button>
            <button
              type="button"
              class="stat-item"
              [class.stat-item--clickable]="completedCount > 0"
              [class.stat-item--active]="isLibraryFilterActive('completed')"
              [disabled]="completedCount === 0"
              (click)="setLibraryFilter('completed')"
              [attr.aria-pressed]="isLibraryFilterActive('completed')"
              [attr.aria-label]="completedCount > 0 ? 'Filter by completed games' : null"
            >
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <span>{{ completedCount }} completed</span>
            </button>
            <button
              type="button"
              class="stat-item"
              [class.stat-item--clickable]="playtimeGamesCount > 0"
              [class.stat-item--active]="isLibraryFilterActive('with_playtime')"
              [disabled]="playtimeGamesCount === 0"
              (click)="setLibraryFilter('with_playtime')"
              [attr.aria-pressed]="isLibraryFilterActive('with_playtime')"
              [attr.aria-label]="playtimeGamesCount > 0 ? 'Filter by games with playtime' : null"
            >
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ totalPlaytime }}h played</span>
            </button>
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
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>

          <!-- Active Filters -->
          <div class="active-filters" *ngIf="hasActiveFilters()">
            <button
              type="button"
              *ngFor="let filter of getActiveFilterChips()"
              class="active-filter-chip"
              (click)="removeFilter(filter.type, filter.value)"
            >
              <span class="active-filter-chip__label">{{ filter.label }}</span>
              <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
            </button>
          </div>
        </div>

        <div class="games-loading" *ngIf="gamesLoading()">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <!-- Library -->
        <section
          id="library-section"
          class="library-section"
          *ngIf="!gamesLoading() && (showStatusSections || displayGames.length > 0)"
        >
          <div class="section-header" *ngIf="showStatusSections">
            <h2 class="section-title">Your Library</h2>
            <span class="section-count">{{ librarySectionCountLabel }}</span>
          </div>

          <p class="section-empty" *ngIf="showStatusSections && libraryGamesCount === 0">
            No games in your library yet.
          </p>

          <p class="section-empty" *ngIf="showStatusSections && libraryGamesCount > 0 && displayGames.length === 0">
            {{ getLibraryEmptyMessage() }}
          </p>

        <!-- Games Grid View -->
        <div class="games-grid" *ngIf="!isListView && displayGames.length > 0">
          <app-game-card
            *ngFor="let game of displayGames; trackBy: trackByGameId"
            [game]="game"
            (onToggleCompleted)="cycleStatus($event)"
            (onDelete)="deleteGame($event)"
            class="game-card-wrapper"
          ></app-game-card>
        </div>

        <!-- Games List View -->
        <ion-list class="games-list" *ngIf="isListView && displayGames.length > 0">
          <ng-container *ngTemplateOutlet="listItems; context: { $implicit: displayGames }"></ng-container>
        </ion-list>
        </section>

        <!-- Wishlist -->
        <section
          id="wishlist-section"
          class="library-section wishlist-section"
          *ngIf="!gamesLoading() && (showStatusSections || wishlistGames.length > 0)"
        >
          <div class="section-header">
            <h2 class="section-title">Wishlist</h2>
            <div class="section-header__actions">
              <span class="section-count">{{ wishlistGames.length }}</span>
              <a routerLink="/wishlist/add" class="section-add-btn">
                <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
                <span>Add</span>
              </a>
            </div>
          </div>

          <p class="section-empty" *ngIf="showStatusSections && wishlistGames.length === 0">
            No wishlist games yet. Add upcoming titles you want to play.
          </p>

          <div class="games-grid" *ngIf="!isListView && wishlistGames.length">
            <app-game-card
              *ngFor="let game of wishlistGames; trackBy: trackByGameId"
              [game]="game"
              [countdownTick]="countdownTick"
              (onToggleCompleted)="cycleStatus($event)"
              (onDelete)="deleteGame($event)"
              class="game-card-wrapper"
            ></app-game-card>
          </div>
          <ion-list class="games-list" *ngIf="isListView && wishlistGames.length">
            <ng-container *ngTemplateOutlet="listItems; context: { $implicit: wishlistGames, showCountdown: true }"></ng-container>
          </ion-list>
        </section>

        <ng-template #listItems let-games let-showCountdown="showCountdown">
          <ion-item
            *ngFor="let game of games; trackBy: trackByGameId"
            class="game-list-item"
            button
            detail="false"
            [routerLink]="['/game', game.id]"
          >
            <ion-thumbnail slot="start" class="game-thumbnail">
              <app-game-cover
                [title]="game.title"
                [coverImage]="game.coverImage"
                variant="thumbnail"
              />
            </ion-thumbnail>

            <ion-label class="game-info">
              <h3 class="game-title">{{ game.title }}</h3>

              <div class="game-meta-row">
                <span *ngIf="game.platform.name" class="platform-tag">{{ game.platform.name }}</span>
                <span *ngIf="game.releaseYear" class="game-year">{{ game.releaseYear }}</span>
                <span *ngIf="game.rating" class="rating-tag">
                  <ion-icon name="star-outline" class="star-icon" aria-hidden="true"></ion-icon>
                  {{ game.rating }}
                </span>
              </div>

              <p class="game-description" *ngIf="game.description">{{ game.description }}</p>

              <p
                class="game-secondary"
                *ngIf="game.developer.name || game.playtimeHours || (showCountdown && game.status === 'wishlist')"
              >
                <span *ngIf="game.developer.name">{{ game.developer.name }}</span>
                <span *ngIf="game.playtimeHours">{{ game.playtimeHours }}h played</span>
                <span *ngIf="showCountdown && game.status === 'wishlist'" class="wishlist-countdown">
                  {{ getCountdownLabel(game) }}
                </span>
              </p>
            </ion-label>

            <div class="game-status" slot="end">
              <ion-badge
                [color]="getStatusColor(game.status)"
                class="status-badge"
                [class.status-badge--disabled]="isWishlistLocked(game)"
                (click)="handleStatusClick($event, game)"
              >
                <ion-icon [name]="getStatusIcon(game.status)"></ion-icon>
                {{ getStatusLabel(game.status) }}
              </ion-badge>
            </div>
          </ion-item>
        </ng-template>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!gamesLoading() && filteredGames().length === 0">
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

    <!-- Custom Add Button - Fixed Position for iOS compatibility -->
    <button type="button" class="custom-add-button" routerLink="/add" aria-label="Add Game">
      <ion-icon name="add-outline"></ion-icon>
    </button>
  `,
})
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
  games: Game[] = [];
  readonly filteredGames: Signal<Game[]>;
  readonly gamesLoading: Signal<boolean>;

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

  libraryStatusFilter: LibraryStatusFilter = 'all';

  // Toast
  toastMessage = '';
  toastColor = 'success';
  countdownTick = 0;

  private destroy$ = new Subject<void>();
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {
    this.filteredGames = this.gameService.filteredGames;
    this.gamesLoading = this.gameService.gamesLoading;
    addIcons({
      gameControllerOutline, addOutline, searchOutline, filterOutline,
      logOutOutline, gridOutline, listOutline,
      starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
      closeOutline, imageOutline, chevronForwardOutline, heartOutline, ellipseOutline,
      personCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadGames();
    this.setupSearch();
    this.applyFilters();
    this.countdownInterval = setInterval(() => {
      this.countdownTick++;
    }, 60000);
  }

  ionViewWillEnter(): void {
    this.refreshFilterOptions();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGames(): void {
    this.gameService.games$.pipe(takeUntil(this.destroy$))
      .subscribe(games => {
        this.games = games;
        this.syncLibraryFilter();
      });
  }

  private refreshFilterOptions(): void {
    forkJoin({
      platforms: this.gameService.getPlatforms().pipe(take(1)),
      years: this.gameService.getYears().pipe(take(1)),
      developers: this.gameService.getDevelopers().pipe(take(1)),
      genres: this.gameService.getGenres().pipe(take(1)),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ platforms, years, developers, genres }) => {
      this.platforms = platforms;
      this.years = years;
      this.developers = developers;
      this.genres = genres;
      this.pruneInvalidFilterSelections();
    });
  }

  private pruneInvalidFilterSelections(): void {
    const nextPlatforms = this.selectedPlatforms.filter((p) => this.platforms.includes(p));
    const nextYears = this.selectedYears.filter((y) => this.years.includes(y));
    const nextDevelopers = this.selectedDevelopers.filter((d) => this.developers.includes(d));
    const nextGenres = this.selectedGenres.filter((g) => this.genres.includes(g));

    const changed =
      nextPlatforms.length !== this.selectedPlatforms.length ||
      nextYears.length !== this.selectedYears.length ||
      nextDevelopers.length !== this.selectedDevelopers.length ||
      nextGenres.length !== this.selectedGenres.length;

    this.selectedPlatforms = nextPlatforms;
    this.selectedYears = nextYears;
    this.selectedDevelopers = nextDevelopers;
    this.selectedGenres = nextGenres;

    if (changed) {
      this.applyFilters();
    }
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
    return p?.color || '#a855f7';
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
    this.cycleStatus(gameId);
  }

  handleStatusClick(event: Event, game: Game): void {
    event.stopPropagation();
    event.preventDefault();
    this.cycleStatus(game.id);
  }

  cycleStatus(gameId: string): void {
    const game =
      this.games.find((g) => g.id === gameId) ??
      this.filteredGames().find((g) => g.id === gameId);

    if (game && this.isWishlistLocked(game)) {
      return;
    }

    this.gameService.cycleStatus(gameId).subscribe({
      next: () => {
        this.syncLibraryFilter();
        this.showToast('Game status updated', 'success');
      },
      error: () => {
        this.showToast('Failed to update game', 'danger');
      }
    });
  }

  isWishlistLocked(game: Game): boolean {
    void this.countdownTick;
    return game.status === 'wishlist' && !canAddWishlistToLibrary(game);
  }

  getStatusLabel(status: GamePlayStatus): string {
    if (status === 'wishlist') {
      return 'Add to Library';
    }
    return GAME_STATUS_LABELS[status];
  }

  getStatusIcon(status: GamePlayStatus): string {
    const icons: Record<GamePlayStatus, string> = {
      not_started: 'ellipse-outline',
      playing: 'time-outline',
      completed: 'checkmark-circle-outline',
      wishlist: 'heart-outline',
    };
    return icons[status];
  }

  getStatusColor(status: GamePlayStatus): string {
    const colors: Record<GamePlayStatus, string> = {
      not_started: 'medium',
      playing: 'primary',
      completed: 'success',
      wishlist: 'tertiary',
    };
    return colors[status];
  }

  getCountdownLabel(game: Game): string {
    void this.countdownTick;
    return formatReleaseCountdown(game).label;
  }

  get showStatusSections(): boolean {
    return !this.hasActiveFilters();
  }

  get libraryGames(): Game[] {
    return this.filteredGames().filter((game) => game.status !== 'wishlist');
  }

  get wishlistGames(): Game[] {
    return this.filteredGames().filter((game) => game.status === 'wishlist');
  }

  get libraryGamesCount(): number {
    return this.libraryGames.length;
  }

  get totalCollectionCount(): number {
    return this.libraryGamesCount + this.wishlistGames.length;
  }

  get displayGames(): Game[] {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return this.libraryGames.filter((game) => game.status === 'not_started');
      case 'playing':
        return this.libraryGames.filter((game) => game.status === 'playing');
      case 'completed':
        return this.libraryGames.filter((game) => game.status === 'completed');
      case 'with_playtime':
        return this.libraryGames.filter((game) => (game.playtime || 0) > 0);
      default:
        return this.libraryGames;
    }
  }

  setLibraryFilter(filter: LibraryStatusFilter): void {
    if (!this.canSelectLibraryFilter(filter)) {
      return;
    }

    this.libraryStatusFilter = this.libraryStatusFilter === filter ? 'all' : filter;
  }

  isLibraryFilterActive(filter: LibraryStatusFilter): boolean {
    return this.libraryStatusFilter === filter;
  }

  canSelectLibraryFilter(filter: LibraryStatusFilter): boolean {
    switch (filter) {
      case 'all':
        return this.libraryGamesCount > 0;
      case 'not_started':
        return this.notStartedCount > 0;
      case 'playing':
        return this.playingCount > 0;
      case 'completed':
        return this.completedCount > 0;
      case 'with_playtime':
        return this.playtimeGamesCount > 0;
    }
  }

  private syncLibraryFilter(): void {
    if (this.libraryStatusFilter === 'all') {
      return;
    }

    if (!this.canSelectLibraryFilter(this.libraryStatusFilter)) {
      this.libraryStatusFilter = 'all';
    }
  }

  get librarySectionCountLabel(): string {
    const label = this.activeLibraryFilterLabel;
    return label ? `${this.displayGames.length} ${label}` : `${this.displayGames.length}`;
  }

  get activeLibraryFilterLabel(): string | null {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return 'not started';
      case 'playing':
        return 'playing';
      case 'completed':
        return 'completed';
      case 'with_playtime':
        return 'played';
      default:
        return null;
    }
  }

  getLibraryEmptyMessage(): string {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return 'No not started games in your library.';
      case 'playing':
        return 'No games currently playing.';
      case 'completed':
        return 'No completed games in your library.';
      case 'with_playtime':
        return 'No games with recorded playtime.';
      default:
        return 'No games in your library yet.';
    }
  }

  scrollToWishlist(): void {
    if (!this.showStatusSections && this.wishlistGames.length === 0) {
      return;
    }

    document.getElementById('wishlist-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  async deleteGame(gameId: string): Promise<void> {
    const game = this.games.find(g => g.id === gameId);
    const title = game?.title ?? 'this game';

    const alert = await this.alertController.create({
      header: 'Delete game?',
      message: `"${title}" will be permanently removed from your library.`,
      cssClass: 'app-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'app-alert-btn-cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'app-alert-btn-delete',
          handler: () => this.performDelete(gameId),
        },
      ],
    });

    await alert.present();
  }

  private performDelete(gameId: string): void {
    this.gameService.deleteGame(gameId).subscribe({
      next: () => {
        this.syncLibraryFilter();
        this.refreshFilterOptions();
        this.showToast('Game deleted', 'success');
      },
      error: () => {
        this.showToast('Failed to delete game', 'danger');
      },
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
    return this.libraryGames.filter((g) => g.status === 'completed').length;
  }

  get playingCount(): number {
    return this.libraryGames.filter((g) => g.status === 'playing').length;
  }

  get notStartedCount(): number {
    return this.libraryGames.filter((g) => g.status === 'not_started').length;
  }

  get totalPlaytime(): number {
    return this.libraryGames.reduce((sum, g) => sum + (g.playtime || 0), 0);
  }

  get playtimeGamesCount(): number {
    return this.libraryGames.filter((g) => (g.playtime || 0) > 0).length;
  }
}
