import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  albumsOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  ellipseOutline,
  gameControllerOutline,
  gridOutline,
  heartOutline,
  listOutline,
  logOutOutline,
  menuOutline,
  pauseCircleOutline,
  personCircleOutline,
  searchOutline,
  sparklesOutline,
  statsChartOutline,
  timeOutline,
} from 'ionicons/icons';
import { filter, Subject, takeUntil } from 'rxjs';
import { CommandPaletteComponent } from '../../components/command-palette/command-palette.component';
import { AuthService } from '../../services/auth.service';
import { CommandPaletteService } from '../../services/command-palette.service';
import { GameService } from '../../services/game.service';
import { LibraryPrefsService } from '../../services/library-prefs.service';
import { Game } from '../../models/game.model';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  queryParams?: Record<string, string>;
  exact?: boolean;
  count?: () => number;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonRouterOutlet,
    IonIcon,
    CommandPaletteComponent,
  ],
  template: `
    <div
      class="shell"
      [class.shell--collapsed]="sidebarCollapsed"
      [class.shell--drawer-open]="mobileDrawerOpen"
    >
      <div
        class="shell-scrim"
        *ngIf="mobileDrawerOpen"
        (click)="mobileDrawerOpen = false"
        role="presentation"
      ></div>

      <aside class="shell-sidebar" aria-label="Main navigation">
        <div class="shell-brand">
          <div class="shell-brand__mark" aria-hidden="true">
            <ion-icon name="game-controller-outline"></ion-icon>
          </div>
          <div class="shell-brand__copy" *ngIf="!sidebarCollapsed || mobileDrawerOpen">
            <span class="shell-brand__name gaming-font"
              >Game<span class="text-gradient">Vault</span></span
            >
            <span class="shell-brand__tag">Your collection</span>
          </div>
          <button
            type="button"
            class="shell-collapse-btn shell-collapse-btn--desktop"
            (click)="toggleSidebar()"
            [attr.aria-label]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <ion-icon
              [name]="sidebarCollapsed ? 'chevron-forward-outline' : 'chevron-back-outline'"
            ></ion-icon>
          </button>
        </div>

        <nav class="shell-nav">
          <div class="shell-nav__section">
            <span class="shell-nav__label" *ngIf="!sidebarCollapsed || mobileDrawerOpen"
              >Library</span
            >
            @for (item of primaryNav; track item.label) {
              <a
                class="shell-nav__item"
                [routerLink]="item.link"
                [queryParams]="item.queryParams || {}"
                routerLinkActive="shell-nav__item--active"
                [routerLinkActiveOptions]="item.exact ? { exact: true, queryParams: 'exact' } : { exact: false }"
                (click)="onNavClick()"
                [title]="item.label"
              >
                <ion-icon [name]="item.icon" aria-hidden="true"></ion-icon>
                <span class="shell-nav__text" *ngIf="!sidebarCollapsed || mobileDrawerOpen">{{
                  item.label
                }}</span>
                @if (item.count && (!sidebarCollapsed || mobileDrawerOpen)) {
                  <span class="shell-nav__count">{{ item.count() }}</span>
                }
              </a>
            }
          </div>

          <div class="shell-nav__section">
            <span class="shell-nav__label" *ngIf="!sidebarCollapsed || mobileDrawerOpen"
              >Collections</span
            >
            @for (item of collectionNav; track item.label) {
              <a
                class="shell-nav__item"
                [routerLink]="item.link"
                [queryParams]="item.queryParams || {}"
                routerLinkActive="shell-nav__item--active"
                [routerLinkActiveOptions]="{ exact: true, queryParams: 'exact' }"
                (click)="onNavClick()"
                [title]="item.label"
              >
                <ion-icon [name]="item.icon" aria-hidden="true"></ion-icon>
                <span class="shell-nav__text" *ngIf="!sidebarCollapsed || mobileDrawerOpen">{{
                  item.label
                }}</span>
                @if (item.count && (!sidebarCollapsed || mobileDrawerOpen)) {
                  <span class="shell-nav__count">{{ item.count() }}</span>
                }
              </a>
            }
          </div>
        </nav>

        <div class="shell-sidebar__foot">
          <a
            class="shell-nav__item"
            routerLink="/profile"
            routerLinkActive="shell-nav__item--active"
            (click)="onNavClick()"
            title="Profile"
          >
            <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
            <span class="shell-nav__text" *ngIf="!sidebarCollapsed || mobileDrawerOpen"
              >Profile</span
            >
          </a>
          <button
            type="button"
            class="shell-nav__item shell-nav__item--btn"
            (click)="logout()"
            title="Log out"
          >
            <ion-icon name="log-out-outline" aria-hidden="true"></ion-icon>
            <span class="shell-nav__text" *ngIf="!sidebarCollapsed || mobileDrawerOpen"
              >Log out</span
            >
          </button>
        </div>
      </aside>

      <div class="shell-main">
        <header class="shell-topbar">
          <button
            type="button"
            class="shell-icon-btn shell-menu-btn"
            (click)="mobileDrawerOpen = !mobileDrawerOpen"
            aria-label="Open menu"
          >
            <ion-icon name="menu-outline"></ion-icon>
          </button>

          <button
            type="button"
            class="shell-search-trigger"
            (click)="openPalette()"
            aria-label="Open search and commands"
          >
            <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
            <span class="shell-search-trigger__label">Search library…</span>
            <kbd class="shell-search-trigger__kbd">{{ modKey }}K</kbd>
          </button>

          <div class="shell-topbar__actions">
            <div class="shell-view-toggle" role="group" aria-label="Library view">
              <button
                type="button"
                class="shell-icon-btn"
                [class.shell-icon-btn--active]="viewMode === 'grid'"
                (click)="setView('grid')"
                title="Grid view"
                aria-label="Grid view"
              >
                <ion-icon name="grid-outline"></ion-icon>
              </button>
              <button
                type="button"
                class="shell-icon-btn"
                [class.shell-icon-btn--active]="viewMode === 'list'"
                (click)="setView('list')"
                title="List view"
                aria-label="List view"
              >
                <ion-icon name="list-outline"></ion-icon>
              </button>
              <button
                type="button"
                class="shell-icon-btn"
                [class.shell-icon-btn--active]="viewMode === 'shelf'"
                (click)="setView('shelf')"
                title="Shelf view"
                aria-label="Shelf view"
              >
                <ion-icon name="albums-outline"></ion-icon>
              </button>
            </div>

            <a routerLink="/add" class="shell-add-btn">
              <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
              <span>Add game</span>
            </a>
          </div>
        </header>

        <main class="shell-content">
          <ion-router-outlet></ion-router-outlet>
        </main>
      </div>

      <nav class="shell-mobile-tabs" aria-label="Mobile navigation">
        <a
          routerLink="/home"
          [queryParams]="{}"
          routerLinkActive="shell-mobile-tabs__item--active"
          [routerLinkActiveOptions]="{ exact: true, queryParams: 'exact' }"
          class="shell-mobile-tabs__item"
        >
          <ion-icon name="game-controller-outline"></ion-icon>
          <span>Library</span>
        </a>
        <a
          routerLink="/home"
          [queryParams]="{ collection: 'playing' }"
          routerLinkActive="shell-mobile-tabs__item--active"
          class="shell-mobile-tabs__item"
        >
          <ion-icon name="time-outline"></ion-icon>
          <span>Playing</span>
        </a>
        <a routerLink="/add" class="shell-mobile-tabs__item shell-mobile-tabs__item--add">
          <span class="shell-mobile-tabs__fab">
            <ion-icon name="add-outline"></ion-icon>
          </span>
          <span>Add</span>
        </a>
        <a
          routerLink="/home"
          [queryParams]="{ collection: 'wishlist' }"
          routerLinkActive="shell-mobile-tabs__item--active"
          class="shell-mobile-tabs__item"
        >
          <ion-icon name="heart-outline"></ion-icon>
          <span>Wishlist</span>
        </a>
        <a
          routerLink="/profile"
          routerLinkActive="shell-mobile-tabs__item--active"
          class="shell-mobile-tabs__item"
        >
          <ion-icon name="person-circle-outline"></ion-icon>
          <span>You</span>
        </a>
      </nav>

      <app-command-palette></app-command-palette>
    </div>
  `,
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit, OnDestroy {
  private readonly prefs = inject(LibraryPrefsService);
  private readonly palette = inject(CommandPaletteService);
  private readonly auth = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  sidebarCollapsed = false;
  mobileDrawerOpen = false;
  viewMode: 'grid' | 'list' | 'shelf' = 'grid';
  games: Game[] = [];
  modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl+';

  primaryNav: NavItem[] = [];
  collectionNav: NavItem[] = [];

  constructor() {
    addIcons({
      addOutline,
      albumsOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      ellipseOutline,
      gameControllerOutline,
      gridOutline,
      heartOutline,
      listOutline,
      logOutOutline,
      menuOutline,
      pauseCircleOutline,
      personCircleOutline,
      searchOutline,
      sparklesOutline,
      statsChartOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.sidebarCollapsed = this.prefs.sidebarCollapsed;
    this.viewMode = this.prefs.viewMode;

    this.prefs.sidebarCollapsed$
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => (this.sidebarCollapsed = v));

    this.prefs.viewMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => (this.viewMode = v));

    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.games = games;
      this.buildNav();
    });

    // Ensure library data is available for sidebar counts & command palette
    this.gameService.getGames().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => undefined,
    });

    this.buildNav();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.mobileDrawerOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.prefs.toggleSidebar();
  }

  openPalette(): void {
    this.palette.open();
  }

  setView(mode: 'grid' | 'list' | 'shelf'): void {
    this.prefs.setViewMode(mode);
  }

  onNavClick(): void {
    this.mobileDrawerOpen = false;
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private buildNav(): void {
    const lib = this.games.filter((g) => g.status !== 'wishlist');
    const count = (pred: (g: Game) => boolean) => () =>
      this.games.filter(pred).length;

    this.primaryNav = [
      {
        label: 'All games',
        icon: 'game-controller-outline',
        link: '/home',
        queryParams: {},
        exact: true,
        count: () => lib.length,
      },
      {
        label: 'Insights',
        icon: 'stats-chart-outline',
        link: '/insights',
      },
      {
        label: 'For you',
        icon: 'sparkles-outline',
        link: '/recommendations',
      },
      {
        label: 'Play history',
        icon: 'checkmark-circle-outline',
        link: '/play-history',
        count: () => lib.filter((g) => g.status === 'completed').length,
      },
    ];

    this.collectionNav = [
      {
        label: 'Not started',
        icon: 'ellipse-outline',
        link: '/home',
        queryParams: { collection: 'not_started' },
        count: count((g) => g.status === 'not_started'),
      },
      {
        label: 'Playing',
        icon: 'time-outline',
        link: '/home',
        queryParams: { collection: 'playing' },
        count: count((g) => g.status === 'playing'),
      },
      {
        label: 'Paused',
        icon: 'pause-circle-outline',
        link: '/home',
        queryParams: { collection: 'paused' },
        count: count((g) => g.status === 'paused'),
      },
      {
        label: 'Completed',
        icon: 'checkmark-circle-outline',
        link: '/home',
        queryParams: { collection: 'completed' },
        count: count((g) => g.status === 'completed'),
      },
      {
        label: 'Wishlist',
        icon: 'heart-outline',
        link: '/home',
        queryParams: { collection: 'wishlist' },
        count: count((g) => g.status === 'wishlist'),
      },
    ];
  }
}
