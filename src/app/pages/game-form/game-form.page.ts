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
  templateUrl: './game-form.page.html',
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
