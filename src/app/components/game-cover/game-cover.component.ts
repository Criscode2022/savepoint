import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

type CoverVariant = 'card' | 'hero' | 'thumbnail';

interface PlaceholderMetrics {
  fontSize: string;
  lineClamp: number;
}

@Component({
  selector: 'app-game-cover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-cover.component.html',
  styleUrl: './game-cover.component.scss',

})
export class GameCoverComponent implements OnChanges {
  @Input() title = '';
  @Input() coverImage?: string | null;
  @Input() variant: CoverVariant = 'card';

  showImage = false;
  isLandscape = false;
  placeholderMetrics: PlaceholderMetrics = { fontSize: '1.25rem', lineClamp: 4 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coverImage']) {
      this.isLandscape = false;
      const next = changes['coverImage'].currentValue as string | null | undefined;
      this.showImage = this.hasCoverImage(next);
    } else {
      this.showImage = this.hasCoverImage(this.coverImage);
    }

    this.placeholderMetrics = this.getPlaceholderMetrics(
      this.variant,
      (this.title ?? '').trim().length,
    );
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.isLandscape = img.naturalWidth > img.naturalHeight * 1.02;
  }

  onImageError(): void {
    this.showImage = false;
    this.isLandscape = false;
  }

  private hasCoverImage(url?: string | null): boolean {
    return !!url?.trim();
  }

  private getPlaceholderMetrics(variant: CoverVariant, length: number): PlaceholderMetrics {
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
}
