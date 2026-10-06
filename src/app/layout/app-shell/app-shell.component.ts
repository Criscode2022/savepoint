import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
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
import { filter } from 'rxjs';
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

interface NavItem {
  label: string;
  icon: string;
  link: string;
  queryParams?: Record<string, string>;
  count?: number;
}

@Component({
  selector: 'app-shell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    IonRouterOutlet,
    IonIcon,
    BrandMarkComponent,
    CommandPaletteComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly prefs = inject(LibraryPrefsService);
  private readonly palette = inject(CommandPaletteService);
  private readonly auth = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);

  protected readonly appName = APP_NAME;
  protected readonly modKey =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl ';

  protected readonly sidebarCollapsed = this.prefs.sidebarCollapsed;
  protected readonly mobileDrawerOpen = signal(false);
  protected readonly showLabels = computed(() => !this.sidebarCollapsed() || this.mobileDrawerOpen());

  private readonly nav = computed(() => buildNav(this.gameService.games()));
  protected readonly primaryNav = computed(() => this.nav().primary);
  protected readonly collectionNav = computed(() => this.nav().collections);

  constructor() {
    // The shell owns the initial library load; pages derive their views from the cached signal.
    this.gameService.loadGames().pipe(takeUntilDestroyed()).subscribe({ error: () => undefined });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mobileDrawerOpen.set(false));
  }

  protected toggleSidebar(): void {
    this.prefs.toggleSidebar();
  }

  protected toggleDrawer(): void {
    this.mobileDrawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  protected openPalette(): void {
    this.palette.open();
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}

function buildNav(games: Game[]): { primary: NavItem[]; collections: NavItem[] } {
  const count = (key: LibraryCollection) => games.filter(LIBRARY_COLLECTIONS[key].matches).length;

  return {
    primary: [
      { label: 'Library', icon: 'game-controller-outline', link: '/home', queryParams: {}, count: count('all') },
      { label: 'Insights', icon: 'stats-chart-outline', link: '/insights' },
      { label: 'For you', icon: 'sparkles-outline', link: '/recommendations' },
      { label: 'Play history', icon: 'trophy-outline', link: '/play-history' },
    ],
    collections: STATUS_COLLECTIONS.map((key) => ({
      label: LIBRARY_COLLECTIONS[key].label,
      icon: LIBRARY_COLLECTIONS[key].icon,
      link: '/home',
      queryParams: { collection: key },
      count: count(key),
    })),
  };
}
