import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonInput, IonItem, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  imageOutline,
  linkOutline,
  searchOutline,
  trashOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { GameCoverComponent } from '../game-cover/game-cover.component';
import { GameService } from '../../services/game.service';
import {
  RawgCoverCandidate,
  RawgService,
} from '../../services/rawg.service';
import {
  COVER_IMAGE_ACCEPT,
  COVER_IMAGE_MAX_INPUT_BYTES,
  formatImageSize,
  isHttpImageUrl,
} from '../../shared/utils/image.utils';

addIcons({
  cloudUploadOutline,
  imageOutline,
  linkOutline,
  searchOutline,
  trashOutline,
  checkmarkCircleOutline,
});

const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-game-cover-upload',
  imports: [FormsModule, IonIcon, IonInput, IonItem, IonSpinner, GameCoverComponent],
  templateUrl: './game-cover-upload.component.html',
  styleUrl: './game-cover-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCoverUploadComponent {
  private readonly gameService = inject(GameService);
  private readonly rawg = inject(RawgService);
  private readonly search$ = new Subject<string>();

  public readonly title = input('');
  public readonly coverImage = input<string | null>();
  public readonly coverImageChange = output<string | null>();

  protected readonly accept = COVER_IMAGE_ACCEPT;
  protected readonly maxInputLabel = formatImageSize(COVER_IMAGE_MAX_INPUT_BYTES);
  protected readonly rawgConfigured = this.rawg.isConfigured;

  protected readonly uploading = signal(false);
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly searchError = signal('');
  protected readonly candidates = signal<RawgCoverCandidate[]>([]);

  /** The URL field mirrors the current cover when it is a web URL (uploads are data URLs). */
  protected readonly urlValue = computed(() => {
    const cover = this.coverImage();
    return cover && isHttpImageUrl(cover) ? cover : '';
  });

  /** Search box follows the game title until the user types their own query. */
  private readonly searchDraft = signal<string | null>(null);
  protected readonly searchQuery = computed(() => this.searchDraft() ?? this.title().trim());

  constructor() {
    this.search$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => this.searchCovers(query)),
        takeUntilDestroyed(),
      )
      .subscribe((items) => {
        this.candidates.set(items);
        this.searching.set(false);
      });
  }

  protected onSearchInput(value: string | null | undefined): void {
    this.searchDraft.set(value ?? '');
    this.search$.next(this.searchQuery());
  }

  protected searchNow(): void {
    this.search$.next(this.searchQuery().trim());
  }

  private searchCovers(query: string) {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      this.searching.set(false);
      this.searched.set(false);
      return of([] as RawgCoverCandidate[]);
    }
    this.searching.set(true);
    this.searchError.set('');
    return this.rawg.searchCoverImages(q).pipe(
      tap(() => this.searched.set(true)),
      catchError(() => {
        this.searched.set(true);
        this.searchError.set('Cover search failed. Try again or upload manually.');
        return of([] as RawgCoverCandidate[]);
      }),
    );
  }

  protected selectCandidate(item: RawgCoverCandidate): void {
    this.errorMessage.set('');
    this.coverImageChange.emit(item.imageUrl);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set('');

    this.gameService.uploadCoverImage(file).subscribe({
      next: (dataUrl) => {
        this.coverImageChange.emit(dataUrl);
        this.uploading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'Failed to upload image');
        this.uploading.set(false);
      },
    });
  }

  protected onUrlInput(event: CustomEvent<{ value?: string | null }>): void {
    const value = (event.detail.value ?? '').trim();
    this.errorMessage.set('');

    if (!value) {
      this.coverImageChange.emit(null);
      return;
    }

    if (!isHttpImageUrl(value)) {
      this.errorMessage.set('Enter a valid http or https image URL.');
      return;
    }

    this.coverImageChange.emit(value);
  }

  protected clearCover(): void {
    this.errorMessage.set('');
    this.coverImageChange.emit(null);
  }
}
