import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';
import {
  clampRating,
  formatRatingLabel,
  getStarFillStates,
  isValidRating,
} from '../../shared/utils/rating.utils';

addIcons({ star, starOutline });

@Component({
  selector: 'app-game-rating',
  imports: [IonIcon, IonButton],
  templateUrl: './game-rating.component.html',
  styleUrl: './game-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameRatingComponent {
  public readonly rating = input<number | null>();
  public readonly readonly = input(false);
  public readonly disabled = input(false);
  public readonly size = input<'sm' | 'md' | 'lg'>('md');
  public readonly showValue = input(false);
  public readonly showClear = input(false);

  public readonly ratingChange = output<number | null>();
  public readonly previewChange = output<number | null>();

  private readonly previewRating = signal<number | null>(null);

  protected readonly formatRatingLabel = formatRatingLabel;
  protected readonly isValidRating = isValidRating;

  protected readonly displayRating = computed(() => this.previewRating() ?? this.rating());
  protected readonly starStates = computed(() => getStarFillStates(this.displayRating()));
  private readonly interactive = computed(() => !this.readonly() && !this.disabled());

  protected onStarClick(value: number, event: Event): void {
    if (!this.interactive()) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const next = this.rating() === value ? null : clampRating(value);
    this.ratingChange.emit(next);
    this.setPreview(null);
  }

  protected clearRating(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.ratingChange.emit(null);
    this.setPreview(null);
  }

  protected onStarHover(value: number): void {
    if (!this.interactive()) {
      return;
    }

    this.setPreview(value);
  }

  protected onStarsLeave(): void {
    this.setPreview(null);
  }

  private setPreview(value: number | null): void {
    this.previewRating.set(value);
    this.previewChange.emit(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) {
      return;
    }

    const rating = this.rating();
    const current = isValidRating(rating) ? rating : 0;

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
