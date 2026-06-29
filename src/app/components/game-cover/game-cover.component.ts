import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-cover',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-cover" [class]="'game-cover--' + variant">
      <img
        *ngIf="showImage"
        [src]="coverImage!"
        [alt]="title"
        class="cover-image"
        loading="lazy"
        (error)="onImageError()"
      />
      <div *ngIf="!showImage" class="cover-placeholder" aria-hidden="true">
        <span class="placeholder-title">{{ title }}</span>
      </div>
    </div>
  `,
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
      background: linear-gradient(145deg, #1a1a30 0%, #12121f 55%, #0f0f1c 100%);
    }

    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.45s ease;
    }

    .cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      text-align: center;
      background:
        radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.14) 0%, transparent 40%),
        linear-gradient(145deg, #1e1e36 0%, #141425 100%);
      border: 1px solid rgba(168, 85, 247, 0.18);
    }

    .placeholder-title {
      color: #c4b5fd;
      font-size: clamp(0.75rem, 2.8vw, 1rem);
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 0.01em;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .game-cover--hero .placeholder-title {
      font-size: clamp(0.875rem, 2.2vw, 1.125rem);
      -webkit-line-clamp: 5;
    }

    .game-cover--thumbnail .placeholder-title {
      font-size: 0.625rem;
      -webkit-line-clamp: 3;
      padding: 0.25rem;
    }
  `],
})
export class GameCoverComponent implements OnChanges {
  @Input() title = '';
  @Input() coverImage?: string | null;
  @Input() variant: 'card' | 'hero' | 'thumbnail' = 'card';

  showImage = false;

  ngOnChanges(): void {
    this.showImage = this.hasCoverImage(this.coverImage);
  }

  onImageError(): void {
    this.showImage = false;
  }

  private hasCoverImage(url?: string | null): boolean {
    return !!url?.trim();
  }
}
