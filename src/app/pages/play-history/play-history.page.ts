import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, timeOutline, trophyOutline } from 'ionicons/icons';
import { Game } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { isRated } from '../../shared/utils/rating.utils';

addIcons({ star, timeOutline, trophyOutline });

interface CompletionYear {
  year: string;
  games: Game[];
}

@Component({
  selector: 'app-play-history',
  imports: [DatePipe, RouterLink, GameCoverComponent, PageHeaderComponent, IonContent, IonIcon, IonSpinner],
  templateUrl: './play-history.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayHistoryPage {
  private readonly gameService = inject(GameService);

  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected readonly isRated = isRated;
  protected readonly completedAt = completedAt;

  // Live: completing a game anywhere in the app updates this timeline.
  private readonly completed = computed(() =>
    this.gameService
      .games()
      .filter((game) => game.status === 'completed')
      .sort((a, b) => completedAt(b).localeCompare(completedAt(a))),
  );

  protected readonly completedCount = computed(() => this.completed().length);
  protected readonly years = computed(() => groupByYear(this.completed()));

  protected readonly subtitle = computed(() => {
    const count = this.completedCount();
    if (!count) {
      return 'Every game you finish lands here, newest first.';
    }
    return `${count} ${count === 1 ? 'game' : 'games'} finished — and counting.`;
  });
}

function completedAt(game: Game): string {
  return game.completedAt || game.updatedAt || '';
}

function groupByYear(games: Game[]): CompletionYear[] {
  const groups = new Map<string, Game[]>();
  for (const game of games) {
    const year = completedAt(game).slice(0, 4) || 'Undated';
    groups.set(year, [...(groups.get(year) ?? []), game]);
  }
  return [...groups.entries()].map(([year, list]) => ({ year, games: list }));
}
