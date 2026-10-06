import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonIcon, IonSpinner, IonToast } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bulbOutline,
  heartOutline,
  openOutline,
  refreshOutline,
  starOutline,
  gameControllerOutline,
  sparklesOutline,
  addOutline,
} from 'ionicons/icons';
import { GamePlayStatus } from '../../models/game.model';
import {
  GameRecommendation,
  RecommendationsResult,
} from '../../models/recommendation.model';
import { GameService } from '../../services/game.service';
import { RecommendationsService } from '../../services/recommendations.service';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ToastState } from '../../shared/toast-state';

addIcons({
  bulbOutline,
  heartOutline,
  openOutline,
  refreshOutline,
  starOutline,
  gameControllerOutline,
  sparklesOutline,
  addOutline,
});

@Component({
  selector: 'app-recommendations',
  imports: [PageHeaderComponent, IonContent, IonIcon, IonSpinner, IonToast],
  templateUrl: './recommendations.page.html',
  styleUrl: './recommendations.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendationsPage {
  private readonly gameService = inject(GameService);
  private readonly recommendations = inject(RecommendationsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly result = signal<RecommendationsResult | null>(null);
  /** `${externalId}:library` | `${externalId}:wishlist` while saving */
  protected readonly addingKey = signal<string | null>(null);
  protected readonly toast = new ToastState();

  constructor() {
    // Picks are seeded from the library, so make sure it is fresh before asking for them.
    this.gameService
      .loadGames()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => this.loadRecommendations(),
        error: () => {
          this.loading.set(false);
          this.toast.show("Couldn't load your library. Try again.", 'danger');
        },
      });
  }

  protected reload(): void {
    this.loadRecommendations();
  }

  private loadRecommendations(): void {
    this.loading.set(true);
    this.recommendations
      .getRecommendations(this.gameService.games())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.show("Couldn't load picks right now. Try Shuffle picks in a moment.", 'danger');
        },
      });
  }

  protected sourceLabel(source: GameRecommendation['source']): string {
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

  protected isAdding(rec: GameRecommendation): boolean {
    return this.addingKey()?.startsWith(`${rec.externalId}:`) ?? false;
  }

  protected addToLibrary(rec: GameRecommendation): void {
    this.addRecommendation(rec, 'not_started', 'library');
  }

  protected addToWishlist(rec: GameRecommendation): void {
    this.addRecommendation(rec, 'wishlist', 'wishlist');
  }

  private addRecommendation(
    rec: GameRecommendation,
    status: GamePlayStatus,
    destination: 'library' | 'wishlist',
  ): void {
    if (this.addingKey() != null) {
      return;
    }

    const already = this.gameService.games().some(
      (g) => g.title.toLowerCase() === rec.title.toLowerCase(),
    );
    if (already) {
      this.toast.show('Already in your library', 'warning');
      return;
    }

    this.addingKey.set(`${rec.externalId}:${destination}`);
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.addingKey.set(null);
          this.toast.show(`“${rec.title}” added to ${placeLabel}`);
          this.result.update((result) =>
            result && {
              ...result,
              items: result.items.filter((i) => i.externalId !== rec.externalId),
            },
          );
        },
        error: (err: { message?: string }) => {
          this.addingKey.set(null);
          this.toast.show(err?.message || `Could not add to ${placeLabel}`, 'danger');
        },
      });
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
}
