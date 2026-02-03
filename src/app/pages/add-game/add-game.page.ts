import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonToggle, IonToast
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { PLATFORMS, GENRES, Game, Platform, Company } from '../../models/game.model';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-add-game',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonToggle, IonToast
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="form-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" icon="arrow-back-outline"></ion-back-button>
        </ion-buttons>
        
        <ion-title class="gaming-font">Add Game</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content">
      <div class="form-container">
        <ion-card class="form-card">
          <ion-card-header>
            <ion-card-title class="gaming-font">Game Information</ion-card-title>
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

              <!-- Submit -->
              <div class="form-actions">
                <ion-button
                  type="submit"
                  [disabled]="isSubmitting || !gameForm.valid"
                  class="submit-btn">
                  <ion-icon name="save-outline" slot="start"></ion-icon>
                  <span *ngIf="!isSubmitting">Save Game</span>
                  <span *ngIf="isSubmitting">Saving... </span>
                </ion-button>
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

    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid rgba(139, 92, 246, 0.1);
    }

    .submit-btn {
      --background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      --background-hover: linear-gradient(135deg, #a78bfa 0%, #67e8f9 100%);
      --border-radius: 12px;
      --padding-start: 24px;
      --padding-end: 24px;
      height: 48px;
      font-weight: 600;
    }

    @media (max-width: 480px) {
      .form-container {
        padding: 1rem;
      }

      .form-actions {
        justify-content: stretch;
      }

      .submit-btn {
        flex: 1;
      }
    }
  `]
})
export class AddGamePage {
  platforms = PLATFORMS;
  genres = GENRES;
  currentYear = new Date().getFullYear();
  
  game: Partial<Game> = {
    title: '',
    description: '',
    coverImage: '',
    platform: undefined,
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
    private gameService: GameService,
    private router: Router
  ) {
    addIcons({ arrowBackOutline, saveOutline, imageOutline });
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

    const gameToAdd: Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      ...this.game as any,
      developer: { id: 'dev_' + Date.now(), name: this.developerName },
      releaseYear: Number(this.game.releaseYear),
      rating: this.game.rating ? Number(this.game.rating) : undefined,
      playtime: this.game.playtime ? Number(this.game.playtime) : undefined
    };

    this.gameService.addGame(gameToAdd).subscribe({
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

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
