import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { 
    IonContent, IonHeader, IonToolbar, IonBackButton,
    IonIcon, IonButton, IonCard, IonCardContent,
  IonChip, IonToast, IonSelect, IonSelectOption, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, starOutline, timeOutline, calendarOutline,
  businessOutline, personOutline, gameControllerOutline,
  checkmarkCircleOutline, createOutline, trashOutline, ellipseOutline, heartOutline,
  chevronDownOutline
} from 'ionicons/icons';
import { Game, GAME_STATUS_LABELS, GamePlayStatus, PlaySession } from '../../models/game.model';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { canAddWishlistToLibrary } from '../../shared/utils/release-countdown';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, GameCoverComponent,
    IonContent, IonHeader, IonToolbar, IonBackButton,
    IonIcon, IonButton, IonCard, IonCardContent,
    IonChip, IonToast, IonSelect, IonSelectOption
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <div class="header-inner">
          <div class="header-brand">
            <ion-back-button
              class="header-back-btn"
              defaultHref="/home"
              text=""
              icon="arrow-back-outline"
            ></ion-back-button>
            <h1 class="header-title gaming-font">Game Details</h1>
          </div>

          <div class="header-actions" *ngIf="game">
            <ion-button
              [routerLink]="['/edit', game.id]"
              class="header-icon-btn edit-btn"
              fill="clear"
              aria-label="Edit game"
            >
              <ion-icon name="create-outline" slot="icon-only"></ion-icon>
            </ion-button>
            <ion-button
              (click)="deleteGame()"
              class="header-icon-btn delete-btn"
              fill="clear"
              aria-label="Delete game"
            >
              <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="detail-content" *ngIf="game">
      <section class="hero-section">
        <div
          class="hero-background"
          [class.hero-background--placeholder]="!game.coverImage"
          [style.background-image]="game.coverImage ? 'url(' + game.coverImage + ')' : null"
        ></div>
        <div class="hero-overlay"></div>

        <div class="hero-inner">
          <div class="hero-content">
            <div class="hero-image">
              <app-game-cover
                [title]="game.title"
                [coverImage]="game.coverImage"
                variant="hero"
              />
            </div>

            <div class="hero-info">
              <h1 class="game-title gaming-font">{{ game.title }}</h1>

              <div class="hero-meta">
                <span class="platform-chip" [style.--platform-color]="game.platform.color || '#a855f7'">
                  {{ game.platform.name }}
                </span>

                <span class="year">{{ game.releaseYear }}</span>

                <div class="status-picker">
                  <button
                    type="button"
                    [class]="'status-badge status-badge--' + game.status"
                    [class.status-badge--disabled]="isWishlistLocked()"
                    [disabled]="isWishlistLocked()"
                    (click)="openStatusSelect($event, statusSelect)"
                    aria-haspopup="listbox"
                    [attr.aria-label]="
                      'Status: ' + getStatusLabel(game.status) + (isWishlistLocked() ? '.' : '. Click to change.')
                    "
                  >
                    <ion-icon [name]="getStatusIcon(game.status)"></ion-icon>
                    {{ getStatusLabel(game.status) }}
                    <ion-icon
                      name="chevron-down-outline"
                      class="status-badge__chevron"
                      aria-hidden="true"
                    ></ion-icon>
                  </button>
                  <ion-select
                    #statusSelect
                    class="status-select-hidden"
                    [value]="game.status"
                    (ionChange)="onStatusSelect($event)"
                    interface="action-sheet"
                    [interfaceOptions]="statusSheetOptions"
                  >
                    <ion-select-option
                      *ngFor="let option of getAvailableStatusOptions()"
                      [value]="option"
                    >
                      {{ getStatusLabel(option) }}
                    </ion-select-option>
                  </ion-select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="detail-page">
        <section class="content-section">
          <div class="content-layout">
            <ion-card class="info-card">
              <ion-card-content>
                <h2 class="section-title">About</h2>
                <p class="description" *ngIf="game.description; else noDescription">{{ game.description }}</p>
                <ng-template #noDescription>
                  <p class="description empty">No description added yet.</p>
                </ng-template>

                <div class="genres-section" *ngIf="game.genre?.length">
                  <h3 class="subsection-title">Genres</h3>
                  <div class="genre-chips">
                    <ion-chip *ngFor="let genre of game.genre" class="genre-chip">
                      {{ genre }}
                    </ion-chip>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <aside class="sidebar">
              <ion-card class="stats-card">
                <ion-card-content>
                  <h2 class="section-title">Details</h2>

                  <div class="detail-item" *ngIf="game.developer">
                    <ion-icon name="business-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Developer</label>
                      <span>{{ game.developer.name }}</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.director">
                    <ion-icon name="person-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Director</label>
                      <span>{{ game.director }}</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.status === 'wishlist' && game.releaseDate">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Release Date</label>
                      <span>{{ getFormattedReleaseDate() }}</span>
                    </div>
                  </div>

                  <div class="detail-item">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Release Year</label>
                      <span>{{ game.releaseYear }}</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.rating">
                    <ion-icon name="star-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Your Rating</label>
                      <span class="rating">{{ game.rating }}/10</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="getPlaytime()">
                    <ion-icon name="time-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Playtime</label>
                      <span>{{ getPlaytime() }} hours</span>
                    </div>
                  </div>

                  <div class="detail-item" *ngIf="game.purchaseDate">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <div class="detail-info">
                      <label>Purchased</label>
                      <span>{{ game.purchaseDate | date:'mediumDate' }}</span>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>

              <ion-card class="notes-card" *ngIf="game.notes">
                <ion-card-content>
                  <h2 class="section-title">Notes</h2>
                  <p class="notes-text">{{ game.notes }}</p>
                </ion-card-content>
              </ion-card>

              <ion-card class="history-card" *ngIf="playSessions.length">
                <ion-card-content>
                  <h2 class="section-title">Play History</h2>
                  <div class="history-list">
                    <div class="history-item" *ngFor="let session of playSessions">
                      <div class="history-item__dates">
                        <span>{{ session.startedAt | date:'mediumDate' }}</span>
                        <span *ngIf="session.endedAt"> · {{ session.endedAt | date:'shortTime' }}</span>
                      </div>
                      <span class="history-item__duration" *ngIf="session.durationMinutes">
                        {{ session.durationMinutes }} min
                      </span>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </aside>
          </div>
        </section>
      </div>

      <ion-toast
        [isOpen]="!!toastMessage"
        [message]="toastMessage"
        [color]="toastColor"
        duration="3000"
        position="bottom"
        (didDismiss)="toastMessage = ''">
      </ion-toast>
    </ion-content>
  `,
  styles: [`
    .detail-content {
      --background: var(--color-bg-primary);
    }

    .detail-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 1.25rem calc(2.5rem + env(safe-area-inset-bottom));
    }

    /* Hero Section */
    .hero-section {
      position: relative;
      width: 100%;
      min-height: 320px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
      padding: 1.5rem 0 2rem;
    }

    .hero-inner {
      position: relative;
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 1.25rem;
    }

    .hero-background {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: blur(24px);
      opacity: 0.28;
      transform: scale(1.08);
    }

    .hero-background--placeholder {
      background:
        radial-gradient(circle at 25% 20%, rgba(168, 85, 247, 0.25) 0%, transparent 50%),
        radial-gradient(circle at 75% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 45%),
        linear-gradient(145deg, #1a1a30 0%, #0f0f1c 100%);
      filter: none;
      opacity: 1;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(10, 10, 15, 0.15) 0%,
        rgba(10, 10, 15, 0.55) 55%,
        rgba(10, 10, 15, 1) 100%
      );
    }

    .hero-content {
      position: relative;
      display: flex;
      gap: 1.75rem;
      align-items: flex-end;
      width: 100%;
    }

    .hero-image {
      flex-shrink: 0;
      width: 168px;
      height: 236px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    }

    .hero-info {
      flex: 1;
      min-width: 0;
      padding-bottom: 0.25rem;
    }

    .game-title {
      font-size: clamp(1.75rem, 4vw, 2.35rem);
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 1rem;
      line-height: 1.15;
    }

    .hero-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.625rem 0.875rem;
      margin-bottom: 1.25rem;
    }

    .platform-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.45rem 0.75rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--platform-color, #a855f7) 88%, black);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #ffffff;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .year {
      color: #cbd5e1;
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .completed-badge,
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.9375rem;
      font-family: inherit;
    }

    .status-picker {
      position: relative;
    }

    .status-badge {
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 15, 28, 0.55);
      color: #e2e8f0;
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        background 0.2s ease,
        transform 0.15s ease;
    }

    .status-badge:hover,
    .status-badge:focus-visible {
      border-color: rgba(168, 85, 247, 0.45);
      background: rgba(168, 85, 247, 0.12);
      outline: none;
    }

    .status-badge:active {
      transform: scale(0.98);
    }

    .status-badge__chevron {
      font-size: 0.875rem;
      opacity: 0.75;
    }

    .status-select-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .status-badge--playing {
      color: #93c5fd;
      border-color: rgba(59, 130, 246, 0.35);
      background: rgba(59, 130, 246, 0.12);
    }

    .status-badge--completed {
      color: #86efac;
      border-color: rgba(34, 197, 94, 0.35);
      background: rgba(34, 197, 94, 0.12);
    }

    .status-badge--not_started {
      color: #cbd5e1;
    }

    .status-badge--wishlist {
      color: #f9a8d4;
      border-color: rgba(244, 114, 182, 0.35);
      background: rgba(244, 114, 182, 0.12);
    }

    .status-badge--disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .status-badge--disabled:active {
      transform: none;
    }

    .completed-badge ion-icon,
    .status-badge ion-icon {
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .history-list {
      --history-item-height: 2.875rem;
      --history-gap: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: var(--history-gap);
      max-height: calc(4 * var(--history-item-height) + 3 * var(--history-gap));
      overflow-y: auto;
      padding-right: 0.25rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(168, 85, 247, 0.45) rgba(15, 15, 28, 0.55);
    }

    .history-list::-webkit-scrollbar {
      width: 6px;
    }

    .history-list::-webkit-scrollbar-track {
      background: rgba(15, 15, 28, 0.55);
      border-radius: 999px;
    }

    .history-list::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.45);
      border-radius: 999px;
    }

    .history-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: var(--history-item-height);
      padding: 0.75rem 0.875rem;
      border-radius: 12px;
      background: rgba(15, 15, 28, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.12);
      flex-shrink: 0;
    }

    .history-item__dates {
      color: #cbd5e1;
      font-size: 0.875rem;
    }

    .history-item__duration {
      color: #a855f7;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    /* Content */
    .content-section {
      padding-top: 0.5rem;
    }

    .content-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
      gap: 1.25rem;
      align-items: start;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .info-card,
    .stats-card,
    .notes-card {
      background: rgba(22, 22, 42, 0.92);
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
      margin: 0;
    }

    .info-card ion-card-content,
    .stats-card ion-card-content,
    .notes-card ion-card-content {
      padding: 1.5rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 1.125rem;
      letter-spacing: 0.02em;
    }

    .subsection-title {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    .description {
      color: #cbd5e1;
      line-height: 1.7;
      font-size: 0.9375rem;
      margin: 0 0 1.5rem;
    }

    .description.empty {
      color: #64748b;
      font-style: italic;
    }

    .genres-section {
      padding-top: 0.25rem;
    }

    .genre-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .genre-chip {
      --background: rgba(168, 85, 247, 0.16);
      --color: #e9d5ff;
      margin: 0;
      min-height: 30px;
      padding-inline: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(168, 85, 247, 0.28);
      border-radius: 999px;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 0.875rem 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }

    .detail-item:first-of-type {
      padding-top: 0.25rem;
    }

    .detail-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .detail-item ion-icon {
      color: #a78bfa;
      font-size: 1.25rem;
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    .detail-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .detail-info label {
      color: #64748b;
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    .detail-info span {
      color: #f1f5f9;
      font-size: 0.9375rem;
      font-weight: 500;
      line-height: 1.4;
    }

    .detail-info .rating {
      color: #fbbf24;
    }

    .notes-text {
      color: #cbd5e1;
      line-height: 1.65;
      white-space: pre-wrap;
      margin: 0;
      font-size: 0.9375rem;
    }

    @media (max-width: 900px) {
      .content-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .detail-page {
        padding-inline: 1rem;
      }

      .hero-section {
        min-height: auto;
        padding: 1.25rem 0 1.5rem;
      }

      .hero-inner {
        padding-inline: 1rem;
      }

      .hero-content {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .hero-image {
        width: 140px;
        height: 196px;
      }

      .hero-meta {
        justify-content: center;
      }

      .info-card ion-card-content,
      .stats-card ion-card-content,
      .notes-card ion-card-content {
        padding: 1.25rem;
      }
    }
  `]
})
export class GameDetailPage implements OnInit {
  game: Game | null = null;
  playSessions: PlaySession[] = [];
  statusSheetOptions = {
    header: 'Change status',
    cssClass: 'app-status-sheet',
  };
  toastMessage = '';
  toastColor: 'success' | 'danger' = 'success';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private alertController: AlertController
  ) {
    addIcons({
      arrowBackOutline, starOutline, timeOutline, calendarOutline,
      businessOutline, personOutline, gameControllerOutline,
      checkmarkCircleOutline, createOutline, trashOutline, ellipseOutline, heartOutline,
      chevronDownOutline
    });
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.loadGame(gameId);
    }
  }

  loadGame(id: string): void {
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

  loadPlaySessions(gameId: string): void {
    this.gameService.getPlaySessions(gameId).subscribe({
      next: (sessions) => {
        this.playSessions = sessions;
      },
    });
  }

  openStatusSelect(event: Event, statusSelect: IonSelect): void {
    if (this.isWishlistLocked()) {
      return;
    }

    statusSelect.open(event as UIEvent);
  }

  isWishlistLocked(): boolean {
    return !!this.game && this.game.status === 'wishlist' && !canAddWishlistToLibrary(this.game);
  }

  onStatusSelect(event: CustomEvent): void {
    const status = event.detail.value as GamePlayStatus;
    if (
      !status ||
      !this.game ||
      status === this.game.status ||
      !this.getAvailableStatusOptions().includes(status)
    ) {
      return;
    }

    this.setStatus(status);
  }

  getAvailableStatusOptions(): GamePlayStatus[] {
    if (this.game?.status === 'wishlist') {
      if (this.isWishlistLocked()) {
        return ['wishlist'];
      }

      return ['not_started', 'playing', 'completed'];
    }

    const options: GamePlayStatus[] = ['not_started', 'playing', 'completed', 'wishlist'];
    if (this.hasBeenPlayed()) {
      return options.filter((status) => status !== 'wishlist');
    }
    return options;
  }

  hasBeenPlayed(): boolean {
    if (!this.game) return false;

    return (
      this.game.status === 'playing' ||
      this.game.status === 'completed' ||
      !!this.game.startedAt ||
      !!this.game.lastPlayedAt ||
      !!this.game.completedAt ||
      (this.getPlaytime() ?? 0) > 0 ||
      this.playSessions.length > 0
    );
  }

  setStatus(status: GamePlayStatus): void {
    if (!this.game || this.game.status === status) return;

    this.gameService.setStatus(this.game.id, status, this.game).subscribe({
      next: (updatedGame) => {
        this.game = updatedGame;
        this.loadPlaySessions(updatedGame.id);
        this.showToast(`${this.getStatusLabel(status)} status saved`, 'success');
      },
      error: () => {
        this.showToast('Failed to update status', 'danger');
      },
    });
  }

  getStatusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }

  getStatusIcon(status: GamePlayStatus): string {
    const icons: Record<GamePlayStatus, string> = {
      not_started: 'ellipse-outline',
      playing: 'time-outline',
      completed: 'checkmark-circle-outline',
      wishlist: 'heart-outline',
    };
    return icons[status];
  }

  getFormattedReleaseDate(): string {
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

  getPlaytime(): number | null {
    if (!this.game) return null;
    const hours = this.game.playtimeHours ?? this.game.playtime;
    return hours != null && hours > 0 ? hours : null;
  }

  async deleteGame(): Promise<void> {
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
        this.showToast('Game deleted', 'success');
        this.router.navigate(['/home']);
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
