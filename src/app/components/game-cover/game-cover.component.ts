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
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .game-cover {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      container-type: size;
      background: linear-gradient(145deg, #1a1a30 0%, #12121f 55%, #0f0f1c 100%);
      /* Subtle vignette for premium image presentation */
      box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.45);
    }

    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
      transition: transform 520ms var(--ease-spring, cubic-bezier(0.25, 0.9, 0.3, 1));
      /* Subtle premium framing */
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
    }

    .game-cover--landscape .cover-image {
      position: relative;
      z-index: 1;
      object-fit: contain;
    }

    .cover-backdrop {
      position: absolute;
      inset: -10%;
      background-size: cover;
      background-position: center;
      filter: blur(16px) saturate(1.12);
      opacity: 0.5;
      pointer-events: none;
    }

    .game-cover--landscape {
      background:
        radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.16) 0%, transparent 45%),
        linear-gradient(145deg, #171728 0%, #10101c 100%);
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.875rem;
      text-align: center;
      background:
        radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.14) 0%, transparent 40%),
        linear-gradient(145deg, #1e1e36 0%, #141425 100%);
      border: 1px solid rgba(168, 85, 247, 0.18);
    }

    .placeholder-title {
      color: #ddd6fe;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: anywhere;
      max-width: 100%;
      max-height: 100%;
      text-wrap: balance;
      font-size: var(--placeholder-size, 1.125rem);
    }

    .game-cover--card .cover-placeholder {
      padding: 1rem 1.125rem;
    }

    .game-cover--card .placeholder-title {
      font-size: min(var(--placeholder-size, 1.25rem), 14cqmin);
    }

    .game-cover--hero .cover-placeholder {
      padding: 0.75rem 0.625rem;
    }

    .game-cover--hero .placeholder-title {
      font-size: min(var(--placeholder-size, 1.125rem), 10cqmin);
      line-height: 1.2;
      font-weight: 700;
    }

    .game-cover--thumbnail .cover-placeholder {
      padding: 0.375rem;
    }

    .game-cover--thumbnail .placeholder-title {
      font-size: min(var(--placeholder-size, 0.625rem), 18cqmin);
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1.2;
    }
  `],
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
