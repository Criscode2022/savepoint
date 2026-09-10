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
  templateUrl: './game-rating.component.html',
  styleUrl: './game-rating.component.scss',
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
    if (this.readonly || this.disabled) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

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
