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
        <ion-title>Play History</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="history-content">
      <div class="history-container">
        <header class="history-hero">
          <div class="history-hero__icon" aria-hidden="true">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
          </div>
          <div class="history-hero__copy">
            <h1 class="history-hero__title">Completed Games</h1>
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
  `,})
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
