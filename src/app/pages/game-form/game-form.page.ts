import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonToggle, IonToast, IonChip, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { PLATFORMS, GENRES, Game } from '../../models/game.model';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonToggle, IonToast, IonChip, IonFooter
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="form-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" icon="arrow-back-outline"></ion-back-button>
        </ion-buttons>
        
        <ion-title class="gaming-font">{{ isEdit ? 'Edit Game' : 'Add Game' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content" *ngIf="!isEdit || game">
      <div class="form-container">
        <ion-card class="form-card">
          <ion-card-header>
            <ion-card-title class="gaming-font">{{ isEdit ? 'Edit Game Information' : 'Game Information' }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form (ngSubmit)="onSubmit()" #gameForm="ngForm">
              <!-- Basic Info -->
              <div class="form-section">
                <h3 class="section-title">Basic Information</h3>

                <ion-item class="form-item">
                  <ion-label position="stacked">Title *</ion-label>
                  <ion-input
                    [(ngModel)]="game.title"
                    name="title"
                    required
                    placeholder="Enter game title"></ion-input>
                </ion-item>

                <ion-item class="form-item">
                  <ion-label position="stacked">Description</ion-label>
                  <ion-textarea
                    [(ngModel)]="game.description"
                    name="description"
                    rows="4"
                    placeholder="Brief description of the game"></ion-textarea>
                </ion-item>

                <ion-item class="form-item">
                  <ion-label position="stacked">Cover Image URL</ion-label>
                  <ion-input
                    [(ngModel)]="game.coverImage"
                    name="coverImage"
                    type="url"
                    placeholder="https://..."></ion-input>
                </ion-item>
              </div>

              <!-- Platform & Release -->
              <div class="form-section">
                <h3 class="section-title">Platform & Release</h3>

                <ion-item class="form-item">
                  <ion-label position="stacked">Platform *</ion-label>
                  <ion-select
                    [(ngModel)]="game.platform"
                    name="platform"
                    required
                    interface="popover"
                    placeholder="Select platform">
                    <ion-select-option *ngFor="let platform of platforms" [value]="platform">
                      {{platform.name}}
                    </ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item class="form-item">
                  <ion-label position="stacked">Release Year *</ion-label>
                  <ion-input
                    [(ngModel)]="game.releaseYear"
                    name="releaseYear"
                    type="number"
                    required
                    min="1970"
                    [max]="currentYear"
                    placeholder="2024"></ion-input>
                </ion-item>
              </div>

              <!-- Developer Info -->
              <div class="form-section">
                <h3 class="section-title">Developer Information</h3>

                <ion-item class="form-item">
                  <ion-label position="stacked">Developer *</ion-label>
                  <ion-input
                    [(ngModel)]="developerName"
                    name="developerName"
                    required
                    placeholder="Developer company name"></ion-input>
                </ion-item>

                <ion-item class="form-item">
                  <ion-label position="stacked">Director</ion-label>
                  <ion-input
                    [(ngModel)]="game.director"
                    name="director"
                    placeholder="Game director name"></ion-input>
                </ion-item>
              </div>

              <!-- Genres -->
              <div class="form-section">
                <h3 class="section-title">Genres</h3>

                <div class="genre-selector">
                  <ion-chip
                    *ngFor="let genre of genres"
                    [class.selected]="isGenreSelected(genre)"
                    (click)="toggleGenre(genre)">
                    {{genre}}
                  </ion-chip>
                </div>
              </div>

              <!-- Personal Stats -->
              <div class="form-section">
                <h3 class="section-title">Your Stats</h3>

                <ion-item class="form-item">
                  <ion-label position="stacked">Your Rating (0-10)</ion-label>
                  <ion-input
                    [(ngModel)]="game.rating"
                    name="rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="8.5"></ion-input>
                </ion-item>

                <ion-item class="form-item">
                  <ion-label position="stacked">Playtime (hours)</ion-label>
                  <ion-input
                    [(ngModel)]="game.playtime"
                    name="playtime"
                    type="number"
                    min="0"
                    placeholder="25"></ion-input>
                </ion-item>

                <ion-item class="form-item toggle-item">
                  <ion-label>Completed</ion-label>
                  <ion-toggle
                    [(ngModel)]="game.completed"
                    name="completed"></ion-toggle>
                </ion-item>
              </div>

              <!-- Notes -->
              <div class="form-section">
                <h3 class="section-title">Notes</h3>

                <ion-item class="form-item">
                  <ion-textarea
                    [(ngModel)]="game.notes"
                    name="notes"
                    rows="4"
                    placeholder="Any notes about the game..."></ion-textarea>
                </ion-item>
              </div>
            </form>
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

    <ion-footer class="ion-no-border form-footer">
      <div class="footer-content">
        <ion-button
          fill="outline"
          routerLink="/home"
          class="cancel-btn">
          Cancel
        </ion-button>

        <ion-button
          (click)="onSubmit()"
          [disabled]="isSubmitting"
          class="submit-btn">
          <ion-icon name="save-outline" slot="start"></ion-icon>
          <span *ngIf="!isSubmitting">{{ isEdit ? 'Save Changes' : 'Save Game' }}</span>
          <span *ngIf="isSubmitting">Saving...</span>
        </ion-button>
      </div>
    </ion-footer>
  `,
  styles: [`
    .form-toolbar {
      --background: rgba(15, 15, 26, 0.95);
      --border-color: rgba(139, 92, 246, 0.2);
      backdrop-filter: blur(20px);
    }

    .form-content {
      --background: var(--color-bg-primary);
    }

    .form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .form-card {
      background: rgba(22, 22, 42, 0.8);
      border-radius: 16px;
      border: 1px solid rgba(139, 92, 246, 0.1);
    }

    ion-card-header {
      padding: 1.5rem 1.5rem 0;
    }

    ion-card-title {
      font-size: 1.5rem;
      color: #f8fafc;
    }

    ion-card-content {
      padding: 1.5rem;
    }

    .form-section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #8b5cf6;
      margin: 0 0 1rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-item {
      --background: rgba(30, 30, 54, 0.5);
      --border-color: rgba(139, 92, 246, 0.2);
      --border-radius: 12px;
      margin-bottom: 1rem;
      border-radius: 12px;
    }

    .form-item:focus-within {
      --border-color: #8b5cf6;
    }

    ion-label {
      color: #94a3b8 !important;
      font-size: 0.875rem !important;
      margin-bottom: 0.5rem;
    }

    ion-input, ion-textarea, ion-select {
      --color: #f8fafc;
      --placeholder-color: #475569;
    }

    .toggle-item {
      --padding-start: 16px;
      --padding-end: 16px;
    }

    .toggle-item ion-label {
      margin-bottom: 0;
    }

    ion-toggle {
      --background: rgba(139, 92, 246, 0.2);
      --background-checked: #8b5cf6;
      --handle-background: #f8fafc;
      --handle-background-checked: #f8fafc;
    }

    .genre-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .genre-selector ion-chip {
      --background: rgba(30, 30, 54, 0.8);
      --color: #94a3b8;
      margin: 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .genre-selector ion-chip.selected {
      --background: rgba(139, 92, 246, 0.3);
      --color: #f8fafc;
      border: 1px solid #8b5cf6;
    }

    .form-footer {
      --background: rgba(15, 15, 26, 0.98);
      border-top: 1px solid rgba(139, 92, 246, 0.2);
    }

    .footer-content {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 0.75rem 1rem;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
      max-width: 800px;
      margin: 0 auto;
    }

    .cancel-btn {
      --border-color: rgba(139, 92, 246, 0.3);
      --color: #94a3b8;
      --border-radius: 12px;
      height: 48px;
      min-width: 100px;
    }

    .submit-btn {
      --background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      --background-hover: linear-gradient(135deg, #a78bfa 0%, #67e8f9 100%);
      --border-radius: 12px;
      --padding-start: 24px;
      --padding-end: 24px;
      height: 48px;
      font-weight: 600;
      min-width: 140px;
    }

    @media (max-width: 480px) {
      .form-container {
        padding: 1rem;
      }

      .footer-content {
        padding: 0.5rem 0.75rem;
        padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
      }

      .cancel-btn, .submit-btn {
        flex: 1;
        min-width: 0;
      }
    }
  `]
})
export class GameFormPage implements OnInit {
  platforms = PLATFORMS;
  genres = GENRES;
  currentYear = new Date().getFullYear();
  
  isEdit = false;
  gameId: string | null = null;
  
  game: Partial<Game> = {
    title: '',
    description: '',
    coverImage: '',
    platform: PLATFORMS[0],
    releaseYear: this.currentYear,
    developer: undefined,
    director: '',
    genre: [],
    rating: undefined,
    playtime: undefined,
    completed: false,
    notes: ''
  };
  
  developerName = '';
  isSubmitting = false;
  toastMessage = '';
  toastColor: 'success' | 'danger' = 'success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService
  ) {
    addIcons({ arrowBackOutline, saveOutline, imageOutline });
  }

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.gameId;
    
    if (this.isEdit && this.gameId) {
      this.loadGame(this.gameId);
    }
  }

  loadGame(id: string): void {
    this.gameService.getGameById(id).subscribe({
      next: (game) => {
        if (game) {
          this.game = { ...game };
          this.developerName = game.developer?.name || '';
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.router.navigate(['/home']);
      }
    });
  }

  isGenreSelected(genre: string): boolean {
    return this.game.genre?.includes(genre) || false;
  }

  toggleGenre(genre: string): void {
    if (!this.game.genre) {
      this.game.genre = [];
    }
    const index = this.game.genre.indexOf(genre);
    if (index > -1) {
      this.game.genre.splice(index, 1);
    } else {
      this.game.genre.push(genre);
    }
  }

  onSubmit(): void {
    if (!this.game.title || !this.game.platform || !this.game.releaseYear) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    if (!this.developerName) {
      this.showToast('Please enter developer name', 'danger');
      return;
    }

    this.isSubmitting = true;

    const gameData: any = {
      title: this.game.title,
      description: this.game.description,
      coverImage: this.game.coverImage,
      platform: this.game.platform,
      releaseYear: Number(this.game.releaseYear),
      developer: { id: 'dev_' + Date.now(), name: this.developerName },
      director: this.game.director,
      genre: this.game.genre || [],
      rating: this.game.rating ? Number(this.game.rating) : undefined,
      playtime: this.game.playtime ? Number(this.game.playtime) : undefined,
      completed: this.game.completed || false,
      notes: this.game.notes
    };

    if (this.isEdit && this.gameId) {
      this.gameService.updateGame(this.gameId, gameData).subscribe({
        next: () => {
          this.showToast('Game updated successfully!', 'success');
          setTimeout(() => {
            this.router.navigate(['/game', this.gameId]);
          }, 1000);
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to update game', 'danger');
          this.isSubmitting = false;
        }
      });
    } else {
      this.gameService.addGame(gameData).subscribe({
        next: () => {
          this.showToast('Game added successfully!', 'success');
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        },
        error: (error) => {
          this.showToast(error.message || 'Failed to add game', 'danger');
          this.isSubmitting = false;
        }
      });
    }
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
