import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonFooter, IonIcon, IonCard, IonCardContent, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonToast, IonChip, IonSegment, IonSegmentButton,
  IonSpinner, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, imageOutline, closeOutline, searchOutline, flashOutline, checkmarkCircleOutline,
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
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  confirmResetPlayHistory,
  statusChangeClearsPlayHistory,
} from '../../shared/utils/game-status.utils';
import { canRateGame, formatRatingLabel, isRated } from '../../shared/utils/rating.utils';
import { shouldShowFieldError } from '../../shared/utils/form-field-error';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonContent, IonFooter, IonIcon, IonCard, IonCardContent, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonToast, IonChip, IonSegment, IonSegmentButton,
    IonSpinner, GameRatingComponent, GameCoverUploadComponent, PageHeaderComponent,
  ],
  templateUrl: './game-form.page.html',
  styleUrl: './game-form.page.scss',
})
export class GameFormPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private readonly platformService = inject(PlatformService);
  private readonly alertController = inject(AlertController);
  private readonly rawg = inject(RawgService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @ViewChild('gameForm') private gameFormRef?: NgForm;

  protected platforms: Platform[] = [];
  protected readonly genres = GENRES;
  protected readonly statusLabels = GAME_STATUS_LABELS;
  private readonly currentYear = new Date().getFullYear();
  
  protected isEdit = false;
  protected isWishlistMode = false;
  protected isLoadingGame = false;
  private gameId: string | null = null;
  protected selectedPlatformId = '';
  
  protected game: Partial<Game> = {
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

  protected tagDraft = '';
  
  protected developerName = '';
  protected isSubmitting = false;
  private submitted = false;
  private focusedField: string | null = null;
  private readonly revealedErrors = new Set<string>();
  protected toastMessage = '';
  private originalStatus: GamePlayStatus = 'not_started';
  protected ratingPreview: number | null = null;

  // RAWG search / import
  protected rawgQuery = '';
  protected rawgResults: RawgGameSummary[] = [];
  protected rawgSearching = false;
  protected rawgSearched = false;
  protected rawgError = '';
  protected rawgImportingId: number | null = null;
  protected rawgImportedTitle = '';
  private readonly rawgQuery$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  protected get rawgConfigured(): boolean {
    return this.rawg.isConfigured;
  }

  public ngOnInit(): void {
    addIcons({
      saveOutline,
      imageOutline,
      closeOutline,
      searchOutline,
      flashOutline,
      checkmarkCircleOutline,
    });

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

  public ngOnDestroy(): void {
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

  protected onRawgQuery(event: CustomEvent | Event): void {
    const value =
      (event as CustomEvent)?.detail?.value ??
      (event.target as HTMLInputElement | null)?.value ??
      this.rawgQuery;
    this.rawgQuery = String(value ?? '');
    this.rawgQuery$.next(this.rawgQuery);
  }

  protected applyRawgGame(hit: RawgGameSummary): void {
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

  protected get pageTitle(): string {
    if (this.isEdit) return 'Edit game';
    return this.isWishlistMode ? 'Add to wishlist' : 'Add a game';
  }

  protected get pageSubtitle(): string {
    if (this.isEdit) return this.game.title ? `Changes to ${this.game.title} save when you hit Save.` : '';
    return this.isWishlistMode
      ? 'Track an upcoming release — we’ll count down to launch day.'
      : 'Fields marked * are required. Everything else can wait.';
  }

  /** Where Cancel / back returns: the game you were editing, otherwise the library */
  protected get cancelHref(): string {
    return this.isEdit && this.gameId ? `/game/${this.gameId}` : '/home';
  }

  protected get submitLabel(): string {
    if (this.isEdit) return 'Save changes';
    return this.isWishlistMode ? 'Add to wishlist' : 'Save game';
  }

  protected get maxReleaseYear(): number {
    return this.requiresReleaseDate() ? this.currentYear + 10 : this.currentYear;
  }

  protected requiresReleaseDate(): boolean {
    return this.isWishlistMode || this.game.status === 'wishlist';
  }

  protected canSelectWishlistStatus(): boolean {
    return this.isEdit && this.originalStatus === 'wishlist';
  }

  private releaseDateYearMismatch(): boolean {
    if (!this.requiresReleaseDate()) {
      return false;
    }

    if (!this.game.releaseDate || this.game.releaseYear == null) {
      return false;
    }

    const dateYear = new Date(`${this.game.releaseDate}T00:00:00`).getFullYear();
    return dateYear !== Number(this.game.releaseYear);
  }

  private canSubmit(form: NgForm): boolean {
    if (!form.valid) {
      return false;
    }

    if (this.requiresReleaseDate() && !this.game.releaseDate) {
      return false;
    }

    return !this.releaseDateYearMismatch();
  }

  protected onFieldFocus(name: string): void {
    this.focusedField = name;
  }

  protected onFieldBlur(name: string): void {
    if (this.focusedField === name) {
      this.focusedField = null;
    }
    this.syncFieldError(name);
    this.syncRelatedFieldError(name);
  }

  protected onFieldChange(name: string): void {
    this.syncFieldError(name);
    this.syncRelatedFieldError(name);
  }

  protected isInvalid(control: NgModel | null | undefined): boolean {
    return !!control && this.revealedErrors.has(control.name);
  }

  private syncFieldError(name: string): void {
    const control = this.gameFormRef?.controls?.[name];
    if (!control) {
      return;
    }

    const mismatch =
      (name === 'releaseDate' || name === 'releaseYear') &&
      this.releaseDateYearMismatch();

    const show = shouldShowFieldError(
      {
        invalid: !!control.invalid || mismatch,
        dirty: !!control.dirty,
      },
      this.revealedErrors.has(name),
      this.focusedField === name,
    );

    if (show) {
      this.revealedErrors.add(name);
    } else {
      this.revealedErrors.delete(name);
    }
  }

  private syncRelatedFieldError(name: string): void {
    if (name === 'releaseYear') {
      this.syncFieldError('releaseDate');
    } else if (name === 'releaseDate') {
      this.syncFieldError('releaseYear');
    }
  }

  private revealInvalidFields(form: NgForm): void {
    for (const name of Object.keys(form.controls)) {
      const control = form.controls[name];
      const mismatch =
        (name === 'releaseDate' || name === 'releaseYear') &&
        this.releaseDateYearMismatch();
      if (control.invalid || mismatch) {
        this.revealedErrors.add(name);
      }
    }
  }

  protected fieldError(control: NgModel | null | undefined): string | null {
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

  private loadGame(id: string): void {
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

  protected isGenreSelected(genre: string): boolean {
    return this.game.genre?.includes(genre) || false;
  }

  protected onCoverImageChange(coverImage: string | null): void {
    this.game.coverImage = coverImage ?? undefined;
  }

  protected canShowRating(): boolean {
    return !this.isWishlistMode && canRateGame(this.game.status);
  }

  protected onRatingChange(rating: number | null): void {
    if (!this.canShowRating()) {
      return;
    }

    this.ratingPreview = null;
    this.game.rating = rating ?? undefined;
  }

  protected hasRating(): boolean {
    return isRated(this.game);
  }

  protected getRatingDisplay(): string {
    return formatRatingLabel(this.ratingPreview ?? this.game.rating);
  }

  protected toggleGenre(genre: string): void {
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

  protected addTagFromDraft(): void {
    const next = normalizeTags([...(this.game.tags ?? []), this.tagDraft]);
    this.game.tags = next;
    this.tagDraft = '';
  }

  protected removeTag(tag: string): void {
    this.game.tags = (this.game.tags ?? []).filter((t) => t !== tag);
  }

  protected submitForm(): void {
    if (this.gameFormRef) {
      void this.onSubmit(this.gameFormRef);
    }
  }

  protected async onSubmit(form: NgForm): Promise<void> {
    this.submitted = true;
    form.control.markAllAsTouched();
    this.revealInvalidFields(form);

    if (!this.canSubmit(form)) {
      this.showToast('A few fields need attention before saving.');
      this.focusFirstInvalidField();
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
          void this.router.navigate(['/game', savedGame.id]);
          return;
        }

        const destination = nextStatus === 'wishlist' ? 'wishlist' : 'library';
        void this.router.navigate(['/home'], {
          queryParams: nextStatus === 'wishlist' ? { collection: 'wishlist' } : {},
          state: { toast: `${payload.title} saved to your ${destination}` },
        });
      },
      error: (error) => {
        this.showToast(
          error.message ||
            (this.isEdit ? "Couldn't save your changes. Try again." : "Couldn't add the game. Try again."),
        );
        this.isSubmitting = false;
      }
    });
  }

  private focusFirstInvalidField(): void {
    setTimeout(() => {
      const field = this.host.nativeElement.querySelector<HTMLElement>('.field-invalid');
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.querySelector<HTMLElement>('input, textarea, ion-select')?.focus();
    });
  }

  private showToast(message: string): void {
    this.toastMessage = message;
  }
}
