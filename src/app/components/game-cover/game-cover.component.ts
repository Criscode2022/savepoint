import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

type CoverVariant = 'card' | 'hero' | 'thumbnail';

interface PlaceholderMetrics {
  fontSize: string;
  lineClamp: number;
}

@Component({
  selector: 'app-game-cover',
  templateUrl: './game-cover.component.html',
  styleUrl: './game-cover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCoverComponent {
  public readonly title = input('');
  public readonly coverImage = input<string | null>();
  public readonly variant = input<CoverVariant>('card');

  /** Image URLs that failed to load / loaded landscape — tied to the URL so a new cover resets them */
  private readonly failedSrc = signal<string | null>(null);
  private readonly landscapeSrc = signal<string | null>(null);

  protected readonly src = computed(() => this.coverImage()?.trim() || null);
  protected readonly showImage = computed(() => !!this.src() && this.src() !== this.failedSrc());
  protected readonly isLandscape = computed(() => this.showImage() && this.src() === this.landscapeSrc());
  protected readonly placeholderMetrics = computed(() =>
    getPlaceholderMetrics(this.variant(), this.title().trim().length),
  );

  protected onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth > img.naturalHeight * 1.02) {
      this.landscapeSrc.set(this.src());
    }
  }

  protected onImageError(): void {
    this.failedSrc.set(this.src());
  }
}

function getPlaceholderMetrics(variant: CoverVariant, length: number): PlaceholderMetrics {
  if (variant === 'thumbnail') {
    if (length <= 8) {
      return { fontSize: '0.75rem', lineClamp: 3 };
    }
    if (length <= 16) {
      return { fontSize: '0.625rem', lineClamp: 4 };
    }
    if (length <= 28) {
      return { fontSize: '0.5625rem', lineClamp: 5 };
    }
    return { fontSize: '0.5rem', lineClamp: 6 };
  }

  if (variant === 'hero') {
    if (length <= 10) {
      return { fontSize: '1.25rem', lineClamp: 3 };
    }
    if (length <= 18) {
      return { fontSize: '1.125rem', lineClamp: 3 };
    }
    if (length <= 30) {
      return { fontSize: '1rem', lineClamp: 4 };
    }
    if (length <= 45) {
      return { fontSize: '0.875rem', lineClamp: 4 };
    }
    if (length <= 60) {
      return { fontSize: '0.8125rem', lineClamp: 5 };
    }
    return { fontSize: '0.75rem', lineClamp: 6 };
  }

  // card — main grid view
  if (length <= 8) {
    return { fontSize: '2rem', lineClamp: 2 };
  }
  if (length <= 14) {
    return { fontSize: '1.75rem', lineClamp: 2 };
  }
  if (length <= 22) {
    return { fontSize: '1.4375rem', lineClamp: 3 };
  }
  if (length <= 32) {
    return { fontSize: '1.1875rem', lineClamp: 3 };
  }
  if (length <= 45) {
    return { fontSize: '1rem', lineClamp: 4 };
  }
  if (length <= 60) {
    return { fontSize: '0.875rem', lineClamp: 5 };
  }
  return { fontSize: '0.75rem', lineClamp: 6 };
}
