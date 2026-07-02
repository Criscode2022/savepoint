import { Component, OnInit, OnDestroy, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { 
  IonContent, IonHeader, IonToolbar, IonButton,
  IonIcon, IonGrid, IonRow, IonCol, IonInput, IonChip,
  IonBadge, IonList, IonItem, IonThumbnail,
  IonSelect, IonSelectOption, IonToast, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gameControllerOutline, addOutline, searchOutline, filterOutline,
  logOutOutline, gridOutline, listOutline,
  starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
  closeOutline, imageOutline, chevronForwardOutline, heartOutline
} from 'ionicons/icons';
import { Game, GameFilters, PLATFORMS, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { formatReleaseCountdown } from '../../shared/utils/release-countdown';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { GameCardComponent } from '../../components/game-card/game-card.component';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, GameCardComponent, GameCoverComponent,
    IonContent, IonHeader, IonToolbar, IonButton,
    IonIcon, IonGrid, IonRow, IonCol, IonInput, IonChip,
    IonBadge, IonList, IonItem, IonThumbnail,
    IonSelect, IonSelectOption, IonToast
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

          <!-- Stats -->
          <div class="stats-bar">
            <div class="stat-item">
              <ion-icon [name]="isListView ? 'list-outline' : 'grid-outline'"></ion-icon>
              <span>{{filteredGames().length}} games</span>
            </div>
            <div class="stat-item">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ playingCount }} playing</span>
            </div>
            <div class="stat-item">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <span>{{ completedCount }} completed</span>
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

        <!-- Currently Playing -->
        <section class="library-section" *ngIf="showStatusSections && currentlyPlayingGames.length">
          <div class="section-header">
            <h2 class="section-title">Currently Playing</h2>
            <span class="section-count">{{ currentlyPlayingGames.length }}</span>
          </div>
          <div class="games-grid" *ngIf="!isListView">
            <app-game-card
              *ngFor="let game of currentlyPlayingGames; trackBy: trackByGameId"
              [game]="game"
              (onToggleCompleted)="cycleStatus($event)"
              (onDelete)="deleteGame($event)"
              class="game-card-wrapper"
            ></app-game-card>
          </div>
          <ion-list class="games-list" *ngIf="isListView">
            <ng-container *ngTemplateOutlet="listItems; context: { $implicit: currentlyPlayingGames }"></ng-container>
          </ion-list>
        </section>

        <!-- Library -->
        <section class="library-section" *ngIf="showStatusSections || displayGames.length > 0">
          <div class="section-header" *ngIf="showStatusSections">
            <h2 class="section-title">Your Library</h2>
            <span class="section-count">{{ libraryGamesCount }}</span>
          </div>

          <p class="section-empty" *ngIf="showStatusSections && libraryGamesCount === 0">
            No games in your library yet.
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
          *ngIf="showStatusSections"
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

          <p class="section-empty" *ngIf="wishlistGames.length === 0">
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

            <div class="game-info">
              <h3 class="game-title">{{ game.title }}</h3>
              <p class="game-meta">
                <span *ngIf="game.platform.name" class="platform-tag">{{ game.platform.name }}</span>
                <span *ngIf="game.releaseYear">{{ game.releaseYear }}</span>
                <span *ngIf="game.rating" class="rating-tag">
                  <ion-icon name="star-outline" class="star-icon"></ion-icon>
                  {{ game.rating }}
                </span>
              </p>
              <p class="game-details" *ngIf="game.developer.name || game.playtimeHours || (showCountdown && game.status === 'wishlist')">
                <span *ngIf="game.developer.name">{{ game.developer.name }}</span>
                <span *ngIf="game.playtimeHours">{{ game.playtimeHours }}h played</span>
                <span *ngIf="showCountdown && game.status === 'wishlist'" class="wishlist-countdown">
                  {{ getCountdownLabel(game) }}
                </span>
              </p>
            </div>

            <div class="game-status" slot="end">
              <ion-badge
                [color]="getStatusColor(game.status)"
                class="status-badge"
                (click)="$event.stopPropagation(); cycleStatus(game.id)"
              >
                <ion-icon [name]="getStatusIcon(game.status)"></ion-icon>
                {{ getStatusLabel(game.status) }}
              </ion-badge>
            </div>
          </ion-item>
        </ng-template>

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

    <!-- Custom Add Button - Fixed Position for iOS compatibility -->
    <button type="button" class="custom-add-button" routerLink="/add" aria-label="Add Game">
      <ion-icon name="add-outline"></ion-icon>
    </button>
  `,
  styles: [`
    /* Component wrapper styling */
    :host {
      display: contents;
    }

    .header-toolbar {
      --background: rgba(10, 10, 15, 0.92);
      --border-color: rgba(148, 163, 184, 0.12);
      --padding-top: 0;
      --padding-bottom: 0;
      --min-height: 68px;
      backdrop-filter: blur(18px);
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }

    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 1600px;
      margin: 0 auto;
      padding: 0.75rem 1.25rem;
      gap: 1rem;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      min-width: 0;
    }

    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(6, 182, 212, 0.12) 100%);
      border: 1px solid rgba(168, 85, 247, 0.32);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    }

    .brand-mark ion-icon {
      font-size: 1.25rem;
      color: #d8b4fe;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    .brand-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.1;
    }

    .brand-tagline {
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .header-icon-btn {
      --background: rgba(255, 255, 255, 0.04);
      --background-hover: rgba(168, 85, 247, 0.16);
      --background-activated: rgba(168, 85, 247, 0.22);
      --border-radius: 12px;
      --border-width: 0;
      --color: #94a3b8;
      --padding-start: 0;
      --padding-end: 0;
      width: 42px;
      height: 42px;
      margin: 0;
      border: none;
      transition: transform 0.2s ease;
    }

    .header-icon-btn::part(native) {
      border-radius: 12px;
    }

    .header-icon-btn:hover,
    .header-icon-btn:focus-visible {
      --color: #e2e8f0;
    }

    .header-icon-btn.active {
      --background: rgba(168, 85, 247, 0.18);
      --color: #e9d5ff;
    }

    .logout-btn:hover,
    .logout-btn:focus-visible {
      --color: #fecaca;
    }

    /* Search Section */
    .search-section {
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(15, 15, 28, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 18px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
    }

    .search-bar-container {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .filter-toggle-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .filter-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      box-sizing: border-box;
      background: rgba(15, 15, 28, 0.95);
      color: #cbd5e1;
      border-radius: 14px;
      border: none;
      padding: 0;
      height: 48px;
      min-height: 48px;
      max-height: 48px;
      min-width: 48px;
      width: 48px;
      margin: 0;
      position: relative;
      flex-shrink: 0;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition:
        transform 0.2s ease,
        background 0.2s ease,
        color 0.2s ease;
    }

    .filter-toggle-icon {
      font-size: 1.25rem;
      margin: 0;
      flex-shrink: 0;
      pointer-events: none;
    }

    .filter-toggle-label {
      display: none;
      font-size: 0.875rem;
      letter-spacing: 0.01em;
      pointer-events: none;
    }

    .filter-toggle-btn:hover,
    .filter-toggle-btn:focus-visible {
      color: #f1f5f9;
      background: rgba(168, 85, 247, 0.14);
      transform: translateY(-1px);
      outline: none;
    }

    .filter-toggle-btn.active {
      background: rgba(168, 85, 247, 0.16);
      color: #e9d5ff;
    }

    .filter-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      --background: #ef4444;
      --color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 2px solid rgba(15, 15, 28, 0.95);
      padding: 0 4px;
    }

    .play-history-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      width: 100%;
      min-height: 48px;
      margin-bottom: 1rem;
      padding: 0 1rem;
      border-radius: 14px;
      border: 1px solid rgba(34, 197, 94, 0.28);
      background: rgba(34, 197, 94, 0.1);
      color: #bbf7d0;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      box-sizing: border-box;
      transition:
        transform 0.2s ease,
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
    }

    .play-history-btn ion-icon {
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .play-history-btn__label {
      flex: 1;
      text-align: left;
    }

    .play-history-btn__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.75rem;
      height: 1.75rem;
      padding: 0 0.5rem;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.18);
      border: 1px solid rgba(34, 197, 94, 0.32);
      color: #4ade80;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .play-history-btn__chevron {
      font-size: 1rem;
      color: #4ade80;
      flex-shrink: 0;
    }

    .play-history-btn:hover,
    .play-history-btn:focus-visible {
      background: rgba(34, 197, 94, 0.16);
      border-color: rgba(34, 197, 94, 0.45);
      color: #dcfce7;
      transform: translateY(-1px);
      outline: none;
    }

    .wishlist-nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      width: 100%;
      min-height: 48px;
      margin-bottom: 1rem;
      padding: 0 1rem;
      border-radius: 14px;
      border: 1px solid rgba(244, 114, 182, 0.32);
      background: rgba(244, 114, 182, 0.1);
      color: #fbcfe8;
      font: inherit;
      font-weight: 600;
      font-size: 0.9375rem;
      box-sizing: border-box;
      cursor: pointer;
      transition:
        transform 0.2s ease,
        background 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
    }

    .wishlist-nav-btn ion-icon {
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .wishlist-nav-btn__label {
      flex: 1;
      text-align: left;
    }

    .wishlist-nav-btn__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.75rem;
      height: 1.75rem;
      padding: 0 0.5rem;
      border-radius: 999px;
      background: rgba(244, 114, 182, 0.18);
      border: 1px solid rgba(244, 114, 182, 0.35);
      color: #f9a8d4;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .wishlist-nav-btn__chevron {
      font-size: 1rem;
      color: #f9a8d4;
      flex-shrink: 0;
    }

    .wishlist-nav-btn:hover,
    .wishlist-nav-btn:focus-visible {
      background: rgba(244, 114, 182, 0.16);
      border-color: rgba(244, 114, 182, 0.48);
      color: #fce7f3;
      transform: translateY(-1px);
      outline: none;
    }

    .wishlist-section {
      scroll-margin-top: 6rem;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      gap: 1.5rem;
      padding: 1rem 1.25rem;
      background: rgba(15, 15, 28, 0.95);
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    .stat-item ion-icon {
      color: #a855f7;
      font-size: 1.125rem;
    }

    .filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.625rem;
    }

    .filter-chips ion-chip.selected {
      border-color: var(--platform-color, #a855f7);
    }

    .active-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(139, 92, 246, 0.1);
    }

    .active-filter-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4375rem;
      margin: 0;
      padding: 0.4375rem 0.6875rem 0.4375rem 0.8125rem;
      min-height: 2rem;
      border-radius: 999px;
      border: 1px solid rgba(168, 85, 247, 0.45);
      background: rgba(168, 85, 247, 0.2);
      color: #f1f5f9;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        transform 0.15s ease,
        box-shadow 0.2s ease;
    }

    .active-filter-chip__label {
      line-height: 1.2;
    }

    .active-filter-chip ion-icon {
      color: #fff;
      font-size: 1rem;
      flex-shrink: 0;
      pointer-events: none;
    }

    @media (hover: hover) {
      .active-filter-chip:hover {
        background: rgba(168, 85, 247, 0.3);
        border-color: rgba(192, 132, 252, 0.65);
        box-shadow: 0 4px 14px rgba(168, 85, 247, 0.22);
        transform: translateY(-1px);
      }
    }

    .active-filter-chip:active {
      transform: scale(0.97);
    }

    .library-section {
      margin-bottom: 2rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .section-header__actions {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
    }

    .section-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 999px;
      border: 1px solid rgba(244, 114, 182, 0.35);
      background: rgba(244, 114, 182, 0.12);
      color: #f9a8d4;
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 700;
      transition:
        transform 0.2s ease,
        background 0.2s ease,
        border-color 0.2s ease;
    }

    .section-add-btn:hover,
    .section-add-btn:focus-visible {
      background: rgba(244, 114, 182, 0.18);
      border-color: rgba(244, 114, 182, 0.5);
      transform: translateY(-1px);
      outline: none;
    }

    .section-add-btn ion-icon {
      font-size: 1rem;
    }

    .wishlist-countdown {
      color: #f9a8d4;
      font-weight: 600;
    }

    .section-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .section-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.75rem;
      height: 1.75rem;
      padding: 0 0.5rem;
      border-radius: 999px;
      background: rgba(168, 85, 247, 0.16);
      border: 1px solid rgba(168, 85, 247, 0.28);
      color: #d8b4fe;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .section-empty {
      margin: 0 0 0.5rem;
      padding: 1rem 1.125rem;
      border-radius: 12px;
      border: 1px dashed rgba(148, 163, 184, 0.22);
      background: rgba(15, 23, 42, 0.35);
      color: #94a3b8;
      font-size: 0.875rem;
    }

    /* Games Grid */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
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
      --padding-start: 20px;
      --padding-end: 20px;
      --padding-top: 16px;
      --padding-bottom: 16px;
      margin-bottom: 1rem;
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

    /* Custom Add Button - HTML button with fixed position for iOS compatibility */
    .custom-add-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      border: none;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10000;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      /* iOS-specific fixes */
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      /* Ensure button is above all content */
      pointer-events: auto;
    }

    /* Only apply hover effects on devices that support hover */
    @media (hover: hover) {
      .custom-add-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(139, 92, 246, 0.7);
      }
    }

    .custom-add-button:active {
      transform: scale(0.95);
    }

    .custom-add-button ion-icon {
      font-size: 28px;
      color: white;
      pointer-events: none;
    }

    /* iOS-specific safe area adjustments */
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .custom-add-button {
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
      .stats-bar {
        gap: 1rem;
      }

      .games-grid {
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1.25rem;
      }

      .game-thumbnail {
        --size: 60px;
      }

      .game-title {
        font-size: 1rem;
      }
    }

    @media (min-width: 640px) {
      .filter-toggle-btn {
        width: auto;
        min-width: 7.5rem;
        padding: 0 16px 0 14px;
        gap: 0.625rem;
      }

      .filter-toggle-icon {
        font-size: 1.125rem;
      }

      .filter-toggle-label {
        display: inline;
      }
    }

    @media (max-width: 480px) {
      .search-bar-container {
        flex-wrap: nowrap;
      }

      .search-field {
        flex: 1;
        min-width: 0;
      }

      .filter-toggle-btn {
        height: 48px;
        width: 48px;
        min-width: 48px;
        min-height: 48px;
        max-height: 48px;
      }

      .brand-tagline {
        display: none;
      }

      .header-inner {
        padding-inline: 1rem;
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
    addIcons({
      gameControllerOutline, addOutline, searchOutline, filterOutline,
      logOutOutline, gridOutline, listOutline,
      starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
      closeOutline, imageOutline, chevronForwardOutline, heartOutline
    });
  }

  ngOnInit(): void {
    this.loadGames();
    this.loadFilterOptions();
    this.setupSearch();
    this.applyFilters();
    this.countdownInterval = setInterval(() => {
      this.countdownTick++;
    }, 60000);
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

  cycleStatus(gameId: string): void {
    this.gameService.cycleStatus(gameId).subscribe({
      next: () => {
        this.showToast('Game status updated', 'success');
      },
      error: () => {
        this.showToast('Failed to update game', 'danger');
      }
    });
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

  get currentlyPlayingGames(): Game[] {
    return this.filteredGames().filter((game) => game.status === 'playing');
  }

  get wishlistGames(): Game[] {
    return this.filteredGames().filter((game) => game.status === 'wishlist');
  }

  get libraryGamesCount(): number {
    return this.filteredGames().filter((game) => game.status !== 'wishlist').length;
  }

  get displayGames(): Game[] {
    return this.filteredGames().filter((game) => game.status !== 'wishlist');
  }

  scrollToWishlist(): void {
    if (!this.showStatusSections) {
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
        this.showToast('Game deleted', 'success');
        this.loadFilterOptions();
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
    return this.filteredGames().filter((g) => g.status === 'completed').length;
  }

  get playingCount(): number {
    return this.filteredGames().filter((g) => g.status === 'playing').length;
  }

  get totalPlaytime(): number {
    return this.filteredGames().reduce((sum, g) => sum + (g.playtime || 0), 0);
  }
}
