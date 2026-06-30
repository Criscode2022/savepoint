import { Component, OnDestroy, OnInit } from '@angular/core';
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
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="history-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" icon="arrow-back-outline"></ion-back-button>
        </ion-buttons>
        <ion-title class="gaming-font">Play History</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="history-content">
      <div class="history-container">
        <header class="history-hero">
          <div class="history-hero__icon" aria-hidden="true">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
          </div>
          <div class="history-hero__copy">
            <h1 class="history-hero__title gaming-font">Completed Games</h1>
            <p class="history-hero__subtitle">
              {{ completedGames.length }}
              {{ completedGames.length === 1 ? 'game' : 'games' }} finished
            </p>
          </div>
        </header>

        <div class="history-loading" *ngIf="loading">
          <ion-spinner name="crescent"></ion-spinner>
        </div>

        <div class="history-empty" *ngIf="!loading && completedGames.length === 0">
          <ion-icon name="game-controller-outline"></ion-icon>
          <h2>No completed games yet</h2>
          <p>Mark a game as completed to see it here with the date you finished it.</p>
        </div>

        <ol class="history-timeline" *ngIf="!loading && completedGames.length > 0">
          <li
            *ngFor="let game of completedGames; trackBy: trackByGameId"
            class="history-entry"
          >
            <div class="history-entry__date">
              <span class="history-entry__date-label">Completed</span>
              <time [dateTime]="getCompletedIso(game)">
                {{ formatCompletedAt(game) }}
              </time>
            </div>

            <a [routerLink]="['/game', game.id]" class="history-entry__card">
              <div class="history-entry__cover">
                <app-game-cover
                  [title]="game.title"
                  [coverImage]="game.coverImage"
                  variant="thumbnail"
                />
              </div>

              <div class="history-entry__info">
                <h2 class="history-entry__title">{{ game.title }}</h2>
                <p class="history-entry__meta">
                  <span *ngIf="game.platform.name" class="platform-tag">
                    {{ game.platform.name }}
                  </span>
                  <span *ngIf="game.releaseYear">{{ game.releaseYear }}</span>
                </p>
                <p class="history-entry__details">
                  <span *ngIf="game.rating" class="detail-pill">
                    <ion-icon name="star-outline"></ion-icon>
                    {{ game.rating }}
                  </span>
                  <span *ngIf="game.playtimeHours" class="detail-pill">
                    <ion-icon name="time-outline"></ion-icon>
                    {{ game.playtimeHours }}h
                  </span>
                </p>
              </div>

              <ion-icon name="calendar-outline" class="history-entry__chevron" aria-hidden="true"></ion-icon>
            </a>
          </li>
        </ol>
      </div>
    </ion-content>
  `,
  styles: [`
    .history-toolbar {
      --background: rgba(10, 10, 18, 0.92);
      --color: #f8fafc;
    }

    .history-content {
      --background: #0a0a12;
    }

    .history-container {
      max-width: 760px;
      margin: 0 auto;
      padding: 1.25rem 1rem 2.5rem;
    }

    .history-hero {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding: 1.25rem 1.5rem;
      border-radius: 18px;
      border: 1px solid rgba(34, 197, 94, 0.22);
      background: linear-gradient(
        135deg,
        rgba(34, 197, 94, 0.12) 0%,
        rgba(15, 15, 28, 0.95) 100%
      );
    }

    .history-hero__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(34, 197, 94, 0.18);
      color: #4ade80;
      font-size: 1.75rem;
      flex-shrink: 0;
    }

    .history-hero__title {
      margin: 0 0 0.25rem;
      font-size: 1.375rem;
      color: #f8fafc;
    }

    .history-hero__subtitle {
      margin: 0;
      color: #94a3b8;
      font-size: 0.9375rem;
    }

    .history-loading {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }

    .history-empty {
      text-align: center;
      padding: 3rem 1.5rem;
      border-radius: 18px;
      border: 1px dashed rgba(148, 163, 184, 0.22);
      background: rgba(15, 15, 28, 0.55);
    }

    .history-empty ion-icon {
      font-size: 3rem;
      color: #64748b;
      margin-bottom: 1rem;
    }

    .history-empty h2 {
      margin: 0 0 0.5rem;
      color: #e2e8f0;
      font-size: 1.125rem;
    }

    .history-empty p {
      margin: 0;
      color: #94a3b8;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    .history-timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .history-entry {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.625rem;
    }

    .history-entry__date {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.5rem;
      padding-inline: 0.25rem;
    }

    .history-entry__date-label {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4ade80;
    }

    .history-entry__date time {
      font-size: 0.875rem;
      color: #cbd5e1;
    }

    .history-entry__card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 15, 28, 0.95);
      text-decoration: none;
      color: inherit;
      transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        background 0.2s ease;
    }

    .history-entry__card:hover {
      transform: translateY(-1px);
      border-color: rgba(34, 197, 94, 0.35);
      background: rgba(20, 20, 34, 0.98);
    }

    .history-entry__cover {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .history-entry__info {
      flex: 1;
      min-width: 0;
    }

    .history-entry__title {
      margin: 0 0 0.375rem;
      font-size: 1rem;
      font-weight: 700;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .history-entry__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0 0 0.375rem;
      font-size: 0.8125rem;
      color: #94a3b8;
    }

    .platform-tag {
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      background: rgba(168, 85, 247, 0.14);
      color: #d8b4fe;
      font-weight: 600;
    }

    .history-entry__details {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
      margin: 0;
    }

    .detail-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    .detail-pill ion-icon {
      font-size: 0.875rem;
    }

    .history-entry__chevron {
      flex-shrink: 0;
      font-size: 1.125rem;
      color: #475569;
    }

    @media (min-width: 640px) {
      .history-container {
        padding-inline: 1.5rem;
      }

      .history-entry {
        grid-template-columns: 11rem minmax(0, 1fr);
        align-items: center;
        gap: 1rem;
      }

      .history-entry__date {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        padding-inline: 0;
      }
    }
  `],
})
export class PlayHistoryPage implements OnInit, OnDestroy {
  completedGames: Game[] = [];
  loading = true;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly gameService: GameService) {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      checkmarkCircleOutline,
      gameControllerOutline,
      starOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.loadCompletedGames();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByGameId(_index: number, game: Game): string {
    return game.id;
  }

  getCompletedIso(game: Game): string {
    return game.completedAt || game.updatedAt;
  }

  formatCompletedAt(game: Game): string {
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
