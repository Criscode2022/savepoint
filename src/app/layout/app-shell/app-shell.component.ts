import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  gameControllerOutline,
  heartOutline,
  layersOutline,
  logOutOutline,
  menuOutline,
  pauseCircleOutline,
  personCircleOutline,
  playCircleOutline,
  searchOutline,
  sparklesOutline,
  statsChartOutline,
  trophyOutline,
} from 'ionicons/icons';
import { filter, Subject, takeUntil } from 'rxjs';
import { BrandMarkComponent } from '../../components/brand-mark/brand-mark.component';
import { CommandPaletteComponent } from '../../components/command-palette/command-palette.component';
import { AuthService } from '../../services/auth.service';
import { CommandPaletteService } from '../../services/command-palette.service';
import { GameService } from '../../services/game.service';
import { LibraryPrefsService } from '../../services/library-prefs.service';
import { Game } from '../../models/game.model';
import { APP_NAME } from '../../shared/brand';
import {
  LIBRARY_COLLECTIONS,
  LibraryCollection,
  STATUS_COLLECTIONS,
} from '../../shared/library-collections';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  queryParams?: Record<string, string>;
  count?: number;
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
    BrandMarkComponent,
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

  protected readonly appName = APP_NAME;
  protected sidebarCollapsed = false;
  protected mobileDrawerOpen = false;
  protected readonly modKey =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl ';

  protected primaryNav: NavItem[] = [];
  protected collectionNav: NavItem[] = [];

  public ngOnInit(): void {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronForwardOutline,
      gameControllerOutline,
      heartOutline,
      layersOutline,
      logOutOutline,
      menuOutline,
      pauseCircleOutline,
      personCircleOutline,
      playCircleOutline,
      searchOutline,
      sparklesOutline,
      statsChartOutline,
      trophyOutline,
    });

    this.sidebarCollapsed = this.prefs.sidebarCollapsed;
    this.prefs.sidebarCollapsed$
      .pipe(takeUntil(this.destroy$))
      .subscribe((collapsed) => (this.sidebarCollapsed = collapsed));

    this.buildNav([]);
    this.gameService.games$
      .pipe(takeUntil(this.destroy$))
      .subscribe((games) => this.buildNav(games));

    // The shell owns the initial library load; pages re-filter the cached copy.
    this.gameService.getGames().pipe(takeUntil(this.destroy$)).subscribe({ error: () => undefined });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => (this.mobileDrawerOpen = false));
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get showLabels(): boolean {
    return !this.sidebarCollapsed || this.mobileDrawerOpen;
  }

  protected toggleSidebar(): void {
    this.prefs.toggleSidebar();
  }

  protected openPalette(): void {
    this.palette.open();
  }

  protected closeDrawer(): void {
    this.mobileDrawerOpen = false;
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private buildNav(games: Game[]): void {
    const count = (key: LibraryCollection) => games.filter(LIBRARY_COLLECTIONS[key].matches).length;

    this.primaryNav = [
      { label: 'Library', icon: 'game-controller-outline', link: '/home', queryParams: {}, count: count('all') },
      { label: 'Insights', icon: 'stats-chart-outline', link: '/insights' },
      { label: 'For you', icon: 'sparkles-outline', link: '/recommendations' },
      { label: 'Play history', icon: 'trophy-outline', link: '/play-history' },
    ];

    this.collectionNav = STATUS_COLLECTIONS.map((key) => ({
      label: LIBRARY_COLLECTIONS[key].label,
      icon: LIBRARY_COLLECTIONS[key].icon,
      link: '/home',
      queryParams: { collection: key },
      count: count(key),
    }));
  }
}
