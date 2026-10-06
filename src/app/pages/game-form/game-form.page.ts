import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';
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
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { PLATFORMS, GENRES, Game, GameFormPayload, Platform, GamePlayStatus, GAME_STATUS_LABELS } from '../../models/game.model';
import { normalizeTags } from '../../shared/utils/tag.utils';
import { GameService } from '../../services/game.service';
import { PlatformService } from '../../services/platform.service';
import { RawgService, RawgGameImport, RawgGameSummary } from '../../services/rawg.service';
import { GameRatingComponent } from '../../components/game-rating/game-rating.component';
import { GameCoverUploadComponent } from '../../components/game-cover-upload/game-cover-upload.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import {
  confirmResetPlayHistory,
  statusChangeClearsPlayHistory,
} from '../../shared/utils/game-status.utils';
import { canRateGame, formatRatingLabel, isValidRating } from '../../shared/utils/rating.utils';
import { shouldShowFieldError } from '../../shared/utils/form-field-error';
import { ToastState } from '../../shared/toast-state';

addIcons({
  saveOutline,
  imageOutline,
  closeOutline,
  searchOutline,
  flashOutline,
  checkmarkCircleOutline,
});

const CURRENT_YEAR = new Date().getFullYear();

/** One writable signal per field, bound with `[(ngModel)]="form.field"` */
function createGameForm(status: GamePlayStatus) {
  return {
    title: signal(''),
    description: signal(''),
    coverImage: signal<string | undefined>(undefined),
    platformId: signal(''),
    releaseYear: signal<number | null>(status === 'wishlist' ? CURRENT_YEAR + 1 : CURRENT_YEAR),
    releaseDate: signal(''),
    developerName: signal(''),
    director: signal(''),
    genres: signal<string[]>([]),
    tags: signal<string[]>([]),
    rating: signal<number | null>(null),
    playtime: signal<number | null>(null),
    status: signal<GamePlayStatus>(status),
    notes: signal(''),
  };
}

@Component({
  selector: 'app-game-form',
  imports: [
    SlicePipe, FormsModule, RouterLink,
    IonContent, IonFooter, IonIcon, IonCard, IonCardContent, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonToast, IonChip, IonSegment, IonSegmentButton,
    IonSpinner, GameRatingComponent, GameCoverUploadComponent, PageHeaderComponent,
  ],
  templateUrl: './game-form.page.html',
  styleUrl: './game-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameFormPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private readonly platformService = inject(PlatformService);
  private readonly alertController = inject(AlertController);
  private readonly rawg = inject(RawgService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly gameForm = viewChild<NgForm>('gameForm');

  protected readonly genres = GENRES;
  protected readonly statusLabels = GAME_STATUS_LABELS;
  protected readonly rawgConfigured = this.rawg.isConfigured;

  private readonly gameId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.gameId;
  protected readonly isWishlistMode = !this.isEdit && this.route.snapshot.data['wishlist'] === true;

  protected readonly pageTitle = this.isEdit ? 'Edit game' : this.isWishlistMode ? 'Add to wishlist' : 'Add a game';
  protected readonly submitLabel = this.isEdit ? 'Save changes' : this.isWishlistMode ? 'Add to wishlist' : 'Save game';
  /** Where Cancel / back returns: the game you were editing, otherwise the library */
  protected readonly cancelHref = this.isEdit ? `/game/${this.gameId}` : '/home';

  protected readonly form = createGameForm(this.isWishlistMode ? 'wishlist' : 'not_started');
  protected readonly tagDraft = signal('');
  protected readonly platforms = signal<Platform[]>([]);
  protected readonly isLoadingGame = signal(this.isEdit);
  protected readonly isSubmitting = signal(false);
  protected readonly ratingPreview = signal<number | null>(null);
  protected readonly toast = new ToastState();
  private readonly originalStatus = signal<GamePlayStatus>('not_started');
  private readonly revealedErrors = signal<ReadonlySet<string>>(new Set());
  private focusedField: string | null = null;

  // RAWG search / import
  protected readonly rawgQuery = signal('');
  protected readonly rawgResults = signal<RawgGameSummary[]>([]);
  protected readonly rawgSearching = signal(false);
  protected readonly rawgSearched = signal(false);
  protected readonly rawgError = signal('');
  protected readonly rawgImportingId = signal<number | null>(null);
  protected readonly rawgImportedTitle = signal('');
  private readonly rawgQuery$ = new Subject<string>();

  protected readonly pageSubtitle = computed(() => {
    if (this.isEdit) {
      const title = this.form.title();
      return title ? `Changes to ${title} save when you hit Save.` : '';
    }
    return this.isWishlistMode
      ? 'Track an upcoming release — we’ll count down to launch day.'
      : 'Fields marked * are required. Everything else can wait.';
  });

  protected readonly requiresReleaseDate = computed(
    () => this.isWishlistMode || this.form.status() === 'wishlist',
  );
  protected readonly maxReleaseYear = computed(() =>
    this.requiresReleaseDate() ? CURRENT_YEAR + 10 : CURRENT_YEAR,
  );
  protected readonly canSelectWishlistStatus = computed(
    () => this.isEdit && this.originalStatus() === 'wishlist',
  );
  protected readonly canShowRating = computed(
    () => !this.isWishlistMode && canRateGame(this.form.status()),
  );
  protected readonly hasRating = computed(() => isValidRating(this.form.rating()));
  protected readonly ratingDisplay = computed(() =>
    formatRatingLabel(this.ratingPreview() ?? this.form.rating()),
  );

  constructor() {
    this.loadPlatforms();
    this.setupRawgSearch();
    if (this.gameId) {
      this.loadGame(this.gameId);
    }
  }

  private setupRawgSearch(): void {
    this.rawgQuery$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((q) => {
          const query = q.trim();
          if (!query || query.length < 2 || !this.rawg.isConfigured) {
            this.rawgSearching.set(false);
            this.rawgSearched.set(!!query);
            this.rawgResults.set([]);
            return of([] as RawgGameSummary[]);
          }
          this.rawgSearching.set(true);
          this.rawgError.set('');
          return this.rawg.searchGames(query, 10).pipe(
            catchError(() => {
              this.rawgError.set('RAWG search failed. Check your API key or try again.');
              return of([] as RawgGameSummary[]);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.rawgResults.set(results);
        this.rawgSearching.set(false);
        this.rawgSearched.set(true);
      });
  }

  protected onRawgQuery(value: string | null | undefined): void {
    this.rawgQuery.set(value ?? '');
    this.rawgQuery$.next(value ?? '');
  }

  protected applyRawgGame(hit: RawgGameSummary): void {
    if (this.rawgImportingId() != null) return;
    this.rawgImportingId.set(hit.id);
    this.rawgError.set('');

    this.rawg
      .importGame(hit.id, hit)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (imported) => {
          this.rawgImportingId.set(null);
          if (!imported) {
            this.rawgError.set('Could not load full game details from RAWG.');
            return;
          }
          this.fillFromRawg(imported);
          this.rawgImportedTitle.set(imported.title);
          this.rawgResults.set([]);
          this.rawgQuery.set(imported.title);
        },
        error: () => {
          this.rawgImportingId.set(null);
          this.rawgError.set('Could not import that game. Try another result.');
        },
      });
  }

  private fillFromRawg(imported: RawgGameImport): void {
    const form = this.form;
    form.title.set(imported.title);
    if (imported.description) form.description.set(imported.description);
    if (imported.coverImage) form.coverImage.set(imported.coverImage);
    if (imported.releaseYear != null) form.releaseYear.set(imported.releaseYear);
    if (imported.releaseDate) form.releaseDate.set(imported.releaseDate.slice(0, 10));
    if (imported.developerName) form.developerName.set(imported.developerName);

    // Merge RAWG genres into known library genres when possible
    form.genres.update((current) => {
      const genreSet = new Set(current);
      for (const g of imported.genres) {
        genreSet.add(this.genres.find((x) => x.toLowerCase() === g.toLowerCase()) ?? g);
      }
      return [...genreSet];
    });

    form.tags.update((current) => normalizeTags([...current, ...imported.tags]));

    const platformId = this.rawg.matchPlatformId(imported.platforms, this.platforms());
    if (platformId) {
      form.platformId.set(platformId);
    }

    if (imported.playtimeHours != null && !form.playtime()) {
      form.playtime.set(imported.playtimeHours);
    }

    // Keep a reference note without overwriting user notes entirely
    const noteLine = `Imported from RAWG · ${imported.rawgUrl}`;
    form.notes.update((notes) => {
      if (notes.includes('rawg.io')) return notes;
      return notes ? `${notes.trim()}\n\n${noteLine}` : noteLine;
    });
  }

  private releaseDateYearMismatch(): boolean {
    const releaseDate = this.form.releaseDate();
    const releaseYear = this.form.releaseYear();
    if (!this.requiresReleaseDate() || !releaseDate || releaseYear == null) {
      return false;
    }

    const dateYear = new Date(`${releaseDate}T00:00:00`).getFullYear();
    return dateYear !== Number(releaseYear);
  }

  private canSubmit(form: NgForm): boolean {
    if (!form.valid) {
      return false;
    }

    if (this.requiresReleaseDate() && !this.form.releaseDate()) {
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
    return !!control && this.revealedErrors().has(control.name);
  }

  private syncFieldError(name: string): void {
    const control = this.gameForm()?.controls?.[name];
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
      this.revealedErrors().has(name),
      this.focusedField === name,
    );

    this.revealedErrors.update((revealed) => {
      const next = new Set(revealed);
      if (show) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }

  private syncRelatedFieldError(name: string): void {
    if (name === 'releaseYear') {
      this.syncFieldError('releaseDate');
    } else if (name === 'releaseDate') {
      this.syncFieldError('releaseYear');
    }
  }

  private revealInvalidFields(form: NgForm): void {
    const invalid = Object.keys(form.controls).filter((name) => {
      const mismatch =
        (name === 'releaseDate' || name === 'releaseYear') &&
        this.releaseDateYearMismatch();
      return form.controls[name].invalid || mismatch;
    });
    this.revealedErrors.update((revealed) => new Set([...revealed, ...invalid]));
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
        return `Release year cannot be later than ${this.maxReleaseYear()}`;
      }
      if (control.name === 'rating') {
        return 'Rating cannot be greater than 10';
      }
    }

    return 'Invalid value';
  }

  private loadPlatforms(): void {
    this.platformService
      .getPlatforms()
      .pipe(
        catchError(() => of([] as Platform[])),
        takeUntilDestroyed(),
      )
      .subscribe((platforms) => {
        const list = platforms.length > 0 ? platforms : PLATFORMS;
        this.platforms.set(list);
        if (!this.form.platformId() && list[0]) {
          this.form.platformId.set(list[0].id);
        }
      });
  }

  private loadGame(id: string): void {
    this.gameService
      .getGameById(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (game) => {
          this.isLoadingGame.set(false);
          if (game) {
            this.fillFromGame(game);
          } else {
            void this.router.navigate(['/home']);
          }
        },
        error: () => {
          this.isLoadingGame.set(false);
          void this.router.navigate(['/home']);
        },
      });
  }

  private fillFromGame(game: Game): void {
    const form = this.form;
    form.title.set(game.title);
    form.description.set(game.description ?? '');
    form.coverImage.set(game.coverImage ?? undefined);
    form.platformId.set(game.platformId || game.platform?.id || '');
    form.releaseYear.set(game.releaseYear ?? null);
    form.releaseDate.set(game.releaseDate ?? '');
    form.developerName.set(game.developer?.name || '');
    form.director.set(game.director || '');
    form.genres.set(game.genre ?? []);
    form.tags.set(game.tags ?? []);
    form.rating.set(game.rating ?? null);
    form.playtime.set(game.playtimeHours ?? game.playtime ?? null);
    form.status.set(game.status);
    form.notes.set(game.notes ?? '');
    this.originalStatus.set(game.status);
  }

  protected isGenreSelected(genre: string): boolean {
    return this.form.genres().includes(genre);
  }

  protected onCoverImageChange(coverImage: string | null): void {
    this.form.coverImage.set(coverImage ?? undefined);
  }

  protected onRatingChange(rating: number | null): void {
    if (!this.canShowRating()) {
      return;
    }

    this.ratingPreview.set(null);
    this.form.rating.set(rating);
  }

  protected toggleGenre(genre: string): void {
    this.form.genres.update((genres) =>
      genres.includes(genre) ? genres.filter((g) => g !== genre) : [...genres, genre],
    );
  }

  protected addTagFromDraft(): void {
    this.form.tags.update((tags) => normalizeTags([...tags, this.tagDraft()]));
    this.tagDraft.set('');
  }

  protected removeTag(tag: string): void {
    this.form.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  protected submitForm(): void {
    const form = this.gameForm();
    if (form) {
      void this.onSubmit(form);
    }
  }

  protected async onSubmit(ngForm: NgForm): Promise<void> {
    ngForm.control.markAllAsTouched();
    this.revealInvalidFields(ngForm);

    if (!this.canSubmit(ngForm)) {
      this.toast.show('A few fields need attention before saving.', 'danger');
      this.focusFirstInvalidField();
      return;
    }

    const nextStatus = this.isWishlistMode ? 'wishlist' : this.form.status();

    if (
      this.isEdit &&
      statusChangeClearsPlayHistory(this.originalStatus(), nextStatus)
    ) {
      const confirmed = await confirmResetPlayHistory(this.alertController);
      if (!confirmed) {
        return;
      }
    }

    this.isSubmitting.set(true);

    const payload = this.buildPayload(nextStatus);
    const request$ = this.gameId
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
      error: (error: { message?: string }) => {
        this.toast.show(
          error.message ||
            (this.isEdit ? "Couldn't save your changes. Try again." : "Couldn't add the game. Try again."),
          'danger',
        );
        this.isSubmitting.set(false);
      },
    });
  }

  private buildPayload(status: GamePlayStatus): GameFormPayload {
    const form = this.form;
    const rating = form.rating();
    const playtime = form.playtime();
    return {
      title: form.title(),
      description: form.description(),
      coverImage: form.coverImage(),
      platformId: form.platformId(),
      releaseYear: Number(form.releaseYear()),
      releaseDate: form.releaseDate() || undefined,
      developerName: form.developerName().trim(),
      directorName: form.director().trim() || undefined,
      genre: form.genres(),
      tags: normalizeTags(form.tags()),
      rating: status === 'wishlist' || !canRateGame(status) || rating == null ? undefined : Number(rating),
      playtimeHours: playtime != null ? Number(playtime) : undefined,
      status,
      notes: form.notes(),
    };
  }

  private focusFirstInvalidField(): void {
    setTimeout(() => {
      const field = this.host.nativeElement.querySelector<HTMLElement>('.field-invalid');
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.querySelector<HTMLElement>('input, textarea, ion-select')?.focus();
    });
  }
}
