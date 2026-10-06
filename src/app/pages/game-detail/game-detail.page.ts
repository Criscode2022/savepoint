import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonIcon, IonToast, IonSelect, IonSelectOption, IonInput,
  AlertController, ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, starOutline, timeOutline, gameControllerOutline, checkmarkCircleOutline,
  createOutline, trashOutline, ellipseOutline, heartOutline, chevronDownOutline,
  pauseCircleOutline, playCircleOutline, closeOutline, libraryOutline,
} from 'ionicons/icons';
import { Game, GAME_STATUS_ICONS, GAME_STATUS_LABELS, GamePlayStatus, PlaySession } from '../../models/game.model';
import { ClockService } from '../../services/clock.service';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { GameRatingComponent } from '../../components/game-rating/game-rating.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { canAddWishlistToLibrary, formatReleaseCountdown } from '../../shared/utils/release-countdown';
import {
  confirmResetPlayHistory,
  statusChangeClearsPlayHistory,
  statusChangeMessage,
} from '../../shared/utils/game-status.utils';
import { canRateGame, formatRatingLabel, isRated } from '../../shared/utils/rating.utils';
import { ToastState } from '../../shared/toast-state';

addIcons({
  addOutline, starOutline, timeOutline, gameControllerOutline, checkmarkCircleOutline,
  createOutline, trashOutline, ellipseOutline, heartOutline, chevronDownOutline,
  pauseCircleOutline, playCircleOutline, closeOutline, libraryOutline,
});

interface TimelineEvent {
  label: string;
  date: string;
  icon: string;
}

const LIBRARY_STATUSES: GamePlayStatus[] = ['not_started', 'playing', 'paused', 'completed'];

@Component({
  selector: 'app-game-detail',
  imports: [
    DatePipe, FormsModule, RouterLink, GameCoverComponent, GameRatingComponent, PageHeaderComponent,
    IonContent, IonIcon, IonToast, IonSelect, IonSelectOption, IonInput,
  ],
  templateUrl: './game-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailPage implements ViewWillEnter {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private readonly alertController = inject(AlertController);
  private readonly clock = inject(ClockService);

  private readonly statusSelect = viewChild<IonSelect>('statusSelect');

  protected readonly statusSheetOptions = {
    header: 'Set status',
    cssClass: 'app-status-sheet',
  };
  protected readonly toast = new ToastState();

  protected readonly game = signal<Game | null>(null);
  protected readonly playSessions = signal<PlaySession[]>([]);
  protected readonly ratingSaving = signal(false);
  protected readonly ratingPreview = signal<number | null>(null);
  protected readonly logHours = signal<number | null>(1);
  protected readonly loggingPlaytime = signal(false);

  protected readonly heroCoverImage = computed(() => this.game()?.coverImage?.trim() || null);
  protected readonly heroBackgroundImage = computed(() => {
    const cover = this.heroCoverImage();
    return cover ? `url("${cover}")` : 'none';
  });

  /** Reads the shared clock, so a wishlist game unlocks on release day without a reload */
  protected readonly isWishlistLocked = computed(() => {
    const game = this.game();
    return !!game && game.status === 'wishlist' && !canAddWishlistToLibrary(game, this.clock.now());
  });

  protected readonly countdownLabel = computed(() => {
    const game = this.game();
    return game ? formatReleaseCountdown(game, this.clock.now()).label : '';
  });

  protected readonly availableStatusOptions = computed<GamePlayStatus[]>(() =>
    this.isWishlistLocked() ? ['wishlist'] : LIBRARY_STATUSES,
  );

  protected readonly canLogHours = computed(() => {
    const hours = Number(this.logHours());
    return Number.isFinite(hours) && hours > 0;
  });

  protected readonly hasRating = computed(() => {
    const game = this.game();
    return !!game && isRated(game);
  });

  protected readonly canShowRating = computed(() => canRateGame(this.game()?.status));
  protected readonly ratingDisplay = computed(() => formatRatingLabel(this.ratingPreview() ?? this.game()?.rating));

  protected readonly canMarkCompleted = computed(() => {
    const status = this.game()?.status;
    return status === 'playing' || status === 'paused';
  });

  protected readonly hasPlatform = computed(() => {
    const name = this.game()?.platform.name;
    return !!name && name !== 'Unknown';
  });

  protected readonly formattedReleaseDate = computed(() => {
    const releaseDate = this.game()?.releaseDate;
    if (!releaseDate) {
      return '';
    }

    const parsed = new Date(`${releaseDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return releaseDate;
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  protected readonly playtimeDisplay = computed(() => {
    const game = this.game();
    const hours = game ? (game.playtimeHours ?? game.playtime) : null;
    return hours != null && hours > 0 ? `${hours}h` : '0h';
  });

  protected readonly trackedMinutesDisplay = computed(() => {
    const totalMinutes = this.playSessions().reduce(
      (sum, session) => sum + (session.durationMinutes ?? 0),
      0,
    );
    return formatMinutes(Math.max(0, totalMinutes));
  });

  protected readonly timelineEvents = computed(() => {
    const game = this.game();
    return game ? buildTimeline(game, this.canShowRating()) : [];
  });

  protected readonly formatMinutes = formatMinutes;

  public ionViewWillEnter(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGame(gameId);
    }
  }

  private loadGame(id: string): void {
    const cached = this.gameService.getCachedGameById(id);
    if (cached) {
      this.game.set({ ...cached });
    }

    this.gameService.getGameById(id).subscribe({
      next: (game) => {
        if (game) {
          this.game.set(game);
          this.loadPlaySessions(game.id);
        } else {
          void this.router.navigate(['/home']);
        }
      },
      error: () => {
        void this.router.navigate(['/home']);
      },
    });
  }

  private loadPlaySessions(gameId: string): void {
    this.gameService.getPlaySessions(gameId).subscribe({
      next: (sessions) => this.playSessions.set(sessions),
    });
  }

  protected openStatusSelect(event: Event, statusSelect: IonSelect): void {
    if (this.isWishlistLocked()) {
      return;
    }

    void statusSelect.open(event as UIEvent);
  }

  protected logPlaytime(): void {
    const game = this.game();
    if (!game || !this.canLogHours() || this.loggingPlaytime()) {
      return;
    }
    const hours = Number(this.logHours());
    this.loggingPlaytime.set(true);
    this.gameService.logPlaytime(game.id, hours).subscribe({
      next: (updated) => {
        this.game.set(updated);
        this.loggingPlaytime.set(false);
        this.logHours.set(1);
        this.loadPlaySessions(updated.id);
        this.toast.show(`+${hours}h logged — progress saved`);
      },
      error: (err: { message?: string }) => {
        this.loggingPlaytime.set(false);
        this.toast.show(err?.message || "Couldn't log that session. Try again.", 'danger');
      },
    });
  }

  protected async onStatusSelect(event: CustomEvent<{ value?: GamePlayStatus }>): Promise<void> {
    const status = event.detail.value;
    const previousStatus = this.game()?.status;

    if (
      !status ||
      !previousStatus ||
      status === previousStatus ||
      !this.availableStatusOptions().includes(status)
    ) {
      return;
    }

    if (statusChangeClearsPlayHistory(previousStatus, status)) {
      const confirmed = await confirmResetPlayHistory(this.alertController);
      if (!confirmed) {
        this.resetStatusSelect(previousStatus);
        return;
      }
    }

    this.applyStatus(status);
  }

  /** The select keeps the user's pick; put it back when the change doesn't go through */
  private resetStatusSelect(status: GamePlayStatus): void {
    const select = this.statusSelect();
    if (select) {
      select.value = status;
    }
  }

  protected applyStatus(status: GamePlayStatus): void {
    const game = this.game();
    if (!game || game.status === status) return;

    this.gameService.setStatus(game.id, status, game).subscribe({
      next: (updatedGame) => {
        this.game.set(updatedGame);
        this.loadPlaySessions(updatedGame.id);
        this.toast.show(statusChangeMessage(updatedGame.title, status));
      },
      error: () => {
        this.resetStatusSelect(game.status);
        this.toast.show("Couldn't update the status. Try again.", 'danger');
      },
    });
  }

  protected getStatusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }

  protected getStatusIcon(status: GamePlayStatus): string {
    return GAME_STATUS_ICONS[status];
  }

  protected onRatingChange(rating: number | null): void {
    const game = this.game();
    if (!game || !this.canShowRating()) {
      return;
    }

    this.ratingPreview.set(null);
    this.ratingSaving.set(true);
    this.gameService.setRating(game.id, rating, game).subscribe({
      next: (updatedGame) => {
        this.game.set(updatedGame);
        this.ratingSaving.set(false);
        this.toast.show(rating != null ? 'Rating saved' : 'Rating cleared');
      },
      error: () => {
        this.ratingSaving.set(false);
        this.toast.show("Couldn't save your rating. Try again.", 'danger');
      },
    });
  }

  protected async removeCoverImage(): Promise<void> {
    if (!this.game()) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Remove cover image?',
      message: 'The cover will be removed from this game.',
      cssClass: 'app-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'app-alert-btn-cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          cssClass: 'app-alert-btn-delete',
          handler: () => this.performRemoveCoverImage(),
        },
      ],
    });

    await alert.present();
  }

  private performRemoveCoverImage(): void {
    const currentGame = this.game();
    if (!currentGame) {
      return;
    }

    this.game.set({ ...currentGame, coverImage: undefined });

    this.gameService.updateGame(currentGame.id, { coverImage: null }).subscribe({
      next: (updatedGame) => {
        this.game.set({ ...updatedGame, coverImage: undefined });
        this.toast.show('Cover image removed');
      },
      error: () => {
        this.game.set(currentGame);
        this.toast.show("Couldn't remove the cover. Try again.", 'danger');
      },
    });
  }

  protected async deleteGame(): Promise<void> {
    const game = this.game();
    if (!game) return;

    const alert = await this.alertController.create({
      header: `Remove ${game.title}?`,
      message: 'Its status, rating, playtime and notes will be permanently deleted.',
      cssClass: 'app-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'app-alert-btn-cancel',
        },
        {
          text: 'Remove',
          role: 'destructive',
          cssClass: 'app-alert-btn-delete',
          handler: () => this.performDelete(game),
        },
      ],
    });

    await alert.present();
  }

  private performDelete(game: Game): void {
    const title = game.title;
    this.gameService.deleteGame(game.id).subscribe({
      next: () => {
        void this.router.navigate(['/home'], {
          state: { toast: `${title} removed from your library` },
        });
      },
      error: () => {
        this.toast.show(`Couldn't remove ${title}. Try again.`, 'danger');
      },
    });
  }
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function buildTimeline(game: Game, includeRating: boolean): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (game.status === 'wishlist') {
    events.push({ label: 'Added to wishlist', date: game.createdAt, icon: 'heart-outline' });
  } else if (game.libraryAddedAt) {
    events.push({ label: 'Added to wishlist', date: game.createdAt, icon: 'heart-outline' });
    events.push({ label: 'Added to library', date: game.libraryAddedAt, icon: 'game-controller-outline' });
  } else {
    events.push({ label: 'Added to library', date: game.createdAt, icon: 'game-controller-outline' });
  }

  if (game.startedAt) {
    events.push({ label: 'Started playing', date: game.startedAt, icon: 'time-outline' });
  }

  if (game.lastPlayedAt) {
    events.push({ label: 'Last played', date: game.lastPlayedAt, icon: 'time-outline' });
  }

  if (game.completedAt) {
    events.push({ label: 'Completed', date: game.completedAt, icon: 'checkmark-circle-outline' });
  }

  if (includeRating && game.ratedAt) {
    events.push({ label: 'Rated', date: game.ratedAt, icon: 'star-outline' });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
