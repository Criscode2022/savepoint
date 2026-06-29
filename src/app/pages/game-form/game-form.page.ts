import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonToggle, IonToast, IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { PLATFORMS, GENRES, Game, Platform } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { PlatformService } from '../../services/platform.service';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonToggle, IonToast, IonChip
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

                <ion-item class="form-item" lines="none">
                  <ion-label position="stacked">Title *</ion-label>
                  <ion-input
                    [(ngModel)]="game.title"
                    name="title"
                    required
                    placeholder="Enter game title"></ion-input>
                </ion-item>

                <ion-item class="form-item" lines="none">
                  <ion-label position="stacked">Description</ion-label>
                  <ion-textarea
                    [(ngModel)]="game.description"
                    name="description"
                    rows="4"
                    placeholder="Brief description of the game"></ion-textarea>
                </ion-item>

                <ion-item class="form-item" lines="none">
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

                <ion-item class="form-item" lines="none">
                  <ion-label position="stacked">Platform *</ion-label>
                  <ion-select
                    [(ngModel)]="selectedPlatformId"
                    name="platform"
                    required
                    interface="popover"
                    placeholder="Select platform">
                    <ion-select-option *ngFor="let platform of platforms" [value]="platform.id">
                      {{platform.name}}
                    </ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-item class="form-item" lines="none">
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

                <ion-item class="form-item" lines="none">
                  <ion-label position="stacked">Developer *</ion-label>
                  <ion-input
                    [(ngModel)]="developerName"
                    name="developerName"
                    required
                    placeholder="Developer company name"></ion-input>
                </ion-item>

                <ion-item class="form-item" lines="none">
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

                <ion-item class="form-item" lines="none">
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

                <ion-item class="form-item" lines="none">
                  <ion-label position="stacked">Playtime (hours)</ion-label>
                  <ion-input
                    [(ngModel)]="game.playtime"
                    name="playtime"
                    type="number"
                    min="0"
                    placeholder="25"></ion-input>
                </ion-item>

                <ion-item class="form-item toggle-item" lines="none">
                  <ion-label>Completed</ion-label>
                  <ion-toggle
                    [(ngModel)]="game.completed"
                    name="completed"></ion-toggle>
                </ion-item>
              </div>

              <!-- Notes -->
              <div class="form-section">
                <h3 class="section-title">Notes</h3>

                <ion-item class="form-item" lines="none">
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

      <!-- Fixed action buttons -->
      <div class="fixed-actions">
        <div class="actions-content">
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
      </div>

      <ion-toast
        [isOpen]="!!toastMessage"
        [message]="toastMessage"
        [color]="toastColor"
        duration="3000"
        position="top"
        (didDismiss)="toastMessage = ''">
      </ion-toast>
    </ion-content>
  `,
  styles: [],
})
export class GameFormPage implements OnInit {
  platforms: Platform[] = [];
  genres = GENRES;
  currentYear = new Date().getFullYear();
  
  isEdit = false;
  gameId: string | null = null;
  selectedPlatformId = '';
  
  game: Partial<Game> = {
    title: '',
    description: '',
    coverImage: '',
    releaseYear: this.currentYear,
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
    private gameService: GameService,
    private platformService: PlatformService
  ) {
    addIcons({ arrowBackOutline, saveOutline, imageOutline });
  }

  ngOnInit(): void {
    this.loadPlatforms();
    this.gameId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.gameId;
    
    if (this.isEdit && this.gameId) {
      this.loadGame(this.gameId);
    }
  }

  private loadPlatforms(): void {
    this.platformService.getPlatforms().subscribe({
      next: (platforms) => {
        this.platforms = platforms.length > 0 ? platforms : PLATFORMS;
        if (!this.selectedPlatformId && this.platforms[0]) {
          this.selectedPlatformId = this.platforms[0].id;
        }
      },
      error: () => {
        this.platforms = PLATFORMS;
        if (this.platforms[0]) {
          this.selectedPlatformId = this.platforms[0].id;
        }
      }
    });
  }

  loadGame(id: string): void {
    this.gameService.getGameById(id).subscribe({
      next: (game) => {
        if (game) {
          this.game = { ...game };
          this.developerName = game.developer?.name || '';
          this.selectedPlatformId = game.platformId || game.platform?.id || '';
          this.game.playtime = game.playtimeHours ?? game.playtime;
          this.game.director = game.director || '';
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
    if (!this.game.title || !this.selectedPlatformId || !this.game.releaseYear) {
      this.showToast('Please fill in all required fields', 'danger');
      return;
    }

    if (!this.developerName.trim()) {
      this.showToast('Please enter developer name', 'danger');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      title: this.game.title,
      description: this.game.description,
      coverImage: this.game.coverImage,
      platformId: this.selectedPlatformId,
      releaseYear: Number(this.game.releaseYear),
      developerName: this.developerName.trim(),
      directorName: this.game.director?.trim() || undefined,
      genre: this.game.genre || [],
      rating: this.game.rating != null ? Number(this.game.rating) : undefined,
      playtimeHours:
        this.game.playtime != null ? Number(this.game.playtime) : undefined,
      completed: this.game.completed || false,
      notes: this.game.notes
    };

    const request$ =
      this.isEdit && this.gameId
        ? this.gameService.updateGameFromForm(this.gameId, payload)
        : this.gameService.saveGameFromForm(payload);

    request$.subscribe({
      next: () => {
        this.showToast(
          this.isEdit ? 'Game updated successfully!' : 'Game added successfully!',
          'success'
        );
        setTimeout(() => {
          this.router.navigate(
            this.isEdit ? ['/game', this.gameId] : ['/home']
          );
        }, 1000);
      },
      error: (error) => {
        this.showToast(
          error.message ||
            (this.isEdit ? 'Failed to update game' : 'Failed to add game'),
          'danger'
        );
        this.isSubmitting = false;
      }
    });
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
