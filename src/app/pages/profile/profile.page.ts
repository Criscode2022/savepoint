import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, checkmarkCircleOutline, ellipseOutline, heartOutline, pauseCircleOutline,
  playCircleOutline, statsChartOutline, trophyOutline,
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { Game, GAME_STATUS_ICONS, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { LIBRARY_COLLECTIONS } from '../../shared/library-collections';

addIcons({
  logOutOutline, checkmarkCircleOutline, ellipseOutline, heartOutline, pauseCircleOutline,
  playCircleOutline, statsChartOutline, trophyOutline,
});

const XP_PER_LEVEL = 50;
const LEVEL_TITLES: readonly [number, string][] = [
  [10, 'Legend'],
  [7, 'Veteran'],
  [4, 'Completionist'],
  [2, 'Collector'],
  [1, 'Rookie'],
];

interface ProfileStats {
  totalGames: number;
  completedGames: number;
  totalHours: number;
  averageRating: string;
  completionRate: number;
  level: number;
  levelTitle: string;
  levelXp: number;
  wishlistCount: number;
  recentGames: Game[];
}

@Component({
  selector: 'app-profile',
  imports: [RouterLink, GameCoverComponent, PageHeaderComponent, IonContent, IonIcon],
  templateUrl: './profile.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);

  protected readonly xpPerLevel = XP_PER_LEVEL;
  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected readonly user = this.authService.user;
  protected readonly avatarLoadFailed = signal(false);

  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.username || user?.email?.split('@')[0] || 'Player one';
  });

  protected readonly initials = computed(() =>
    this.displayName()
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );

  protected readonly profileStats = computed(() => computeProfileStats(this.gameService.games()));

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

function computeProfileStats(games: Game[]): ProfileStats {
  /** Owned games only — the wishlist isn't part of completion or playtime */
  const library = games.filter(LIBRARY_COLLECTIONS.all.matches);
  const totalGames = library.length;
  const completedGames = library.filter((g) => g.status === 'completed').length;
  const totalHours = Math.round(library.reduce((sum, g) => sum + (g.playtimeHours || 0), 0));
  const rated = library.filter((g) => g.rating != null);
  const averageRating = rated.length
    ? (rated.reduce((sum, g) => sum + (g.rating || 0), 0) / rated.length).toFixed(1)
    : '—';
  // Light gamification: 10 XP per completed game, 1 XP per 10 hours played
  const xp = completedGames * 10 + Math.floor(totalHours / 10);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  return {
    totalGames,
    completedGames,
    totalHours,
    averageRating,
    completionRate: totalGames ? Math.round((completedGames / totalGames) * 100) : 0,
    level,
    levelTitle: LEVEL_TITLES.find(([min]) => level >= min)?.[1] ?? 'Rookie',
    levelXp: xp % XP_PER_LEVEL,
    wishlistCount: games.length - library.length,
    recentGames: [...games]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5),
  };
}
