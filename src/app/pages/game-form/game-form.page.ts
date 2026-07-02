import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonToggle, IonToast, IonChip, IonSegment, IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { PLATFORMS, GENRES, Game, Platform, GamePlayStatus, GAME_STATUS_LABELS } from '../../models/game.model';
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
    IonTextarea, IonToast, IonChip, IonSegment, IonSegmentButton
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="form-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" icon="arrow-back-outline"></ion-back-button>
        </ion-buttons>
        
        <ion-title class="gaming-font">{{ pageTitle }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content" *ngIf="!isEdit || game">
      <div class="form-container">
        <ion-card class="form-card">
          <ion-card-header>
            <ion-card-title class="gaming-font">{{ formCardTitle }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form (ngSubmit)="onSubmit(gameForm)" #gameForm="ngForm">
              <!-- Basic Info -->
              <div class="form-section">
                <h3 class="section-title">Basic Information</h3>

                <div class="field-group">
                  <label class="field-label" for="game-title">Title *</label>
                  <ion-item class="form-item" lines="none" [class.field-invalid]="isInvalid(titleModel)">
                    <ion-input
                      id="game-title"
                      [(ngModel)]="game.title"
                      #titleModel="ngModel"
                      name="title"
                      required
                      placeholder="Enter game title"></ion-input>
                  </ion-item>
                  <span class="field-error" *ngIf="fieldError(titleModel) as err">{{ err }}</span>
                </div>

                <div class="field-group">
                  <label class="field-label" for="game-description">Description</label>
                  <ion-item class="form-item form-item--textarea" lines="none">
                    <ion-textarea
                      id="game-description"
                      [(ngModel)]="game.description"
                      name="description"
                      rows="4"
                      placeholder="Brief description of the game"></ion-textarea>
                  </ion-item>
                </div>

                <div class="field-group">
                  <label class="field-label" for="game-cover">Cover Image URL</label>
                  <ion-item class="form-item" lines="none">
                    <ion-input
                      id="game-cover"
                      [(ngModel)]="game.coverImage"
                      name="coverImage"
                      type="url"
                      placeholder="https://..."></ion-input>
                  </ion-item>
                </div>
              </div>

              <div class="form-section">
                <h3 class="section-title">Platform & Release</h3>

                <div class="field-group">
                  <label class="field-label" for="game-platform">Platform *</label>
                  <ion-item class="form-item" lines="none" [class.field-invalid]="isInvalid(platformModel)">
                    <ion-select
                      id="game-platform"
                      [(ngModel)]="selectedPlatformId"
                      #platformModel="ngModel"
                      name="platform"
                      required
                      interface="popover"
                      placeholder="Select platform">
                      <ion-select-option *ngFor="let platform of platforms" [value]="platform.id">
                        {{ platform.name }}
                      </ion-select-option>
                    </ion-select>
                  </ion-item>
                  <span class="field-error" *ngIf="fieldError(platformModel) as err">{{ err }}</span>
                </div>

                <div class="field-group">
                  <label class="field-label" for="game-year">Release Year *</label>
                  <ion-item class="form-item" lines="none" [class.field-invalid]="isInvalid(releaseYearModel)">
                    <ion-input
                      id="game-year"
                      [(ngModel)]="game.releaseYear"
                      #releaseYearModel="ngModel"
                      name="releaseYear"
                      type="number"
                      required
                      min="1970"
                      [max]="maxReleaseYear"
                      placeholder="2024"></ion-input>
                  </ion-item>
                  <span class="field-error" *ngIf="fieldError(releaseYearModel) as err">{{ err }}</span>
                </div>

                <div class="field-group" *ngIf="requiresReleaseDate()">
                  <label class="field-label" for="game-release-date">Release Date *</label>
                  <ion-item class="form-item" lines="none" [class.field-invalid]="isInvalid(releaseDateModel)">
                    <ion-input
                      id="game-release-date"
                      [(ngModel)]="game.releaseDate"
                      #releaseDateModel="ngModel"
                      name="releaseDate"
                      type="date"
                      [required]="requiresReleaseDate()"
                      placeholder="YYYY-MM-DD"></ion-input>
                  </ion-item>
                  <span class="field-error" *ngIf="fieldError(releaseDateModel) as err">{{ err }}</span>
                  <p class="field-hint" *ngIf="!fieldError(releaseDateModel)">Used for the wishlist countdown.</p>
                </div>
              </div>

              <div class="form-section">
                <h3 class="section-title">Developer Information</h3>

                <div class="field-group">
                  <label class="field-label" for="game-developer">Developer *</label>
                  <ion-item class="form-item" lines="none" [class.field-invalid]="isInvalid(developerModel)">
                    <ion-input
                      id="game-developer"
                      [(ngModel)]="developerName"
                      #developerModel="ngModel"
                      name="developerName"
                      required
                      placeholder="Developer company name"></ion-input>
                  </ion-item>
                  <span class="field-error" *ngIf="fieldError(developerModel) as err">{{ err }}</span>
                </div>

                <div class="field-group">
                  <label class="field-label" for="game-director">Director</label>
                  <ion-item class="form-item" lines="none">
                    <ion-input
                      id="game-director"
                      [(ngModel)]="game.director"
                      name="director"
                      placeholder="Game director name"></ion-input>
                  </ion-item>
                </div>
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
              <div class="form-section" *ngIf="!isWishlistMode">
                <h3 class="section-title">Your Stats</h3>

                <div class="field-group">
                  <label class="field-label" for="game-rating">Your Rating (0-10)</label>
                  <ion-item class="form-item" lines="none" [class.field-invalid]="isInvalid(ratingModel)">
                    <ion-input
                      id="game-rating"
                      [(ngModel)]="game.rating"
                      #ratingModel="ngModel"
                      name="rating"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      placeholder="8.5"></ion-input>
                  </ion-item>
                  <span class="field-error" *ngIf="fieldError(ratingModel) as err">{{ err }}</span>
                </div>

                <div class="field-group">
                  <label class="field-label" for="game-playtime">Playtime (hours)</label>
                  <ion-item class="form-item" lines="none">
                    <ion-input
                      id="game-playtime"
                      [(ngModel)]="game.playtime"
                      name="playtime"
                      type="number"
                      min="0"
                      placeholder="25"></ion-input>
                  </ion-item>
                </div>

                <div class="field-group">
                  <label class="field-label">Play Status</label>
                  <ion-segment
                    [(ngModel)]="game.status"
                    name="status"
                    class="status-segment"
                  >
                    <ion-segment-button value="not_started">
                      <ion-label>{{ statusLabels.not_started }}</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="playing">
                      <ion-label>{{ statusLabels.playing }}</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="completed">
                      <ion-label>{{ statusLabels.completed }}</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="wishlist">
                      <ion-label>{{ statusLabels.wishlist }}</ion-label>
                    </ion-segment-button>
                  </ion-segment>
                </div>
              </div>

              <div class="form-section">
                <h3 class="section-title">Notes</h3>

                <div class="field-group">
                  <ion-item class="form-item form-item--textarea" lines="none">
                    <ion-textarea
                      [(ngModel)]="game.notes"
                      name="notes"
                      rows="4"
                      placeholder="Any notes about the game..."></ion-textarea>
                  </ion-item>
                </div>
              </div>
            </form>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Fixed action buttons -->
      <div class="fixed-actions">
        <div class="actions-content">
          <ion-button
            fill="clear"
            routerLink="/home"
            class="cancel-btn">
            Cancel
          </ion-button>

          <ion-button
            (click)="onSubmit(gameForm)"
            [disabled]="isSubmitting || !canSubmit(gameForm)"
            class="submit-btn">
            <ion-icon name="save-outline" slot="start"></ion-icon>
            <span *ngIf="!isSubmitting">{{ submitLabel }}</span>
            <span *ngIf="isSubmitting">Saving...</span>
          </ion-button>
        </div>
      </div>

      <ion-toast
        [isOpen]="!!toastMessage"
        [message]="toastMessage"
        color="danger"
        duration="4000"
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
  statusLabels = GAME_STATUS_LABELS;
  currentYear = new Date().getFullYear();
  
  isEdit = false;
  isWishlistMode = false;
  gameId: string | null = null;
  selectedPlatformId = '';
  
  game: Partial<Game> = {
    title: '',
    description: '',
    coverImage: '',
    releaseYear: this.currentYear,
    releaseDate: '',
    director: '',
    genre: [],
    rating: undefined,
    playtime: undefined,
    status: 'not_started' as GamePlayStatus,
    notes: ''
  };
  
  developerName = '';
  isSubmitting = false;
  submitted = false;
  toastMessage = '';

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
    this.isWishlistMode =
      !this.isEdit && this.route.snapshot.data['wishlist'] === true;

    if (this.isWishlistMode) {
      this.game.status = 'wishlist';
      this.game.releaseYear = this.currentYear + 1;
    }
    
    if (this.isEdit && this.gameId) {
      this.loadGame(this.gameId);
    }
  }

  get pageTitle(): string {
    if (this.isEdit) return 'Edit Game';
    return this.isWishlistMode ? 'Add to Wishlist' : 'Add Game';
  }

  get formCardTitle(): string {
    if (this.isEdit) return 'Edit Game Information';
    return this.isWishlistMode ? 'Wishlist Game Information' : 'Game Information';
  }

  get submitLabel(): string {
    if (this.isEdit) return 'Save Changes';
    return this.isWishlistMode ? 'Add to Wishlist' : 'Save Game';
  }

  get maxReleaseYear(): number {
    return this.requiresReleaseDate() ? this.currentYear + 10 : this.currentYear;
  }

  requiresReleaseDate(): boolean {
    return this.isWishlistMode || this.game.status === 'wishlist';
  }

  releaseDateYearMismatch(): boolean {
    if (!this.requiresReleaseDate()) {
      return false;
    }

    if (!this.game.releaseDate || this.game.releaseYear == null) {
      return false;
    }

    const dateYear = new Date(`${this.game.releaseDate}T00:00:00`).getFullYear();
    return dateYear !== Number(this.game.releaseYear);
  }

  canSubmit(form: NgForm): boolean {
    if (!form.valid) {
      return false;
    }

    if (this.requiresReleaseDate() && !this.game.releaseDate) {
      return false;
    }

    return !this.releaseDateYearMismatch();
  }

  isInvalid(control: NgModel | null | undefined): boolean {
    if (!control) {
      return false;
    }

    const touched = control.touched || this.submitted;

    if (
      (control.name === 'releaseDate' || control.name === 'releaseYear') &&
      this.releaseDateYearMismatch() &&
      touched
    ) {
      return true;
    }

    return !!(control.invalid && touched);
  }

  fieldError(control: NgModel | null | undefined): string | null {
    if (!this.isInvalid(control) || !control) {
      return null;
    }

    if (
      (control.name === 'releaseDate' || control.name === 'releaseYear') &&
      this.releaseDateYearMismatch()
    ) {
      return 'Release date must use the same year as release year';
    }

    if (control.errors?.['required']) {
      return 'This field is required';
    }

    if (control.errors?.['min']) {
      if (control.name === 'releaseYear') {
        return 'Release year must be 1970 or later';
      }
      if (control.name === 'rating') {
        return 'Rating must be at least 0';
      }
    }

    if (control.errors?.['max']) {
      if (control.name === 'releaseYear') {
        return `Release year cannot be later than ${this.maxReleaseYear}`;
      }
      if (control.name === 'rating') {
        return 'Rating cannot be greater than 10';
      }
    }

    return 'Invalid value';
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

  onSubmit(form: NgForm): void {
    this.submitted = true;
    form.control.markAllAsTouched();

    if (!this.canSubmit(form)) {
      return;
    }

    this.isSubmitting = true;

    const payload = {
      title: this.game.title!,
      description: this.game.description,
      coverImage: this.game.coverImage,
      platformId: this.selectedPlatformId,
      releaseYear: Number(this.game.releaseYear),
      releaseDate: this.game.releaseDate || undefined,
      developerName: this.developerName.trim(),
      directorName: this.game.director?.trim() || undefined,
      genre: this.game.genre || [],
      rating: this.game.rating != null ? Number(this.game.rating) : undefined,
      playtimeHours:
        this.game.playtime != null ? Number(this.game.playtime) : undefined,
      status: this.isWishlistMode ? 'wishlist' : (this.game.status || 'not_started'),
      notes: this.game.notes
    };

    const request$ =
      this.isEdit && this.gameId
        ? this.gameService.updateGameFromForm(this.gameId, payload)
        : this.gameService.saveGameFromForm(payload);

    request$.subscribe({
      next: () => {
        this.router.navigate(
          this.isEdit ? ['/game', this.gameId] : ['/home']
        );
      },
      error: (error) => {
        this.showToast(
          error.message ||
            (this.isEdit ? 'Failed to update game' : 'Failed to add game'),
        );
        this.isSubmitting = false;
      }
    });
  }

  private showToast(message: string): void {
    this.toastMessage = message;
  }
}
