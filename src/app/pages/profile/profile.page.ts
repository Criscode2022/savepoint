import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
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
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonAvatar, IonItem, IonLabel, IonGrid, IonRow, IonCol, IonBadge,
    IonProgressBar, IonList, IonToast
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="profile-toolbar">
        <ion-buttons slot="start">
          <ion-button routerLink="/home">
            <ion-icon name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        
        <ion-title class="gaming-font">Profile</ion-title>
        
        <ion-buttons slot="end">
          <ion-button (click)="logout()">
            <ion-icon name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
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
  styles: [`
    .profile-toolbar {
      --color: #94a3b8;
    }

    .profile-container {
      max-width: 1200px;
    }

    /* Profile Header */
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 2rem;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
      border-radius: 20px;
      border: 1px solid rgba(139, 92, 246, 0.2);
      margin-bottom: 1.5rem;
    }

    .profile-avatar {
      width: 100px;
      height: 100px;
      border: 4px solid rgba(139, 92, 246, 0.3);
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
    }

    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .profile-info {
      flex: 1;
    }

    .profile-name {
      font-size: 2rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.5rem;
    }

    .profile-email {
      color: #94a3b8;
      margin: 0 0 1rem;
    }

    .profile-badges {
      display: flex;
      gap: 0.5rem;
    }

    .level-badge {
      --background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 6px;
      --padding-bottom: 6px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .level-badge ion-icon {
      margin-right: 0.25rem;
    }

    /* Stats Grid */
    .stats-grid {
      margin-bottom: 1.5rem;
    }

    .stat-card {
      text-align: center;
      margin: 0;
    }

    .stat-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
    }

    .stat-icon-wrapper.games {
      background: rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
    }

    .stat-icon-wrapper.completed {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .stat-icon-wrapper.hours {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .stat-icon-wrapper.rating {
      background: rgba(236, 72, 153, 0.2);
      color: #ec4899;
    }

    .stat-icon-wrapper ion-icon {
      font-size: 24px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #64748b;
    }

    /* Progress Card */
    .progress-item {
      padding: 1rem 0;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      color: #94a3b8;
    }

    .progress-value {
      color: #f8fafc;
      font-weight: 600;
    }

    ion-progress-bar {
      --background: rgba(139, 92, 246, 0.2);
      --progress-background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      height: 8px;
      border-radius: 4px;
    }

    /* Recent Games */
    ion-list {
      background: transparent;
      padding: 0;
    }

    .recent-games-card ion-item {
      cursor: pointer;
    }

    .recent-games-card ion-item:last-child {
      margin-bottom: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        text-align: center;
        padding: 1.5rem;
      }

      .profile-avatar {
        width: 80px;
        height: 80px;
      }

      .profile-name {
        font-size: 1.5rem;
      }

      .profile-badges {
        justify-content: center;
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }
  `]
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
