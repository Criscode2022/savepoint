import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';
import {
  clampRating,
  formatRatingLabel,
  getStarFillStates,
  isValidRating,
} from '../../shared/utils/rating.utils';

@Component({
  selector: 'app-game-rating',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton],
  template: `
    <div
      class="game-rating"
      [class.game-rating--readonly]="readonly"
      [class.game-rating--sm]="size === 'sm'"
      [class.game-rating--md]="size === 'md'"
      [class.game-rating--lg]="size === 'lg'"
    >
      <div class="game-rating__row">
        <div
          class="game-rating__stars"
          role="slider"
          [attr.aria-valuemin]="0"
          [attr.aria-valuemax]="10"
          [attr.aria-valuenow]="displayRating ?? 0"
          [attr.aria-label]="readonly ? 'Rating ' + formatRatingLabel(rating) : 'Rate this game from 1 to 10'"
          [attr.tabindex]="readonly ? -1 : 0"
          (keydown)="onKeydown($event)"
          (mouseleave)="onStarsLeave()"
        >
          <button
            *ngFor="let filled of starStates; let index = index"
            type="button"
            class="game-rating__star"
            [class.game-rating__star--filled]="filled"
            [disabled]="readonly || disabled"
            [attr.aria-label]="'Rate ' + (index + 1) + ' out of 10'"
            (click)="onStarClick(index + 1, $event)"
            (mouseenter)="onStarHover(index + 1)"
          >
            <ion-icon [name]="filled ? 'star' : 'star-outline'"></ion-icon>
          </button>
        </div>

        <ion-button
          *ngIf="showClear && !readonly && isValidRating(rating)"
          fill="outline"
          size="small"
          class="game-rating__clear"
          (click)="clearRating($event)"
        >
          Clear
        </ion-button>
      </div>

      <span class="game-rating__value" *ngIf="showValue">{{ formatRatingLabel(displayRating) }}</span>
    </div>
  `,
  styles: [`
    .game-rating {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .game-rating__row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .game-rating__stars {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.125rem;
      flex: 1 1 auto;
      min-width: 0;
    }

    .game-rating__star {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      transition: transform var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
    }

    .game-rating--readonly .game-rating__star {
      cursor: default;
    }

    .game-rating__star:disabled {
      cursor: default;
    }

    .game-rating__star--filled,
    .game-rating__star--preview {
      color: #fbbf24;
    }

    .game-rating__star:not(:disabled):hover,
    .game-rating__star:not(:disabled):focus-visible {
      transform: scale(1.08);
      color: #fcd34d;
      outline: none;
    }

    .game-rating--sm .game-rating__star ion-icon {
      font-size: 0.875rem;
    }

    .game-rating--md .game-rating__star ion-icon {
      font-size: 1.125rem;
    }

    .game-rating--lg .game-rating__star ion-icon {
      font-size: 1.375rem;
    }

    .game-rating__value {
      color: #fde68a;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .game-rating--sm .game-rating__value {
      font-size: 0.75rem;
    }

    .game-rating__clear {
      --background: transparent;
      --background-hover: rgba(148, 163, 184, 0.12);
      --background-activated: rgba(148, 163, 184, 0.18);
      --border-color: rgba(148, 163, 184, 0.32);
      --border-width: 1px;
      --border-radius: 999px;
      --color: #cbd5e1;
      --padding-top: 0.5rem;
      --padding-bottom: 0.5rem;
      --padding-start: 0.875rem;
      --padding-end: 0.875rem;
      flex-shrink: 0;
      margin: 0;
      min-height: 2.125rem;
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-transform: none;
    }

    .game-rating__clear::part(native) {
      border-radius: 999px;
    }
  `],
})
export class GameRatingComponent {
  @Input() rating: number | null | undefined;
  @Input() readonly = false;
  @Input() disabled = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showValue = false;
  @Input() showClear = false;

  @Output() ratingChange = new EventEmitter<number | null>();
  @Output() previewChange = new EventEmitter<number | null>();

  previewRating: number | null = null;

  readonly formatRatingLabel = formatRatingLabel;
  readonly isValidRating = isValidRating;

  constructor() {
    addIcons({ star, starOutline });
  }

  get displayRating(): number | null | undefined {
    return this.previewRating ?? this.rating;
  }

  get starStates(): boolean[] {
    return getStarFillStates(this.displayRating);
  }

  onStarClick(value: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.readonly || this.disabled) {
      return;
    }

    const next = this.rating === value ? null : clampRating(value);
    this.ratingChange.emit(next);
    this.setPreview(null);
  }

  clearRating(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.ratingChange.emit(null);
    this.setPreview(null);
  }

  onStarHover(value: number): void {
    if (this.readonly || this.disabled) {
      return;
    }

    this.setPreview(value);
  }

  onStarsLeave(): void {
    this.setPreview(null);
  }

  private setPreview(value: number | null): void {
    this.previewRating = value;
    this.previewChange.emit(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.readonly || this.disabled) {
      return;
    }

    const current = isValidRating(this.rating) ? this.rating : 0;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.ratingChange.emit(clampRating(Math.min(10, current + 1 || 1)));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.ratingChange.emit(current <= 1 ? null : clampRating(current - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.ratingChange.emit(1);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.ratingChange.emit(10);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.ratingChange.emit(null);
    }
  }
}
