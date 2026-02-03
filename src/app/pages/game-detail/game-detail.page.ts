import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonIcon, IonButton, IonCard, IonCardContent,
  IonBadge, IonChip, IonGrid, IonRow, IonCol, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, starOutline, timeOutline, calendarOutline,
  businessOutline, personOutline, gameControllerOutline,
  checkmarkCircleOutline, createOutline, trashOutline
} from 'ionicons/icons';
import { Game } from '../../models/game.model';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonTitle, IonIcon, IonButton, IonCard, IonCardContent,
    IonBadge, IonChip, IonGrid, IonRow, IonCol, IonToast
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="detail-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" icon="arrow-back-outline"></ion-back-button>
        </ion-buttons>
        
        <ion-title class="gaming-font">Game Details</ion-title>
        
        <ion-buttons slot="end" *ngIf="game">
          <ion-button [routerLink]="['/edit-game', game.id]">
            <ion-icon name="create-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="deleteGame()" color="danger">
            <ion-icon name="trash-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="detail-content" *ngIf="game">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-background" [style.background-image]="'url(' + (game.coverImage || '/assets/images/game-placeholder.jpg') + ')'">
        </div>
        <div class="hero-overlay"></div>
        
        <div class="hero-content">
          <div class="hero-image">
            <img 
              [src]="game.coverImage || '/assets/images/game-placeholder.jpg'" 
              [alt]="game.title"
            />
          </div>
          
          <div class="hero-info">
            <h1 class="game-title gaming-font">{{game.title}}</h1>
            
            <div class="hero-meta">
              <ion-badge [style.--background]="game.platform.color || '#8b5cf6'">
                {{game.platform.name}}
              </ion-badge>
              
              <span class="year">{{game.releaseYear}}</span>
              
              <span class="completed-badge" *ngIf="game.completed">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                Completed
              </span>
            </div>

            <div class="hero-actions">
              <ion-button 
                (click)="toggleCompleted()"
                [class.completed]="game.completed"
                class="action-btn primary">
                <ion-icon [name]="game.completed ? 'checkmark-circle-outline' : 'ellipse-outline'"></ion-icon>
                {{game.completed ? 'Mark Incomplete' : 'Mark Complete'}}
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <ion-grid>
          <ion-row>
            <!-- Main Info -->
            <ion-col size="12" sizeLg="8">
              <ion-card class="info-card">
                <ion-card-content>
                  <h2 class="section-title">About</h2>
                  <p class="description">{{game.description}}</p>

                  <div class="genres-section">
                    <h3>Genres</h3>
                    <div class="genre-chips">
                      <ion-chip *ngFor="let genre of game.genre" class="genre-chip">
                        {{genre}}
                      </ion-chip>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Sidebar Info -->
            <ion-col size="12" sizeLg="4">
              <ion-card class="stats-card">
                <ion-card-content>
                  <h2 class="section-title">Details</h2>

                  <div class="detail-item" *ngIf="game.developer">
                    <ion-icon name="business-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Developer</label>
                      <span>{{game.developer.name}}</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.director">
                    <ion-icon name="person-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Director</label>
                      <span>{{game.director}}</span>
                    </div>
                  </div>

                  <div class="detail-item">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Release Year</label>
                      <span>{{game.releaseYear}}</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.rating">
                    <ion-icon name="star-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Your Rating</label>
                      <span class="rating">{{game.rating}}/10</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.playtime">
                    <ion-icon name="time-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Playtime</label>
                      <span>{{game.playtime}} hours</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.purchaseDate">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Purchased</label>
                      <span>{{game.purchaseDate | date:'mediumDate'}}</span>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>

              <ion-card class="notes-card" *ngIf="game.notes">
                <ion-card-content>
                  <h2 class="section-title">Notes</h2>
                  <p class="notes-text">{{game.notes}}</p>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
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
    .detail-toolbar {
      --background: rgba(15, 15, 26, 0.95);
      --border-color: rgba(139, 92, 246, 0.2);
      backdrop-filter: blur(20px);
    }

    .detail-content {
      --background: var(--color-bg-primary);
    }

    /* Hero Section */
    .hero-section {
      position: relative;
      min-height: 400px;
      display: flex;
      align-items: flex-end;
      padding: 2rem;
    }

    .hero-background {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: blur(20px);
      opacity: 0.3;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(15, 15, 26, 0) 0%,
        rgba(15, 15, 26, 0.5) 50%,
        rgba(15, 15, 26, 1) 100%
      );
    }

    .hero-content {
      position: relative;
      display: flex;
      gap: 2rem;
      align-items: flex-end;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
    }

    .hero-image {
      flex-shrink: 0;
      width: 200px;
      height: 280px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .hero-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-info {
      flex: 1;
      padding-bottom: 1rem;
    }

    .game-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 1rem;
      line-height: 1.2;
    }

    .hero-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .hero-meta ion-badge {
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 6px;
      --padding-bottom: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .year {
      color: #94a3b8;
      font-size: 1rem;
    }

    .completed-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #22c55e;
      font-weight: 500;
    }

    .completed-badge ion-icon {
      font-size: 20px;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
    }

    .action-btn {
      --border-radius: 12px;
      --padding-start: 20px;
      --padding-end: 20px;
      height: 48px;
      font-weight: 600;
    }

    .action-btn.primary {
      --background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
    }

    .action-btn.completed {
      --background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    }

    /* Content Grid */
    .content-grid {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .info-card, .stats-card, .notes-card {
      background: rgba(22, 22, 42, 0.8);
      border-radius: 16px;
      border: 1px solid rgba(139, 92, 246, 0.1);
      margin: 0;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 1rem;
    }

    .description {
      color: #94a3b8;
      line-height: 1.8;
      font-size: 1rem;
      margin: 0 0 1.5rem;
    }

    .genres-section h3 {
      font-size: 1rem;
      color: #64748b;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .genre-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .genre-chip {
      --background: rgba(139, 92, 246, 0.15);
      --color: #a78bfa;
      margin: 0;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid rgba(139, 92, 246, 0.1);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item ion-icon {
      color: #8b5cf6;
      font-size: 24px;
      margin-top: 2px;
    }

    .detail-info {
      display: flex;
      flex-direction: column;
    }

    .detail-info label {
      color: #64748b;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .detail-info span {
      color: #f8fafc;
      font-size: 1rem;
      font-weight: 500;
    }

    .detail-info .rating {
      color: #f59e0b;
    }

    .notes-text {
      color: #94a3b8;
      line-height: 1.6;
      white-space: pre-wrap;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero-section {
        min-height: auto;
        padding: 1rem;
      }

      .hero-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .hero-image {
        width: 150px;
        height: 210px;
      }

      .game-title {
        font-size: 1.75rem;
      }

      .hero-meta {
        justify-content: center;
        flex-wrap: wrap;
      }

      .hero-actions {
        justify-content: center;
      }

      .content-grid {
        padding: 1rem;
      }
    }
  `]
})
export class GameDetailPage implements OnInit {
  game: Game | null = null;
  toastMessage = '';
  toastColor: 'success' | 'danger' = 'success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService
  ) {
    addIcons({
      arrowBackOutline, starOutline, timeOutline, calendarOutline,
      businessOutline, personOutline, gameControllerOutline,
      checkmarkCircleOutline, createOutline, trashOutline
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGame(gameId);
    }
  }

  loadGame(id: string): void {
    this.gameService.getGameById(id).subscribe({
      next: (game) => {
        if (game) {
          this.game = game;
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.router.navigate(['/home']);
      }
    });
  }

  toggleCompleted(): void {
    if (!this.game) return;

    this.gameService.toggleCompleted(this.game.id).subscribe({
      next: () => {
        if (this.game) {
          this.game.completed = !this.game.completed;
        }
        this.showToast(this.game?.completed ? 'Marked as completed' : 'Marked as incomplete', 'success');
      },
      error: () => {
        this.showToast('Failed to update status', 'danger');
      }
    });
  }

  deleteGame(): void {
    if (!this.game) return;

    if (confirm('Are you sure you want to delete this game?')) {
      this.gameService.deleteGame(this.game.id).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: () => {
          this.showToast('Failed to delete game', 'danger');
        }
      });
    }
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
