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

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonButton,
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAvatar, IonItem, IonLabel, IonGrid, IonRow, IonCol, IonBadge,
    IonProgressBar, IonList, IonToast
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
        <div class="profile-header">
          <ion-avatar class="profile-avatar">
            <img 
              [src]="user.avatarUrl || '/assets/images/default-avatar.png'" 
              [alt]="user.username || user.email"
            />
          </ion-avatar>
          
          <div class="profile-info">
            <h1 class="profile-name">{{ user.username || 'Gamer' }}</h1>
            <p class="profile-email">{{ user.email }}</p>
            <div class="profile-badges">
              <ion-badge class="level-badge" color="primary">
                <ion-icon name="trophy-outline"></ion-icon>
                Level {{ userLevel }}
              </ion-badge>
            </div>
          </div>
        </div>

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
        <ion-card class="progress-card">
          <ion-card-header>
            <ion-card-title>Collection Progress</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="progress-item">
              <div class="progress-header">
                <span>Completion Rate</span>
                <span class="progress-value">{{ completionRate }}%</span>
              </div>
              <ion-progress-bar [value]="completionRate" color="success"></ion-progress-bar>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Recent Games -->
        <ion-card class="recent-games-card" *ngIf="recentGames.length > 0">
          <ion-card-header>
            <ion-card-title>Recently Added</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item *ngFor="let game of recentGames" [routerLink]="['/game', game.id]" lines="none">
                <ion-avatar slot="start">
                  <img [src]="game.coverImage || '/assets/images/game-placeholder.jpg'" />
                </ion-avatar>
                <ion-label>
                  <h3>{{ game.title }}</h3>
                  <p>{{ game.platform.name || 'Unknown' }} • {{ game.releaseYear }}</p>
                </ion-label>
                <ion-badge slot="end" [color]="getStatusColor(game.status)">
                  {{ getStatusLabel(game.status) }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Account Actions -->
        <ion-card class="actions-card">
          <ion-card-header>
            <ion-card-title>Account</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" fill="clear" (click)="logout()" color="danger">
              <ion-icon name="log-out-outline" slot="start"></ion-icon>
              Sign Out
            </ion-button>
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
        this.recentGames = games.slice(0, 5);
      });
    
    // Trigger initial load
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

  getStatusColor(status: GamePlayStatus): string {
    const colors: Record<GamePlayStatus, string> = {
      not_started: 'medium',
      playing: 'primary',
      completed: 'success',
      wishlist: 'tertiary',
    };
    return colors[status];
  }

  get totalHours(): number {
    return this.games.reduce((sum, g) => sum + (g.playtime || 0), 0);
  }

  get averageRating(): string {
    const ratedGames = this.games.filter(g => g.rating);
    if (ratedGames.length === 0) return '0.0';
    const avg = ratedGames.reduce((sum, g) => sum + (g.rating || 0), 0) / ratedGames.length;
    return avg.toFixed(1);
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
