import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonBackButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonToast, IonChip, IonSegment, IonSegmentButton, IonSpinner, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, saveOutline, imageOutline, closeOutline,
  searchOutline, cloudDownloadOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
  of,
  catchError,
} from 'rxjs';
import { PLATFORMS, GENRES, Game, Platform, GamePlayStatus, GAME_STATUS_LABELS } from '../../models/game.model';
import { normalizeTags } from '../../shared/utils/tag.utils';
import { GameService } from '../../services/game.service';
import { PlatformService } from '../../services/platform.service';
import { RawgService, RawgGameSummary } from '../../services/rawg.service';
import { GameRatingComponent } from '../../components/game-rating/game-rating.component';
import { GameCoverUploadComponent } from '../../components/game-cover-upload/game-cover-upload.component';
import {
  confirmResetPlayHistory,
  statusChangeClearsPlayHistory,
} from '../../shared/utils/game-status.utils';
import { canRateGame, formatRatingLabel } from '../../shared/utils/rating.utils';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonHeader, IonToolbar, IonBackButton,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonToast, IonChip, IonSegment, IonSegmentButton, IonSpinner,
    GameRatingComponent, GameCoverUploadComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <div class="header-inner">
          <div class="header-brand">
            <ion-back-button
              class="header-back-btn"
              defaultHref="/home"
              text=""
              icon="arrow-back-outline"
            ></ion-back-button>
            <h1 class="header-title">{{ pageTitle }}</h1>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content">
      <div class="form-loading" *ngIf="isEdit && isLoadingGame">
        <ion-spinner name="crescent" aria-label="Loading game"></ion-spinner>
      </div>

      <div class="form-container" *ngIf="!isEdit || !isLoadingGame">
        <ion-card class="form-card">
          <ion-card-header>
            <ion-card-title>{{ formCardTitle }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form (ngSubmit)="onSubmit(gameForm)" #gameForm="ngForm">
              <!-- RAWG auto-fill -->
              <div class="form-section rawg-import" *ngIf="!isEdit">
                <h3 class="section-title">
                  <ion-icon name="cloud-download-outline" aria-hidden="true"></ion-icon>
                  Search RAWG (auto-fill)
                </h3>
                <p class="field-help" *ngIf="rawgConfigured">
                  Type a game name, pick a result, and we’ll fill title, cover, year, genres, tags, and developer.
                </p>
                <p class="field-help rawg-import__missing" *ngIf="!rawgConfigured">
                  Add <code>RAWG_API_KEY</code> to <code>.env</code> and restart the app to enable search.
                  Get a free key at
                  <a href="https://rawg.io/apidocs" target="_blank" rel="noopener">rawg.io/apidocs</a>.
                </p>

                <div class="field-group" *ngIf="rawgConfigured">
                  <label class="field-label" for="rawg-search">Find a game</label>
                  <ion-item class="form-item" lines="none">
                    <ion-icon name="search-outline" slot="start" aria-hidden="true"></ion-icon>
                    <ion-input
                      id="rawg-search"
                      [(ngModel)]="rawgQuery"
                      name="rawgQuery"
                      placeholder="e.g. Hades, Zelda, Elden Ring…"
                      (ionInput)="onRawgQuery($event)"
                      clearInput="true"
                      enterkeyhint="search"
                    ></ion-input>
                    <ion-spinner *ngIf="rawgSearching" name="crescent" slot="end"></ion-spinner>
                  </ion-item>
                  <p class="field-error" *ngIf="rawgError">{{ rawgError }}</p>
                  <p class="field-help" *ngIf="rawgImportedTitle">
                    <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
                    Imported from RAWG: <strong>{{ rawgImportedTitle }}</strong>
                  </p>
                </div>

                <ul class="rawg-results" *ngIf="rawgResults.length" role="listbox" aria-label="RAWG search results">
                  <li *ngFor="let hit of rawgResults">
                    <button
                      type="button"
                      class="rawg-result"
                      (click)="applyRawgGame(hit)"
                      [disabled]="rawgImportingId === hit.id"
                    >
                      <img
                        *ngIf="hit.backgroundImage"
                        [src]="hit.backgroundImage"
                        [alt]="hit.name"
                        class="rawg-result__cover"
                        loading="lazy"
                      />
                      <span class="rawg-result__cover rawg-result__cover--empty" *ngIf="!hit.backgroundImage" aria-hidden="true"></span>
                      <span class="rawg-result__meta">
                        <span class="rawg-result__title">{{ hit.name }}</span>
                        <span class="rawg-result__sub">
                          <span *ngIf="hit.released">{{ hit.released | slice:0:4 }}</span>
                          <span *ngIf="hit.genres?.length"> · {{ hit.genres.slice(0, 3).join(', ') }}</span>
                        </span>
                      </span>
                      <ion-spinner *ngIf="rawgImportingId === hit.id" name="crescent"></ion-spinner>
                      <span class="rawg-result__action" *ngIf="rawgImportingId !== hit.id">Use</span>
                    </button>
                  </li>
                </ul>
                <p class="field-help" *ngIf="rawgConfigured && rawgSearched && !rawgSearching && !rawgResults.length && rawgQuery.trim()">
                  No RAWG matches. Try a shorter title or add details manually below.
                </p>
              </div>

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
                  <label class="field-label">Cover Image</label>
                  <app-game-cover-upload
                    [title]="game.title || 'Game cover'"
                    [coverImage]="game.coverImage"
                    (coverImageChange)="onCoverImageChange($event)"
                  ></app-game-cover-upload>
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

                <div class="field-group" *ngIf="canShowRating()">
                  <div class="rating-field__header">
                    <label class="field-label">Your Rating</label>
                    <span
                      class="rating-field__score"
                      [class.rating-field__score--preview]="ratingPreview != null"
                      [class.rating-field__score--empty]="game.rating == null && ratingPreview == null"
                    >
                      {{ getRatingDisplay() }}
                    </span>
                  </div>
                  <app-game-rating
                    [rating]="game.rating ?? null"
                    (ratingChange)="onRatingChange($event)"
                    (previewChange)="ratingPreview = $event"
                    size="lg"
                    [showClear]="true"
                    [showValue]="false"
                  />
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
                    <ion-segment-button value="paused">
                      <ion-label>{{ statusLabels.paused }}</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="completed">
                      <ion-label>{{ statusLabels.completed }}</ion-label>
                    </ion-segment-button>
                    <ion-segment-button value="wishlist" *ngIf="canSelectWishlistStatus()">
                      <ion-label>{{ statusLabels.wishlist }}</ion-label>
                    </ion-segment-button>
                  </ion-segment>
                </div>
              </div>

              <div class="form-section">
                <h3 class="section-title">Tags</h3>
                <p class="field-help">Personal labels like “coop”, “vr”, “platinum-hunt”.</p>
                <div class="field-group tag-entry">
                  <ion-item class="form-item" lines="none">
                    <ion-input
                      [(ngModel)]="tagDraft"
                      name="tagDraft"
                      placeholder="Add a tag and press Enter"
                      (keyup.enter)="addTagFromDraft(); $event.preventDefault()"
                    ></ion-input>
                  </ion-item>
                  <button type="button" class="tag-add-btn" (click)="addTagFromDraft()">Add</button>
                </div>
                <div class="genre-chips tag-chips" *ngIf="game.tags?.length">
                  <ion-chip
                    *ngFor="let tag of game.tags"
                    class="genre-chip selected"
                    (click)="removeTag(tag)"
                  >
                    {{ tag }}
                    <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
                  </ion-chip>
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

      <div class="fixed-actions" *ngIf="!isEdit || !isLoadingGame">
        <div class="actions-content">
          <ion-button
            fill="clear"
            routerLink="/home"
            class="cancel-btn">
            Cancel
          </ion-button>

          <ion-button
            (click)="submitForm()"
            [disabled]="isSubmitting || !canSubmitForm()"
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
  styles: [`
    .rawg-import .section-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .rawg-import__missing code {
      font-size: 0.85em;
    }
    .rawg-results {
      list-style: none;
      margin: 0.75rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 22rem;
      overflow-y: auto;
    }
    .rawg-result {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--app-border, rgba(255,255,255,0.08));
      border-radius: 0.65rem;
      background: var(--app-surface-2, rgba(0,0,0,0.2));
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    .rawg-result:hover:not(:disabled) {
      border-color: var(--ion-color-primary, #6c8cff);
    }
    .rawg-result:disabled {
      opacity: 0.7;
      cursor: wait;
    }
    .rawg-result__cover {
      width: 3.25rem;
      height: 3.25rem;
      object-fit: cover;
      border-radius: 0.4rem;
      flex-shrink: 0;
      background: rgba(0,0,0,0.25);
    }
    .rawg-result__cover--empty {
      display: block;
    }
    .rawg-result__meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .rawg-result__title {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .rawg-result__sub {
      font-size: 0.78rem;
      opacity: 0.7;
    }
    .rawg-result__action {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ion-color-primary, #6c8cff);
      flex-shrink: 0;
    }
  `],
})
export class GameFormPage implements OnInit, OnDestroy {
  @ViewChild('gameForm') gameFormRef?: NgForm;

  platforms: Platform[] = [];
  genres = GENRES;
  statusLabels = GAME_STATUS_LABELS;
  currentYear = new Date().getFullYear();
  
  isEdit = false;
  isWishlistMode = false;
  isLoadingGame = false;
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
    tags: [],
    rating: undefined,
    playtime: undefined,
    status: 'not_started' as GamePlayStatus,
    notes: ''
  };

  tagDraft = '';
  
  developerName = '';
  isSubmitting = false;
  submitted = false;
  toastMessage = '';
  private originalStatus: GamePlayStatus = 'not_started';
  ratingPreview: number | null = null;

  // RAWG search / import
  rawgQuery = '';
  rawgResults: RawgGameSummary[] = [];
  rawgSearching = false;
  rawgSearched = false;
  rawgError = '';
  rawgImportingId: number | null = null;
  rawgImportedTitle = '';
  private readonly rawgQuery$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  get rawgConfigured(): boolean {
    return this.rawg.isConfigured;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private platformService: PlatformService,
    private alertController: AlertController,
    private rawg: RawgService,
  ) {
    addIcons({
      arrowBackOutline,
      saveOutline,
      imageOutline,
      closeOutline,
      searchOutline,
      cloudDownloadOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    this.loadPlatforms();
    this.setupRawgSearch();
    this.gameId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.gameId;
    this.isWishlistMode =
      !this.isEdit && this.route.snapshot.data['wishlist'] === true;

    if (this.isWishlistMode) {
      this.game.status = 'wishlist';
      this.game.releaseYear = this.currentYear + 1;
    }
    
    if (this.isEdit && this.gameId) {
      this.isLoadingGame = true;
      this.loadGame(this.gameId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRawgSearch(): void {
    this.rawgQuery$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((q) => {
          const query = q.trim();
          if (!query || query.length < 2 || !this.rawg.isConfigured) {
            this.rawgSearching = false;
            this.rawgSearched = !!query;
            this.rawgResults = [];
            return of([] as RawgGameSummary[]);
          }
          this.rawgSearching = true;
          this.rawgError = '';
          return this.rawg.searchGames(query, 10).pipe(
            catchError(() => {
              this.rawgError = 'RAWG search failed. Check your API key or try again.';
              return of([] as RawgGameSummary[]);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.rawgResults = results;
        this.rawgSearching = false;
        this.rawgSearched = true;
      });
  }

  onRawgQuery(event: CustomEvent | Event): void {
    const value =
      (event as CustomEvent)?.detail?.value ??
      (event.target as HTMLInputElement | null)?.value ??
      this.rawgQuery;
    this.rawgQuery = String(value ?? '');
    this.rawgQuery$.next(this.rawgQuery);
  }

  applyRawgGame(hit: RawgGameSummary): void {
    if (this.rawgImportingId != null) return;
    this.rawgImportingId = hit.id;
    this.rawgError = '';

    this.rawg
      .importGame(hit.id, hit)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (imported) => {
          this.rawgImportingId = null;
          if (!imported) {
            this.rawgError = 'Could not load full game details from RAWG.';
            return;
          }

          this.game.title = imported.title;
          if (imported.description) this.game.description = imported.description;
          if (imported.coverImage) this.game.coverImage = imported.coverImage;
          if (imported.releaseYear != null) this.game.releaseYear = imported.releaseYear;
          if (imported.releaseDate) {
            this.game.releaseDate = imported.releaseDate.slice(0, 10);
          }
          if (imported.developerName) this.developerName = imported.developerName;

          // Merge RAWG genres into known library genres when possible
          const genreSet = new Set(this.game.genre ?? []);
          for (const g of imported.genres) {
            const match =
              this.genres.find((x) => x.toLowerCase() === g.toLowerCase()) ?? g;
            genreSet.add(match);
          }
          this.game.genre = [...genreSet];

          this.game.tags = normalizeTags([
            ...(this.game.tags ?? []),
            ...imported.tags,
          ]);

          const platformId = this.rawg.matchPlatformId(
            imported.platforms,
            this.platforms,
          );
          if (platformId) {
            this.selectedPlatformId = platformId;
          }

          if (
            imported.playtimeHours != null &&
            (this.game.playtime == null || this.game.playtime === 0)
          ) {
            this.game.playtime = imported.playtimeHours;
          }

          // Keep a reference note without overwriting user notes entirely
          const noteLine = `Imported from RAWG · ${imported.rawgUrl}`;
          if (!this.game.notes?.includes('rawg.io')) {
            this.game.notes = this.game.notes
              ? `${this.game.notes.trim()}\n\n${noteLine}`
              : noteLine;
          }

          this.rawgImportedTitle = imported.title;
          this.rawgResults = [];
          this.rawgQuery = imported.title;
        },
        error: () => {
          this.rawgImportingId = null;
          this.rawgError = 'Could not import that game. Try another result.';
        },
      });
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

  canSelectWishlistStatus(): boolean {
    return this.isEdit && this.originalStatus === 'wishlist';
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
        this.isLoadingGame = false;
        if (game) {
          this.game = { ...game };
          this.originalStatus = game.status;
          this.developerName = game.developer?.name || '';
          this.selectedPlatformId = game.platformId || game.platform?.id || '';
          this.game.playtime = game.playtimeHours ?? game.playtime;
          this.game.director = game.director || '';
          this.game.tags = game.tags ?? [];
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.isLoadingGame = false;
        this.router.navigate(['/home']);
      }
    });
  }

  isGenreSelected(genre: string): boolean {
    return this.game.genre?.includes(genre) || false;
  }

  onCoverImageChange(coverImage: string | null): void {
    this.game.coverImage = coverImage ?? undefined;
  }

  canShowRating(): boolean {
    return !this.isWishlistMode && canRateGame(this.game.status);
  }

  onRatingChange(rating: number | null): void {
    if (!this.canShowRating()) {
      return;
    }

    this.ratingPreview = null;
    this.game.rating = rating ?? undefined;
  }

  getRatingDisplay(): string {
    return formatRatingLabel(this.ratingPreview ?? this.game.rating);
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

  addTagFromDraft(): void {
    const next = normalizeTags([...(this.game.tags ?? []), this.tagDraft]);
    this.game.tags = next;
    this.tagDraft = '';
  }

  removeTag(tag: string): void {
    this.game.tags = (this.game.tags ?? []).filter((t) => t !== tag);
  }

  canSubmitForm(): boolean {
    return !!this.gameFormRef && this.canSubmit(this.gameFormRef);
  }

  submitForm(): void {
    if (this.gameFormRef) {
      void this.onSubmit(this.gameFormRef);
    }
  }

  async onSubmit(form: NgForm): Promise<void> {
    this.submitted = true;
    form.control.markAllAsTouched();

    if (!this.canSubmit(form)) {
      return;
    }

    const nextStatus = this.isWishlistMode
      ? 'wishlist'
      : (this.game.status || 'not_started');

    if (
      this.isEdit &&
      statusChangeClearsPlayHistory(this.originalStatus, nextStatus)
    ) {
      const confirmed = await confirmResetPlayHistory(this.alertController);
      if (!confirmed) {
        return;
      }
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
      tags: normalizeTags(this.game.tags),
      rating:
        nextStatus === 'wishlist' || !canRateGame(nextStatus)
          ? undefined
          : this.game.rating != null
            ? Number(this.game.rating)
            : undefined,
      playtimeHours:
        this.game.playtime != null ? Number(this.game.playtime) : undefined,
      status: nextStatus,
      notes: this.game.notes
    };

    const request$ =
      this.isEdit && this.gameId
        ? this.gameService.updateGameFromForm(this.gameId, payload)
        : this.gameService.saveGameFromForm(payload);

    request$.subscribe({
      next: (savedGame) => {
        if (this.isEdit && savedGame?.id) {
          this.router.navigate(['/game', savedGame.id]);
          return;
        }

        this.router.navigate(['/home']);
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
