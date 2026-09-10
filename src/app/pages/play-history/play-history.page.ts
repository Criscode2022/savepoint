import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarOutline,
  checkmarkCircleOutline,
  gameControllerOutline,
  starOutline,
  timeOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { Game } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';

@Component({
  selector: 'app-play-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GameCoverComponent,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonIcon,
    IonSpinner,
  ],
  templateUrl: './play-history.page.html',
})
export class PlayHistoryPage implements OnInit, OnDestroy {
  private readonly gameService = inject(GameService);

  protected completedGames: Game[] = [];
  protected loading = true;

  private readonly destroy$ = new Subject<void>();

  public ngOnInit(): void {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      checkmarkCircleOutline,
      gameControllerOutline,
      starOutline,
      timeOutline,
    });

    this.loadCompletedGames();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private trackByGameId(_index: number, game: Game): string {
    return game.id;
  }

  protected getCompletedIso(game: Game): string {
    return game.completedAt || game.updatedAt;
  }

  protected formatCompletedAt(game: Game): string {
    const value = game.completedAt || game.updatedAt;
    if (!value) {
      return 'Date unknown';
    }

    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private loadCompletedGames(): void {
    this.loading = true;
    this.gameService
      .getGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (games) => {
          this.completedGames = games
            .filter((game) => game.status === 'completed')
            .sort((a, b) =>
              (b.completedAt || b.updatedAt).localeCompare(
                a.completedAt || a.updatedAt,
              ),
            );
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
