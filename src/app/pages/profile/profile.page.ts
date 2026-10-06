import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, checkmarkCircleOutline, ellipseOutline, heartOutline, pauseCircleOutline,
  playCircleOutline, statsChartOutline, trophyOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { AuthUser } from '../../models/auth.model';
import { Game, GAME_STATUS_ICONS, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { LIBRARY_COLLECTIONS } from '../../shared/library-collections';

const XP_PER_LEVEL = 50;
const LEVEL_TITLES: readonly [number, string][] = [
  [10, 'Legend'],
  [7, 'Veteran'],
  [4, 'Completionist'],
  [2, 'Collector'],
  [1, 'Rookie'],
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, GameCoverComponent, PageHeaderComponent, IonContent, IonIcon],
  templateUrl: './profile.page.html',
})
export class ProfilePage implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);

  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected user: AuthUser | null = null;
  /** Owned games only — the wishlist isn't part of completion or playtime */
  private library: Game[] = [];
  protected wishlistCount = 0;
  protected recentGames: Game[] = [];
  protected avatarLoadFailed = false;

  private readonly destroy$ = new Subject<void>();

  public ngOnInit(): void {
    addIcons({
      logOutOutline, checkmarkCircleOutline, ellipseOutline, heartOutline, pauseCircleOutline,
      playCircleOutline, statsChartOutline, trophyOutline,
    });

    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      void this.router.navigate(['/login']);
      return;
    }

    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.library = games.filter(LIBRARY_COLLECTIONS.all.matches);
      this.wishlistCount = games.length - this.library.length;
      this.recentGames = [...games]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 5);
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get displayName(): string {
    return this.user?.username || this.user?.email?.split('@')[0] || 'Player one';
  }

  protected get initials(): string {
    return this.displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }

  protected get totalGames(): number {
    return this.library.length;
  }

  protected get completedGames(): number {
    return this.library.filter((g) => g.status === 'completed').length;
  }

  protected get totalHours(): number {
    return Math.round(this.library.reduce((sum, g) => sum + (g.playtimeHours || 0), 0));
  }

  protected get averageRating(): string {
    const rated = this.library.filter((g) => g.rating != null);
    if (!rated.length) {
      return '—';
    }
    return (rated.reduce((sum, g) => sum + (g.rating || 0), 0) / rated.length).toFixed(1);
  }

  protected get completionRate(): number {
    return this.totalGames ? Math.round((this.completedGames / this.totalGames) * 100) : 0;
  }

  /** Light gamification: 10 XP per completed game, 1 XP per 10 hours played */
  private get xp(): number {
    return this.completedGames * 10 + Math.floor(this.totalHours / 10);
  }

  protected get level(): number {
    return Math.floor(this.xp / XP_PER_LEVEL) + 1;
  }

  protected get levelTitle(): string {
    return LEVEL_TITLES.find(([min]) => this.level >= min)?.[1] ?? 'Rookie';
  }

  protected get levelXp(): number {
    return this.xp % XP_PER_LEVEL;
  }

  protected readonly xpPerLevel = XP_PER_LEVEL;

  protected statusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }

  protected statusIcon(status: GamePlayStatus): string {
    return GAME_STATUS_ICONS[status];
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
