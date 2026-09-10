import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { 
    IonContent, IonHeader, IonToolbar, IonBackButton,
    IonIcon, IonButton, IonCard, IonCardContent,
  IonChip, IonToast, IonSelect, IonSelectOption, IonInput, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, starOutline, timeOutline, calendarOutline,
  businessOutline, personOutline, gameControllerOutline,
  checkmarkCircleOutline, createOutline, trashOutline, ellipseOutline, heartOutline,
  chevronDownOutline, pauseCircleOutline
} from 'ionicons/icons';
import { Game, GAME_STATUS_LABELS, GamePlayStatus, PlaySession } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { GameRatingComponent } from '../../components/game-rating/game-rating.component';
import { canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import {
  confirmResetPlayHistory,
  statusChangeClearsPlayHistory,
} from '../../shared/utils/game-status.utils';
import { canRateGame, formatRatingLabel } from '../../shared/utils/rating.utils';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, GameCoverComponent, GameRatingComponent,
    IonContent, IonHeader, IonToolbar, IonBackButton,
    IonIcon, IonButton, IonCard, IonCardContent,
    IonChip, IonToast, IonSelect, IonSelectOption, IonInput
  ],
  templateUrl: './game-detail.page.html',
})
export class GameDetailPage implements OnInit, ViewWillEnter {
  @ViewChild('statusSelect') private statusSelect?: IonSelect;

  protected game: Game | null = null;
  protected playSessions: PlaySession[] = [];
  protected readonly statusSheetOptions = {
    header: 'Change status',
    cssClass: 'app-status-sheet',
  };
  protected toastMessage = '';
  protected toastColor: 'success' | 'danger' | 'warning' = 'success';
  protected ratingSaving = false;
  protected ratingPreview: number | null = null;
  protected logHours: number | null = 1;
  protected loggingPlaytime = false;

  protected get heroCoverImage(): string | null {
    const cover = this.game?.coverImage?.trim();
    return cover || null;
  }

  protected hasCoverImage(): boolean {
    return !!this.heroCoverImage;
  }

  protected getHeroBackgroundImage(): string {
    return this.heroCoverImage ? `url("${this.heroCoverImage}")` : 'none';
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly gameService: GameService,
    private readonly alertController: AlertController,
  ) {
    addIcons({
      arrowBackOutline, starOutline, timeOutline, calendarOutline,
      businessOutline, personOutline, gameControllerOutline,
      checkmarkCircleOutline, createOutline, trashOutline, ellipseOutline, heartOutline,
      chevronDownOutline, pauseCircleOutline
    });
  }

  public ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGame(gameId);
    }
  }

  public ionViewWillEnter(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGame(gameId);
    }
  }

  private loadGame(id: string): void {
    const cached = this.gameService.getCachedGameById(id);
    if (cached) {
      this.game = { ...cached };
    }

    this.gameService.getGameById(id).subscribe({
      next: (game) => {
        if (game) {
          this.game = game;
          this.loadPlaySessions(game.id);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.router.navigate(['/home']);
      }
    });
  }

  private loadPlaySessions(gameId: string): void {
    this.gameService.getPlaySessions(gameId).subscribe({
      next: (sessions) => {
        this.playSessions = sessions;
      },
    });
  }

  protected openStatusSelect(event: Event, statusSelect: IonSelect): void {
    if (this.isWishlistLocked()) {
      return;
    }

    statusSelect.open(event as UIEvent);
  }

  protected isWishlistLocked(): boolean {
    return !!this.game && this.game.status === 'wishlist' && !canAddWishlistToLibrary(this.game);
  }

  protected canLogHours(): boolean {
    const n = Number(this.logHours);
    return Number.isFinite(n) && n > 0;
  }

  protected logPlaytime(): void {
    if (!this.game || !this.canLogHours() || this.loggingPlaytime) {
      return;
    }
    this.loggingPlaytime = true;
    this.gameService.logPlaytime(this.game.id, Number(this.logHours)).subscribe({
      next: (updated) => {
        this.game = updated;
        this.loggingPlaytime = false;
        this.logHours = 1;
        this.loadPlaySessions(updated.id);
        this.showToast('Playtime logged', 'success');
      },
      error: (err) => {
        this.loggingPlaytime = false;
        this.showToast(err?.message || 'Failed to log playtime', 'danger');
      },
    });
  }

  protected async onStatusSelect(event: CustomEvent): Promise<void> {
    const status = event.detail.value as GamePlayStatus;
    const previousStatus = this.game?.status;

    if (
      !status ||
      !this.game ||
      !previousStatus ||
      status === previousStatus ||
      !this.getAvailableStatusOptions().includes(status)
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

  private resetStatusSelect(status: GamePlayStatus): void {
    if (this.statusSelect) {
      this.statusSelect.value = status;
    }
  }

  private applyStatus(status: GamePlayStatus): void {
    if (!this.game || this.game.status === status) return;

    this.gameService.setStatus(this.game.id, status, this.game).subscribe({
      next: (updatedGame) => {
        this.game = updatedGame;
        this.loadPlaySessions(updatedGame.id);
        this.showToast(`${this.getStatusLabel(status)} status saved`, 'success');
      },
      error: () => {
        this.resetStatusSelect(this.game!.status);
        this.showToast('Failed to update status', 'danger');
      },
    });
  }

  protected getAvailableStatusOptions(): GamePlayStatus[] {
    if (this.game?.status === 'wishlist') {
      if (this.isWishlistLocked()) {
        return ['wishlist'];
      }

      return ['not_started', 'playing', 'paused', 'completed'];
    }

    return ['not_started', 'playing', 'paused', 'completed'];
  }

  private setStatus(status: GamePlayStatus): void {
    void this.applyStatusWithConfirmation(status);
  }

  private async applyStatusWithConfirmation(status: GamePlayStatus): Promise<void> {
    if (!this.game || this.game.status === status) return;

    if (statusChangeClearsPlayHistory(this.game.status, status)) {
      const confirmed = await confirmResetPlayHistory(this.alertController);
      if (!confirmed) {
        return;
      }
    }

    this.applyStatus(status);
  }

  protected getStatusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }

  protected getStatusIcon(status: GamePlayStatus): string {
    const icons: Record<GamePlayStatus, string> = {
      not_started: 'ellipse-outline',
      playing: 'time-outline',
      paused: 'pause-circle-outline',
      completed: 'checkmark-circle-outline',
      wishlist: 'heart-outline',
    };
    return icons[status];
  }

  protected getFormattedReleaseDate(): string {
    if (!this.game?.releaseDate) {
      return '';
    }

    const parsed = new Date(`${this.game.releaseDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return this.game.releaseDate;
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  protected getPlaytime(): number | null {
    if (!this.game) return null;
    const hours = this.game.playtimeHours ?? this.game.playtime;
    return hours != null && hours > 0 ? hours : null;
  }

  protected canShowRating(): boolean {
    return canRateGame(this.game?.status);
  }

  protected getRatingDisplay(): string {
    return formatRatingLabel(this.ratingPreview ?? this.game?.rating);
  }

  protected onRatingChange(rating: number | null): void {
    if (!this.game || !this.canShowRating()) {
      return;
    }

    this.ratingPreview = null;
    this.ratingSaving = true;
    this.gameService.setRating(this.game.id, rating, this.game).subscribe({
      next: (updatedGame) => {
        this.game = updatedGame;
        this.ratingSaving = false;
        this.showToast(
          rating != null ? 'Rating saved' : 'Rating cleared',
          'success',
        );
      },
      error: () => {
        this.ratingSaving = false;
        this.showToast('Failed to save rating', 'danger');
      },
    });
  }

  protected getPlaytimeDisplay(): string {
    const hours = this.getPlaytime();
    return hours != null ? `${hours}h` : '0h';
  }

  protected getTrackedMinutesDisplay(): string {
    const totalMinutes = this.playSessions.reduce(
      (sum, session) => sum + (session.durationMinutes ?? 0),
      0,
    );

    if (totalMinutes <= 0) {
      return '0m';
    }

    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  protected getTimelineEvents(): Array<{ label: string; date: string; icon: string }> {
    if (!this.game) {
      return [];
    }

    const events: Array<{ label: string; date: string; icon: string }> = [];

    if (this.game.status === 'wishlist') {
      events.push({
        label: 'Added to wishlist',
        date: this.game.createdAt,
        icon: 'heart-outline',
      });
    } else if (this.game.libraryAddedAt) {
      events.push({
        label: 'Added to wishlist',
        date: this.game.createdAt,
        icon: 'heart-outline',
      });
      events.push({
        label: 'Added to library',
        date: this.game.libraryAddedAt,
        icon: 'game-controller-outline',
      });
    } else {
      events.push({
        label: 'Added to library',
        date: this.game.createdAt,
        icon: 'game-controller-outline',
      });
    }

    if (this.game.startedAt) {
      events.push({
        label: 'Started playing',
        date: this.game.startedAt,
        icon: 'time-outline',
      });
    }

    if (this.game.lastPlayedAt) {
      events.push({
        label: 'Last played',
        date: this.game.lastPlayedAt,
        icon: 'time-outline',
      });
    }

    if (this.game.completedAt) {
      events.push({
        label: 'Completed',
        date: this.game.completedAt,
        icon: 'checkmark-circle-outline',
      });
    }

    if (this.canShowRating() && this.game.ratedAt) {
      events.push({
        label: 'Rated',
        date: this.game.ratedAt,
        icon: 'star-outline',
      });
    }

    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  protected async removeCoverImage(): Promise<void> {
    if (!this.game) {
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
    if (!this.game) {
      return;
    }

    const gameId = this.game.id;
    const previousCover = this.game.coverImage;
    const currentGame = this.game;

    this.game = { ...currentGame, coverImage: undefined };

    this.gameService.updateGame(gameId, { coverImage: null }).subscribe({
      next: (updatedGame) => {
        this.game = { ...updatedGame, coverImage: undefined };
        this.showToast('Cover image removed', 'success');
      },
      error: () => {
        this.game = { ...currentGame, coverImage: previousCover };
        this.showToast('Failed to remove cover image', 'danger');
      },
    });
  }

  protected async deleteGame(): Promise<void> {
    if (!this.game) return;

    const alert = await this.alertController.create({
      header: 'Delete game?',
      message: `"${this.game.title}" will be permanently removed from your library.`,
      cssClass: 'app-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'app-alert-btn-cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'app-alert-btn-delete',
          handler: () => this.performDelete(),
        },
      ],
    });

    await alert.present();
  }

  private performDelete(): void {
    if (!this.game) return;

    this.gameService.deleteGame(this.game.id).subscribe({
      next: () => {
        this.router.navigate(['/home'], {
          state: { showDeletedGameToast: true },
        });
      },
      error: () => {
        this.showToast('Failed to delete game', 'danger');
      },
    });
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }
}
