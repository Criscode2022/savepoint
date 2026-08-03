import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  createOutline,
  imageOutline,
  linkOutline,
  searchOutline,
  trashOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of } from 'rxjs';
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
  isDataUrlImage,
  isHttpImageUrl,
} from '../../shared/utils/image.utils';

@Component({
  selector: 'app-game-cover-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonSpinner,
    GameCoverComponent,
  ],
  templateUrl: './game-cover-upload.component.html',
  styles: [
    `
      .cover-upload {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
      }

      .cover-upload__preview {
        position: relative;
        width: min(100%, 220px);
        aspect-ratio: 3 / 4;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      }

      .cover-media-actions {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        z-index: 2;
        display: flex;
        gap: 0.375rem;
      }

      .cover-media-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 10px;
        background: rgba(15, 15, 21, 0.78);
        color: #f8fafc;
        cursor: pointer;
        backdrop-filter: blur(8px);
        transition:
          background var(--transition-fast),
          border-color var(--transition-fast),
          transform var(--transition-fast);
      }

      .cover-media-action ion-icon {
        font-size: 1rem;
      }

      .cover-media-action:hover,
      .cover-media-action:focus-visible {
        outline: none;
        transform: translateY(-1px);
      }

      .cover-media-action--edit:hover,
      .cover-media-action--edit:focus-visible {
        background: rgba(168, 85, 247, 0.28);
        border-color: rgba(196, 181, 253, 0.55);
      }

      .cover-media-action--remove:hover,
      .cover-media-action--remove:focus-visible {
        background: rgba(239, 68, 68, 0.24);
        border-color: rgba(252, 165, 165, 0.45);
        color: #fecaca;
      }

      .cover-media-action:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
      }

      .cover-upload__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.625rem;
        align-items: center;
      }

      .cover-upload__file-input {
        display: none;
      }

      .cover-upload__button {
        --border-radius: 12px;
        margin: 0;
        text-transform: none;
        font-weight: 600;
      }

      .cover-upload__button--remove {
        --padding-start: 0.75rem;
        --padding-end: 0.75rem;
      }

      .cover-upload__hint,
      .cover-upload__error,
      .cover-upload__rawg-status {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.45;
      }

      .cover-upload__hint {
        color: var(--ink-muted);
      }

      .cover-upload__error,
      .cover-upload__rawg-status {
        color: #fca5a5;
      }

      .cover-upload__rawg-status:not(:has(+ .cover-upload__error)) {
        color: var(--ink-muted);
      }

      .cover-upload__url .field-label,
      .cover-upload__rawg .field-label {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        margin-bottom: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--ink-secondary);
      }

      .cover-upload__url ion-icon,
      .cover-upload__rawg .field-label ion-icon {
        font-size: 0.95rem;
        color: #c4b5fd;
      }

      .cover-upload__rawg {
        padding-top: 0.25rem;
        border-top: 1px solid rgba(148, 163, 184, 0.12);
      }

      .cover-upload__rawg-row {
        display: flex;
        gap: 0.5rem;
        align-items: stretch;
      }

      .cover-upload__rawg-input {
        flex: 1;
        min-width: 0;
      }

      .cover-upload__search-btn {
        flex-shrink: 0;
        min-width: 5.5rem;
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 12px;
        background: rgba(168, 85, 247, 0.16);
        color: #e9d5ff;
        font: inherit;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .cover-upload__search-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .cover-upload__search-btn:hover:not(:disabled) {
        background: rgba(168, 85, 247, 0.28);
      }

      .cover-upload__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
        gap: 0.55rem;
        margin-top: 0.75rem;
        max-height: 280px;
        overflow-y: auto;
        padding: 0.15rem;
      }

      .cover-pick {
        position: relative;
        margin: 0;
        padding: 0;
        border: 1px solid var(--border-subtle, rgba(148, 163, 184, 0.18));
        border-radius: 10px;
        overflow: hidden;
        background: #0f0f15;
        cursor: pointer;
        aspect-ratio: 16 / 10;
        text-align: left;
        transition:
          border-color 150ms ease,
          transform 150ms ease,
          box-shadow 150ms ease;
      }

      .cover-pick img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .cover-pick:hover,
      .cover-pick:focus-visible {
        outline: none;
        transform: translateY(-2px);
        border-color: rgba(168, 85, 247, 0.45);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
      }

      .cover-pick--selected {
        border-color: rgba(168, 85, 247, 0.75);
        box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.45);
      }

      .cover-pick__badge {
        position: absolute;
        top: 0.3rem;
        left: 0.3rem;
        padding: 0.1rem 0.35rem;
        border-radius: 999px;
        background: rgba(10, 10, 15, 0.75);
        color: #e9d5ff;
        font-size: 0.5625rem;
        font-weight: 750;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .cover-pick__check {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        color: #c4b5fd;
        font-size: 1.15rem;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
      }

      .cover-pick__meta {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 1.1rem 0.35rem 0.3rem;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 0.05rem;
      }

      .cover-pick__meta strong {
        font-size: 0.625rem;
        font-weight: 700;
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .cover-pick__meta small {
        font-size: 0.5625rem;
        color: #cbd5e1;
      }

      .cover-upload__rawg-missing {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        margin: 0;
        padding: 0.75rem 0.85rem;
        border-radius: 12px;
        border: 1px dashed rgba(168, 85, 247, 0.3);
        background: rgba(168, 85, 247, 0.06);
        color: var(--ink-muted);
        font-size: 0.75rem;
        line-height: 1.45;
      }

      .cover-upload__rawg-missing code {
        font-size: 0.7rem;
        color: #e9d5ff;
      }

      .cover-upload__rawg-missing ion-icon {
        color: #c4b5fd;
        font-size: 1rem;
        margin-top: 0.1rem;
      }
    `,
  ],
})
export class GameCoverUploadComponent implements OnChanges, OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly rawg = inject(RawgService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  @Input() title = '';
  @Input() coverImage: string | null | undefined;
  @Output() coverImageChange = new EventEmitter<string | null>();

  readonly accept = COVER_IMAGE_ACCEPT;
  readonly maxInputLabel = formatImageSize(COVER_IMAGE_MAX_INPUT_BYTES);
  readonly rawgConfigured = this.rawg.isConfigured;

  uploading = false;
  searching = false;
  searched = false;
  errorMessage = '';
  searchError = '';
  urlValue = '';
  searchQuery = '';
  candidates: RawgCoverCandidate[] = [];

  constructor() {
    addIcons({
      cloudUploadOutline,
      createOutline,
      imageOutline,
      linkOutline,
      searchOutline,
      trashOutline,
      checkmarkCircleOutline,
    });

    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (!q || q.length < 2) {
            this.searching = false;
            this.candidates = [];
            this.searched = false;
            return of([] as RawgCoverCandidate[]);
          }
          this.searching = true;
          this.searchError = '';
          return this.rawg.searchCoverImages(q);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (items) => {
          this.candidates = items;
          this.searching = false;
          this.searched = true;
        },
        error: () => {
          this.searching = false;
          this.searched = true;
          this.searchError = 'Cover search failed. Try again or upload manually.';
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.coverImage && isHttpImageUrl(this.coverImage)) {
      this.urlValue = this.coverImage;
    } else if (!this.coverImage || isDataUrlImage(this.coverImage)) {
      this.urlValue = '';
    }

    // Prefill search from game title when title arrives / changes
    if (changes['title'] && this.title?.trim()) {
      const next = this.title.trim();
      if (!this.searchQuery || this.searchQuery === changes['title'].previousValue) {
        this.searchQuery = next;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery ?? '');
  }

  searchNow(): void {
    this.searchSubject.next(this.searchQuery?.trim() ?? '');
  }

  selectCandidate(item: RawgCoverCandidate): void {
    this.errorMessage = '';
    this.urlValue = item.imageUrl;
    this.coverImageChange.emit(item.imageUrl);
  }

  trackByCandidate(_index: number, item: RawgCoverCandidate): string {
    return item.id;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.uploading = true;
    this.errorMessage = '';

    this.gameService.uploadCoverImage(file).subscribe({
      next: (dataUrl) => {
        this.urlValue = '';
        this.coverImageChange.emit(dataUrl);
        this.uploading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || 'Failed to upload image';
        this.uploading = false;
      },
    });
  }

  onUrlInput(event: CustomEvent): void {
    const value = (event.detail.value ?? '').trim();
    this.urlValue = value;
    this.errorMessage = '';

    if (!value) {
      this.coverImageChange.emit(null);
      return;
    }

    if (!isHttpImageUrl(value)) {
      this.errorMessage = 'Enter a valid http or https image URL.';
      return;
    }

    this.coverImageChange.emit(value);
  }

  clearCover(): void {
    this.urlValue = '';
    this.errorMessage = '';
    this.coverImageChange.emit(null);
  }
}
