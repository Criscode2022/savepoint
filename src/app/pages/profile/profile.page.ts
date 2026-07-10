import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonButton,
  IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonAvatar, IonItem, IonLabel, IonGrid, IonRow, IonCol, IonBadge,
  IonProgressBar, IonList, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  logOutOutline, personOutline, gameControllerOutline, 
  timeOutline, checkmarkCircleOutline, starOutline, 
  arrowBackOutline, settingsOutline, trophyOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { AuthUser } from '../../models/auth.model';
import { Game, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { Subject, takeUntil } from 'rxjs';

import { GameCoverComponent } from '../../components/game-cover/game-cover.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, RouterLink, GameCoverComponent,
    IonContent, IonHeader, IonToolbar, IonButton,
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAvatar, IonGrid, IonRow, IonCol,
    IonProgressBar, IonToast
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <div class="header-inner">
          <div class="header-brand">
            <ion-button
              routerLink="/home"
              class="header-back-btn"
              fill="clear"
              aria-label="Back to home"
            >
              <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
            </ion-button>
            <h1 class="header-title">Profile</h1>
          </div>

          <div class="header-actions">
            <ion-button
              (click)="logout()"
              class="header-icon-btn logout-btn"
              fill="clear"
              aria-label="Log out"
            >
              <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="profile-content">
      <div class="profile-container" *ngIf="user">
        <!-- Profile Header -->
        <header class="profile-header">
          <ion-avatar class="profile-avatar">
            <img
              *ngIf="user.avatarUrl && !avatarLoadFailed"
              [src]="user.avatarUrl"
              [alt]="user.username || user.email"
              (error)="avatarLoadFailed = true"
            />
            <div
              *ngIf="!user.avatarUrl || avatarLoadFailed"
              class="profile-avatar-fallback"
              aria-hidden="true"
            >
              <ion-icon name="person-outline"></ion-icon>
            </div>
          </ion-avatar>

          <div class="profile-info">
            <h1 class="profile-name">{{ user.username || 'Gamer' }}</h1>
            <p class="profile-email">{{ user.email }}</p>
            <div class="profile-badges">
              <span class="level-badge">
                <ion-icon name="trophy-outline" aria-hidden="true"></ion-icon>
                Level {{ userLevel }}
              </span>
            </div>
          </div>
        </header>

        <!-- Stats Grid -->
        <ion-grid class="stats-grid">
          <ion-row>
            <ion-col size="6" sizeMd="3">
              <ion-card class="stat-card">
                <ion-card-content>
                  <div class="stat-icon-wrapper games">
                    <ion-icon name="game-controller-outline"></ion-icon>
                  </div>
                  <div class="stat-value">{{ totalGames }}</div>
                  <div class="stat-label">Total Games</div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <ion-col size="6" sizeMd="3">
              <ion-card class="stat-card">
                <ion-card-content>
                  <div class="stat-icon-wrapper completed">
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                  </div>
                  <div class="stat-value">{{ completedGames }}</div>
                  <div class="stat-label">Completed</div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <ion-col size="6" sizeMd="3">
              <ion-card class="stat-card">
                <ion-card-content>
                  <div class="stat-icon-wrapper hours">
                    <ion-icon name="time-outline"></ion-icon>
                  </div>
                  <div class="stat-value">{{ totalHours }}</div>
                  <div class="stat-label">Hours Played</div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <ion-col size="6" sizeMd="3">
              <ion-card class="stat-card">
                <ion-card-content>
                  <div class="stat-icon-wrapper rating">
                    <ion-icon name="star-outline"></ion-icon>
                  </div>
                  <div class="stat-value">{{ averageRating }}</div>
                  <div class="stat-label">Avg Rating</div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- Progress Section -->
        <ion-card class="profile-card progress-card">
          <ion-card-header>
            <ion-card-title>Collection Progress</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="progress-item">
              <div class="progress-header">
                <span>Completion rate</span>
                <span class="progress-value">{{ completionRate }}%</span>
              </div>
              <ion-progress-bar [value]="completionRate / 100" color="success"></ion-progress-bar>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Recent Games -->
        <ion-card class="profile-card recent-games-card">
          <ion-card-header>
            <ion-card-title>Recently Added</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="recent-games-list" *ngIf="recentGames.length > 0; else noRecentGames">
              <a
                *ngFor="let game of recentGames"
                class="recent-game-row"
                [routerLink]="['/game', game.id]"
              >
                <div class="recent-game-row__thumb">
                  <app-game-cover
                    [title]="game.title"
                    [coverImage]="game.coverImage"
                    variant="thumbnail"
                  ></app-game-cover>
                </div>
                <div class="recent-game-row__body">
                  <h3 class="recent-game-row__title">{{ game.title }}</h3>
                  <p class="recent-game-row__meta">
                    {{ game.platform.name || 'Unknown' }} · {{ game.releaseYear }}
                  </p>
                </div>
                <span
                  class="recent-game-row__status"
                  [class]="'recent-game-row__status--' + game.status"
                >
                  {{ getStatusLabel(game.status) }}
                </span>
              </a>
            </div>
            <ng-template #noRecentGames>
              <p class="profile-empty-note">No games in your collection yet.</p>
            </ng-template>
          </ion-card-content>
        </ion-card>
      </div>

      <ion-toast
        [isOpen]="!!toastMessage"
        [message]="toastMessage"
        [color]="toastColor"
        duration="3000"
        position="bottom"
        (didDismiss)="toastMessage = ''">
      </ion-toast>
    </ion-content>
  `,
})
export class ProfilePage implements OnInit {
  user: AuthUser | null = null;
  games: Game[] = [];
  recentGames: Game[] = [];
  avatarLoadFailed = false;
  
  toastMessage = '';
  toastColor: 'success' | 'danger' = 'success';
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private gameService: GameService,
    private router: Router
  ) {
    addIcons({ 
      logOutOutline, personOutline, gameControllerOutline, 
      timeOutline, checkmarkCircleOutline, starOutline, 
      arrowBackOutline, settingsOutline, trophyOutline
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadGames();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGames(): void {
    this.gameService.games$.pipe(takeUntil(this.destroy$))
      .subscribe(games => {
        this.games = games;
        this.recentGames = [...games]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 5);
      });

    this.gameService.getGames().pipe(takeUntil(this.destroy$)).subscribe();
  }

  get totalGames(): number {
    return this.games.length;
  }

  get completedGames(): number {
    return this.games.filter((g) => g.status === 'completed').length;
  }

  get playingGames(): number {
    return this.games.filter((g) => g.status === 'playing').length;
  }

  getStatusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }

  get totalHours(): number {
    return this.games.reduce((sum, g) => sum + (g.playtime || 0), 0);
  }

  get averageRating(): string {
    const ratedGames = this.games.filter(
      (g) => g.rating != null && g.status !== 'wishlist',
    );
    if (ratedGames.length === 0) {
      return '—';
    }

    const avg =
      ratedGames.reduce((sum, g) => sum + (g.rating || 0), 0) / ratedGames.length;
    return avg.toFixed(1);
  }

  get ratedGamesCount(): number {
    return this.games.filter(
      (g) => g.rating != null && g.status !== 'wishlist',
    ).length;
  }

  get completionRate(): number {
    if (this.totalGames === 0) return 0;
    return Math.round((this.completedGames / this.totalGames) * 100);
  }

  get userLevel(): number {
    // Simple level calculation based on completed games and hours played
    const completedPoints = this.completedGames * 10;
    const hoursPoints = Math.floor(this.totalHours / 10);
    return Math.max(1, Math.floor((completedPoints + hoursPoints) / 50) + 1);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
