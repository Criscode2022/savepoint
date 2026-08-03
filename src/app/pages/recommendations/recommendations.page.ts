import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonIcon,
  IonSpinner,
  IonButton,
  IonChip,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  bulbOutline,
  heartOutline,
  openOutline,
  refreshOutline,
  starOutline,
  gameControllerOutline,
  sparklesOutline,
  addOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { Game, GamePlayStatus } from '../../models/game.model';
import {
  GameRecommendation,
  RecommendationsResult,
} from '../../models/recommendation.model';
import { GameService } from '../../services/game.service';
import { RecommendationsService } from '../../services/recommendations.service';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonIcon,
    IonSpinner,
    IonButton,
    IonChip,
    IonToast,
  ],
  templateUrl: './recommendations.page.html',
  styles: [
    `
      .recs-content {
        --background: var(--vault-bg);
      }

      .recs-wrap {
        max-width: 1100px;
        margin: 0 auto;
        padding: 1rem 1.25rem 2.5rem;
      }

      .recs-hero {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: 1.25rem;
      }

      .recs-hero__icon {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: rgba(168, 85, 247, 0.16);
        border: 1px solid rgba(168, 85, 247, 0.3);
        color: #e9d5ff;
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .recs-hero__title {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 750;
      }

      .recs-hero__sub {
        margin: 0.35rem 0 0;
        color: var(--ink-muted);
        font-size: 0.875rem;
        max-width: 52ch;
        line-height: 1.5;
      }

      .taste-panel {
        padding: 1rem 1.1rem;
        border-radius: 14px;
        background: var(--vault-elevated);
        border: 1px solid var(--border-subtle);
        margin-bottom: 1.25rem;
      }

      .taste-panel__title {
        margin: 0 0 0.75rem;
        font-size: 0.8125rem;
        font-weight: 750;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--ink-muted);
      }

      .taste-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .taste-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--ink-muted);
        margin-right: 0.25rem;
        min-width: 4.5rem;
      }

      .taste-chip {
        --background: rgba(168, 85, 247, 0.14);
        --color: #e9d5ff;
        font-size: 0.75rem;
        height: 28px;
        min-height: 28px;
      }

      .taste-chip--platform {
        --background: rgba(6, 182, 212, 0.12);
        --color: #a5f3fc;
      }

      .taste-chip--seed {
        --background: rgba(255, 255, 255, 0.06);
        --color: var(--ink-secondary);
      }

      .recs-loading {
        display: grid;
        place-items: center;
        gap: 0.75rem;
        min-height: 30vh;
        color: var(--ink-muted);
        font-size: 0.875rem;
      }

      .recs-banner {
        padding: 1rem 1.1rem;
        border-radius: 12px;
        background: rgba(168, 85, 247, 0.08);
        border: 1px solid rgba(168, 85, 247, 0.22);
        color: var(--ink-secondary);
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }

      .recs-banner--warn {
        display: flex;
        gap: 0.85rem;
        align-items: flex-start;
      }

      .recs-banner--warn ion-icon {
        font-size: 1.35rem;
        color: #e9d5ff;
        margin-top: 0.15rem;
      }

      .recs-banner a {
        color: #c4b5fd;
      }

      .recs-banner code {
        font-size: 0.8125rem;
        background: rgba(0, 0, 0, 0.35);
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
      }

      .recs-banner p {
        margin: 0.35rem 0 0;
      }

      .recs-empty {
        text-align: center;
        padding: 2.5rem 1rem;
        color: var(--ink-secondary);
      }

      .recs-empty ion-icon {
        font-size: 2.5rem;
        color: var(--ink-muted);
      }

      .recs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1rem;
      }

      .rec-card {
        display: flex;
        flex-direction: column;
        border-radius: 14px;
        overflow: hidden;
        background: var(--vault-elevated);
        border: 1px solid var(--border-subtle);
        transition: transform 160ms ease, border-color 160ms ease;
      }

      .rec-card:hover {
        transform: translateY(-3px);
        border-color: rgba(168, 85, 247, 0.35);
      }

      .rec-card__art {
        position: relative;
        aspect-ratio: 16 / 10;
        background: #12121a center / cover no-repeat;
      }

      .rec-card__art--empty {
        background:
          radial-gradient(circle at 30% 20%, rgba(168, 85, 247, 0.25), transparent 50%),
          linear-gradient(145deg, #1a1a30, #10101a);
      }

      .rec-card__source {
        position: absolute;
        top: 0.55rem;
        left: 0.55rem;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        background: rgba(10, 10, 15, 0.72);
        color: #e9d5ff;
        font-size: 0.625rem;
        font-weight: 750;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .rec-card__score {
        position: absolute;
        top: 0.55rem;
        right: 0.55rem;
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0.2rem 0.45rem;
        border-radius: 8px;
        background: rgba(10, 10, 15, 0.72);
        color: #fbbf24;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .rec-card__body {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.9rem 0.95rem 1rem;
        flex: 1;
      }

      .rec-card__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 750;
        line-height: 1.3;
      }

      .rec-card__reason {
        margin: 0;
        font-size: 0.8125rem;
        color: #c4b5fd;
        font-weight: 550;
      }

      .rec-card__meta {
        margin: 0;
        font-size: 0.75rem;
        color: var(--ink-muted);
      }

      .rec-card__platforms {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin-top: 0.15rem;
      }

      .rec-card__platforms span {
        font-size: 0.625rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: var(--ink-muted);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 0.15rem 0.35rem;
      }

      .rec-card__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: auto;
        padding-top: 0.75rem;
      }

      .rec-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        min-height: 36px;
        padding: 0 0.7rem;
        border-radius: 10px;
        font: inherit;
        font-size: 0.8125rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        border: 0;
      }

      .rec-btn--primary {
        flex: 1 1 auto;
        background: rgba(168, 85, 247, 0.2);
        color: #e9d5ff;
        border: 1px solid rgba(168, 85, 247, 0.4);
      }

      .rec-btn--primary:hover:not(:disabled) {
        background: rgba(168, 85, 247, 0.32);
      }

      .rec-btn--wishlist {
        flex: 1 1 auto;
        background: rgba(236, 72, 153, 0.16);
        color: #fbcfe8;
        border: 1px solid rgba(236, 72, 153, 0.35);
      }

      .rec-btn--wishlist:hover:not(:disabled) {
        background: rgba(236, 72, 153, 0.28);
      }

      .rec-btn--primary:disabled,
      .rec-btn--wishlist:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .rec-btn--ghost {
        background: transparent;
        color: var(--ink-secondary);
        border: 1px solid var(--border-subtle);
      }

      .rec-btn--ghost:hover {
        color: var(--ink-primary);
        border-color: rgba(168, 85, 247, 0.35);
      }
    `,
  ],
})
export class RecommendationsPage implements OnInit, OnDestroy {
  loading = true;
  result: RecommendationsResult | null = null;
  games: Game[] = [];
  /** `${externalId}:library` | `${externalId}:wishlist` while saving */
  addingKey: string | null = null;
  toastMessage = '';
  toastColor: 'success' | 'danger' | 'warning' = 'success';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly gameService: GameService,
    private readonly recommendations: RecommendationsService,
  ) {
    addIcons({
      arrowBackOutline,
      bulbOutline,
      heartOutline,
      openOutline,
      refreshOutline,
      starOutline,
      gameControllerOutline,
      sparklesOutline,
      addOutline,
    });
  }

  ngOnInit(): void {
    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.games = games;
    });

    this.gameService
      .getGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (games) => {
          this.games = games;
          this.loadRecommendations();
        },
        error: () => {
          this.loading = false;
          this.toast('Failed to load library', 'danger');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.loading = true;
    this.recommendations
      .getRecommendations(this.games)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.result = result;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toast('Failed to load recommendations', 'danger');
        },
      });
  }

  sourceLabel(source: GameRecommendation['source']): string {
    switch (source) {
      case 'similar':
        return 'Similar';
      case 'genre':
        return 'Genre';
      case 'platform':
        return 'Platform';
      case 'developer':
        return 'Studio';
      default:
        return source;
    }
  }

  isAdding(rec: GameRecommendation): boolean {
    return this.addingKey?.startsWith(`${rec.externalId}:`) ?? false;
  }

  addToLibrary(rec: GameRecommendation): void {
    this.addRecommendation(rec, 'not_started', 'library');
  }

  addToWishlist(rec: GameRecommendation): void {
    this.addRecommendation(rec, 'wishlist', 'wishlist');
  }

  private addRecommendation(
    rec: GameRecommendation,
    status: GamePlayStatus,
    destination: 'library' | 'wishlist',
  ): void {
    if (this.addingKey != null) {
      return;
    }

    const already = this.games.some(
      (g) => g.title.toLowerCase() === rec.title.toLowerCase(),
    );
    if (already) {
      this.toast('Already in your vault', 'warning');
      return;
    }

    this.addingKey = `${rec.externalId}:${destination}`;
    const platformHint = rec.platforms[0] || 'PC';
    const platformId = this.guessPlatformId(platformHint);
    const placeLabel = destination === 'library' ? 'library' : 'wishlist';

    this.gameService
      .saveGameFromForm({
        title: rec.title,
        description: rec.reason,
        coverImage: rec.backgroundImage || undefined,
        platformId,
        developerName: 'Unknown',
        releaseYear: rec.releaseYear,
        genre: rec.genres.slice(0, 4),
        tags: ['recommended'],
        status,
        notes: `Recommended via RAWG (${rec.source}). ${rec.rawgUrl}`,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.addingKey = null;
          this.toast(`“${rec.title}” added to ${placeLabel}`, 'success');
          if (this.result) {
            this.result = {
              ...this.result,
              items: this.result.items.filter((i) => i.externalId !== rec.externalId),
            };
          }
        },
        error: (err) => {
          this.addingKey = null;
          this.toast(err?.message || `Could not add to ${placeLabel}`, 'danger');
        },
      });
  }

  trackById(_i: number, rec: GameRecommendation): number {
    return rec.externalId;
  }

  private guessPlatformId(platformName: string): string {
    const p = platformName.toLowerCase();
    if (p.includes('playstation 5') || p.includes('ps5')) return 'ps5';
    if (p.includes('playstation 4') || p.includes('ps4')) return 'ps4';
    if (p.includes('xbox series')) return 'xbox-series';
    if (p.includes('xbox one')) return 'xbox-one';
    if (p.includes('switch')) return 'switch';
    if (p.includes('steam deck')) return 'steam-deck';
    return 'pc';
  }

  private toast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success',
  ): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
