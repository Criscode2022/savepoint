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
  templateUrl: './app-shell.component.html',
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
