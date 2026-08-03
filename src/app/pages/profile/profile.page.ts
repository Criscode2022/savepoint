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
  templateUrl: './profile.page.html',
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
