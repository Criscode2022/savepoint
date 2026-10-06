import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
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
      IonIcon,
    IonInput,
    IonItem,
    IonSpinner,
    GameCoverComponent,
  ],
  templateUrl: './game-cover-upload.component.html',
  styleUrl: './game-cover-upload.component.scss',
})
export class GameCoverUploadComponent implements OnInit, OnChanges, OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly rawg = inject(RawgService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  @Input() title = '';
  @Input() coverImage: string | null | undefined;
  @Output() coverImageChange = new EventEmitter<string | null>();

  protected readonly accept = COVER_IMAGE_ACCEPT;
  protected readonly maxInputLabel = formatImageSize(COVER_IMAGE_MAX_INPUT_BYTES);
  protected readonly rawgConfigured = this.rawg.isConfigured;

  protected uploading = false;
  protected searching = false;
  protected searched = false;
  protected errorMessage = '';
  protected searchError = '';
  protected urlValue = '';
  protected searchQuery = '';
  protected candidates: RawgCoverCandidate[] = [];

  public ngOnInit(): void {
    addIcons({
      cloudUploadOutline,
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

  public ngOnChanges(changes: SimpleChanges): void {
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

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(): void {
    this.searchSubject.next(this.searchQuery ?? '');
  }

  protected searchNow(): void {
    this.searchSubject.next(this.searchQuery?.trim() ?? '');
  }

  protected selectCandidate(item: RawgCoverCandidate): void {
    this.errorMessage = '';
    this.urlValue = item.imageUrl;
    this.coverImageChange.emit(item.imageUrl);
  }

  private trackByCandidate(_index: number, item: RawgCoverCandidate): string {
    return item.id;
  }

  protected onFileSelected(event: Event): void {
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

  protected onUrlInput(event: CustomEvent): void {
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

  protected clearCover(): void {
    this.urlValue = '';
    this.errorMessage = '';
    this.coverImageChange.emit(null);
  }
}
