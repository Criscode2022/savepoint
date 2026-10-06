import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, timeOutline, trophyOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { Game } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { isRated } from '../../shared/utils/rating.utils';

interface CompletionYear {
  year: string;
  games: Game[];
}

@Component({
  selector: 'app-play-history',
  standalone: true,
  imports: [CommonModule, RouterLink, GameCoverComponent, PageHeaderComponent, IonContent, IonIcon, IonSpinner],
  templateUrl: './play-history.page.html',
})
export class PlayHistoryPage implements OnInit, OnDestroy {
  private readonly gameService = inject(GameService);

  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected readonly isRated = isRated;
  protected completedCount = 0;
  protected years: CompletionYear[] = [];

  private readonly destroy$ = new Subject<void>();

  public ngOnInit(): void {
    addIcons({ star, timeOutline, trophyOutline });

    // Live: completing a game anywhere in the app updates this timeline.
    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      const completed = games
        .filter((game) => game.status === 'completed')
        .sort((a, b) => this.completedAt(b).localeCompare(this.completedAt(a)));
      this.completedCount = completed.length;
      this.years = this.groupByYear(completed);
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get subtitle(): string {
    if (!this.completedCount) {
      return 'Every game you finish lands here, newest first.';
    }
    const games = this.completedCount === 1 ? 'game' : 'games';
    return `${this.completedCount} ${games} finished — and counting.`;
  }

  protected completedAt(game: Game): string {
    return game.completedAt || game.updatedAt || '';
  }

  private groupByYear(games: Game[]): CompletionYear[] {
    const groups = new Map<string, Game[]>();
    for (const game of games) {
      const year = this.completedAt(game).slice(0, 4) || 'Undated';
      groups.set(year, [...(groups.get(year) ?? []), game]);
    }
    return [...groups.entries()].map(([year, list]) => ({ year, games: list }));
  }
}
