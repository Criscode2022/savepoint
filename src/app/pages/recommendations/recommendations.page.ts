import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Subject, takeUntil } from 'rxjs';
import { Game, GamePlayStatus } from '../../models/game.model';
import {
  GameRecommendation,
  RecommendationsResult,
} from '../../models/recommendation.model';
import { GameService } from '../../services/game.service';
import { RecommendationsService } from '../../services/recommendations.service';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, IonContent, IonIcon, IonSpinner, IonToast],
  templateUrl: './recommendations.page.html',
  styleUrl: './recommendations.page.scss',
})
export class RecommendationsPage implements OnInit, OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly recommendations = inject(RecommendationsService);

  protected loading = true;
  protected result: RecommendationsResult | null = null;
  private games: Game[] = [];
  /** `${externalId}:library` | `${externalId}:wishlist` while saving */
  protected addingKey: string | null = null;
  protected toastMessage = '';
  protected toastColor: 'success' | 'danger' | 'warning' = 'success';

  private readonly destroy$ = new Subject<void>();

  public ngOnInit(): void {
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
          this.toast("Couldn't load your library. Try again.", 'danger');
        },
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected reload(): void {
    this.loadRecommendations();
  }

  private loadRecommendations(): void {
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
          this.toast("Couldn't load picks right now. Try Shuffle picks in a moment.", 'danger');
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
    return this.addingKey?.startsWith(`${rec.externalId}:`) ?? false;
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
    if (this.addingKey != null) {
      return;
    }

    const already = this.games.some(
      (g) => g.title.toLowerCase() === rec.title.toLowerCase(),
    );
    if (already) {
      this.toast('Already in your library', 'warning');
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

  private trackById(_i: number, rec: GameRecommendation): number {
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
