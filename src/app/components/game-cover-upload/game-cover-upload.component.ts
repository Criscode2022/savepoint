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
  styleUrl: './game-cover-upload.component.scss',
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
