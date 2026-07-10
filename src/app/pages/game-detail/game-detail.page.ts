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
            <h1 class="header-title">Game Details</h1>
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
              <h1 class="game-title">{{ game.title }}</h1>

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
            <div class="main-column">
              <section class="detail-stats" aria-label="Game overview">
                <article class="detail-stat-card">
                  <div class="detail-stat-card__icon detail-stat-card__icon--rating">
                    <ion-icon name="star-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-stat-card__body">
                    <span class="detail-stat-card__value">{{ getRatingDisplay() }}</span>
                    <span class="detail-stat-card__label">Your rating</span>
                  </div>
                </article>

                <article class="detail-stat-card">
                  <div class="detail-stat-card__icon detail-stat-card__icon--playtime">
                    <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-stat-card__body">
                    <span class="detail-stat-card__value">{{ getPlaytimeDisplay() }}</span>
                    <span class="detail-stat-card__label">Playtime</span>
                  </div>
                </article>

                <article class="detail-stat-card">
                  <div class="detail-stat-card__icon detail-stat-card__icon--sessions">
                    <ion-icon name="game-controller-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-stat-card__body">
                    <span class="detail-stat-card__value">{{ playSessions.length }}</span>
                    <span class="detail-stat-card__label">Sessions</span>
                  </div>
                </article>

                <article class="detail-stat-card">
                  <div class="detail-stat-card__icon detail-stat-card__icon--tracked">
                    <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-stat-card__body">
                    <span class="detail-stat-card__value">{{ getTrackedMinutesDisplay() }}</span>
                    <span class="detail-stat-card__label">Tracked time</span>
                  </div>
                </article>
              </section>

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

              <ion-card class="timeline-card">
                <ion-card-content>
                  <h2 class="section-title">Library timeline</h2>
                  <ol class="timeline-list">
                    <li class="timeline-entry" *ngFor="let event of getTimelineEvents()">
                      <div class="timeline-entry__content">
                        <div class="timeline-entry__icon">
                          <ion-icon [name]="event.icon" aria-hidden="true"></ion-icon>
                        </div>
                        <div class="timeline-entry__text">
                          <span class="timeline-entry__label">{{ event.label }}</span>
                          <time class="timeline-entry__date">{{ event.date | date:'mediumDate' }}</time>
                        </div>
                      </div>
                    </li>
                  </ol>
                </ion-card-content>
              </ion-card>
            </div>

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

  getRatingDisplay(): string {
    return this.game?.rating != null ? `${this.game.rating}/10` : '—';
  }

  getPlaytimeDisplay(): string {
    const hours = this.getPlaytime();
    return hours != null ? `${hours}h` : '0h';
  }

  getTrackedMinutesDisplay(): string {
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

  getTimelineEvents(): Array<{ label: string; date: string; icon: string }> {
    if (!this.game) {
      return [];
    }

    const events: Array<{ label: string; date: string; icon: string }> = [
      {
        label: 'Added to library',
        date: this.game.createdAt,
        icon: 'game-controller-outline',
      },
    ];

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

    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
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
