import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  cloudUploadOutline,
  createOutline,
  linkOutline,
  trashOutline,
} from "ionicons/icons";
import { GameCoverComponent } from "../game-cover/game-cover.component";
import { GameService } from "../../services/game.service";
import {
  COVER_IMAGE_ACCEPT,
  COVER_IMAGE_MAX_INPUT_BYTES,
  formatImageSize,
  isDataUrlImage,
  isHttpImageUrl,
} from "../../shared/utils/image.utils";

@Component({
  selector: "app-game-cover-upload",
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonSpinner,
    GameCoverComponent,
  ],
  template: `
    <div class="cover-upload">
      <div class="cover-upload__preview">
        <div class="cover-media-actions">
          <button
            type="button"
            class="cover-media-action cover-media-action--edit"
            aria-label="Upload cover image"
            [disabled]="uploading"
            (click)="fileInput.click()"
          >
            <ion-icon name="create-outline" aria-hidden="true"></ion-icon>
          </button>
          <button
            *ngIf="coverImage"
            type="button"
            class="cover-media-action cover-media-action--remove"
            aria-label="Remove cover image"
            [disabled]="uploading"
            (click)="clearCover()"
          >
            <ion-icon name="trash-outline" aria-hidden="true"></ion-icon>
          </button>
        </div>
        <app-game-cover
          [title]="title || 'Game cover'"
          [coverImage]="coverImage"
          variant="card"
        ></app-game-cover>
      </div>

      <div class="cover-upload__actions">
        <input
          #fileInput
          type="file"
          class="cover-upload__file-input"
          [accept]="accept"
          (change)="onFileSelected($event)"
        />

        <ion-button
          type="button"
          fill="outline"
          class="cover-upload__button"
          [disabled]="uploading"
          (click)="fileInput.click()"
        >
          <ion-spinner *ngIf="uploading" name="crescent"></ion-spinner>
          <ion-icon *ngIf="!uploading" name="cloud-upload-outline" slot="start"></ion-icon>
          {{ uploading ? 'Processing...' : 'Upload image' }}
        </ion-button>

        <ion-button
          *ngIf="coverImage"
          type="button"
          fill="clear"
          color="danger"
          class="cover-upload__button cover-upload__button--remove"
          [disabled]="uploading"
          (click)="clearCover()"
        >
          <ion-icon name="trash-outline" slot="start"></ion-icon>
          Remove
        </ion-button>
      </div>

      <p class="cover-upload__hint">
        JPG, PNG, WebP, or GIF up to {{ maxInputLabel }}. Images are compressed before saving.
      </p>

      <p class="cover-upload__error" *ngIf="errorMessage">{{ errorMessage }}</p>

      <div class="cover-upload__url">
        <label class="field-label" for="cover-image-url">
          <ion-icon name="link-outline" aria-hidden="true"></ion-icon>
          Or paste an image URL
        </label>
        <ion-item class="form-item" lines="none">
          <ion-input
            id="cover-image-url"
            [value]="urlValue"
            type="url"
            placeholder="https://..."
            (ionInput)="onUrlInput($event)"
          ></ion-input>
        </ion-item>
      </div>
    </div>
  `,
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
        transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
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
      .cover-upload__error {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.45;
      }

      .cover-upload__hint {
        color: var(--ink-muted);
      }

      .cover-upload__error {
        color: #fca5a5;
      }

      .cover-upload__url .field-label {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        margin-bottom: 0.5rem;
      }

      .cover-upload__url ion-icon {
        font-size: 0.95rem;
        color: #c4b5fd;
      }
    `,
  ],
})
export class GameCoverUploadComponent implements OnChanges {
  private readonly gameService = inject(GameService);

  @Input() title = "";
  @Input() coverImage: string | null | undefined;
  @Output() coverImageChange = new EventEmitter<string | null>();

  readonly accept = COVER_IMAGE_ACCEPT;
  readonly maxInputLabel = formatImageSize(COVER_IMAGE_MAX_INPUT_BYTES);

  uploading = false;
  errorMessage = "";
  urlValue = "";

  constructor() {
    addIcons({
      cloudUploadOutline,
      createOutline,
      linkOutline,
      trashOutline,
    });
  }

  ngOnChanges(): void {
    if (this.coverImage && isHttpImageUrl(this.coverImage)) {
      this.urlValue = this.coverImage;
      return;
    }

    if (!this.coverImage || isDataUrlImage(this.coverImage)) {
      this.urlValue = "";
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    this.uploading = true;
    this.errorMessage = "";

    this.gameService.uploadCoverImage(file).subscribe({
      next: (dataUrl) => {
        this.urlValue = "";
        this.coverImageChange.emit(dataUrl);
        this.uploading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message || "Failed to upload image";
        this.uploading = false;
      },
    });
  }

  onUrlInput(event: CustomEvent): void {
    const value = (event.detail.value ?? "").trim();
    this.urlValue = value;
    this.errorMessage = "";

    if (!value) {
      this.coverImageChange.emit(null);
      return;
    }

    if (!isHttpImageUrl(value)) {
      this.errorMessage = "Enter a valid http or https image URL.";
      return;
    }

    this.coverImageChange.emit(value);
  }

  clearCover(): void {
    this.urlValue = "";
    this.errorMessage = "";
    this.coverImageChange.emit(null);
  }
}
