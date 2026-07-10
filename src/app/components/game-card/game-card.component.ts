import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonButton, IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  starOutline, timeOutline, checkmarkCircleOutline, 
  ellipseOutline, trashOutline, createOutline, heartOutline, pauseCircleOutline
} from 'ionicons/icons';
import { Game, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { formatReleaseCountdown, canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import { GameCoverComponent } from '../game-cover/game-cover.component';
import { GameRatingComponent } from '../game-rating/game-rating.component';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [
    CommonModule, RouterLink, GameCoverComponent, GameRatingComponent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonButton, IonChip
  ],
  template: `
    <ion-card class="game-card" [class]="'game-card game-card--' + game.status" [routerLink]="['/game', game.id]">
      <div class="card-image-wrapper">
        <app-game-cover
          [title]="game.title"
          [coverImage]="coverImage || game.coverImage"
          variant="card"
        />
        <div class="image-overlay">
          <div class="overlay-actions">
            <ion-button 
              fill="clear" 
              size="small"
              [routerLink]="['/edit', game.id]"
              (click)="$event.stopPropagation()"
              class="action-btn">
              <ion-icon name="create-outline"></ion-icon>
            </ion-button>
            
            <ion-button 
              fill="clear" 
              size="small"
              (click)="onDelete.emit(game.id); $event.stopPropagation()"
              class="action-btn delete">
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </div>
        </div>
        
        <!-- Platform Badge -->
        <span
          class="platform-chip"
          [style.--platform-color]="getPlatformColor()"
          [attr.title]="game.platform.name"
        >
          <span class="platform-chip__text">{{ game.platform.name }}</span>
        </span>
        
        <!-- Status Badge -->
        <div class="status-badge" *ngIf="game.status !== 'not_started'" [class]="'status-badge--' + game.status">
          <ion-icon [name]="getStatusIcon()"></ion-icon>
        </div>

        <div
          class="countdown-badge"
          *ngIf="game.status === 'wishlist'"
          [class.countdown-badge--released]="countdown.isReleased"
          [class.countdown-badge--unknown]="countdown.isUnknown"
        >
          <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
          <span>{{ countdown.label }}</span>
        </div>
      </div>

      <ion-card-header>
        <ion-card-title class="game-title">{{game.title}}</ion-card-title>
        <div class="game-meta">
          <span class="developer">{{game.developer.name}}</span>
          <span class="separator">•</span>
          <span class="year">{{game.releaseYear}}</span>
        </div>
      </ion-card-header>

      <ion-card-content>
        <p class="game-description" *ngIf="game.description">
          {{ game.description | slice:0:100 }}{{ game.description.length > 100 ? '...' : '' }}
        </p>
        
        <div class="game-stats" *ngIf="(game.rating != null && game.status !== 'wishlist') || getPlaytime()">
          <div class="stat stat--rating" *ngIf="game.rating != null && game.status !== 'wishlist'">
            <app-game-rating
              [rating]="game.rating"
              [readonly]="true"
              size="sm"
              [showValue]="false"
            />
          </div>
          
          <div class="stat" *ngIf="getPlaytime()">
            <ion-icon name="time-outline" class="stat-icon time-icon"></ion-icon>
            <span>{{ getPlaytime() }}h</span>
          </div>
        </div>

        <div class="game-genres" *ngIf="game.genre?.length">
          <ion-chip *ngFor="let genre of (game.genre || []).slice(0, 3)" class="genre-chip">
            {{ genre }}
          </ion-chip>
        </div>
      </ion-card-content>

      <div
        class="card-footer"
        [class.card-footer--locked]="isWishlistLocked"
        (click)="$event.stopPropagation()"
      >
        <ion-button 
          fill="outline"
          size="small"
          [class]="'status-btn status-btn--' + game.status"
          [class.status-btn--disabled]="isWishlistLocked"
          (click)="handleStatusClick($event)">
          <ion-icon [name]="getStatusIcon()" slot="start"></ion-icon>
          {{ getStatusLabel() }}
        </ion-button>

        <button
          *ngIf="showMarkCompleted()"
          type="button"
          class="play-history-btn mark-completed-btn"
          (click)="handleMarkCompletedClick($event)"
        >
          <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
          <span class="play-history-btn__label">Mark as completed</span>
        </button>
      </div>
    </ion-card>
  `,
  styles: [`
    .game-card {
      background: linear-gradient(180deg, rgba(24, 24, 42, 0.98) 0%, rgba(15, 15, 28, 0.98) 100%);
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.14);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      height: 100%;
      margin: 0;
    }

    .game-card:hover {
      transform: translateY(-4px);
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.45),
        0 0 0 1px rgba(168, 85, 247, 0.25);
      border-color: rgba(168, 85, 247, 0.35);
    }

    .game-card.completed {
      border-color: rgba(34, 197, 94, 0.35);
    }

    .card-image-wrapper {
      position: relative;
      aspect-ratio: 3/4;
      overflow: hidden;
    }

    .game-card:hover .cover-image {
      transform: scale(1.04);
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.35) 0%,
        rgba(0, 0, 0, 0.05) 45%,
        rgba(0, 0, 0, 0.55) 100%
      );
      opacity: 0;
      transition: opacity 0.25s ease;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 0.875rem;
      pointer-events: none;
    }

    .game-card:hover .image-overlay {
      opacity: 1;
    }

    .overlay-actions {
      display: flex;
      gap: 0.5rem;
      pointer-events: auto;
    }

    .action-btn {
      --background: rgba(15, 15, 28, 0.82);
      --color: #f8fafc;
      --border-radius: 50%;
      --padding-start: 0;
      --padding-end: 0;
      width: 38px;
      height: 38px;
      margin: 0;
      backdrop-filter: blur(8px);
    }

    .action-btn:hover {
      --background: rgba(168, 85, 247, 0.85);
    }

    .action-btn.delete:hover {
      --background: rgba(239, 68, 68, 0.85);
    }

    .platform-chip {
      position: absolute;
      bottom: 12px;
      left: 12px;
      display: inline-flex;
      align-items: center;
      min-width: 0;
      max-width: calc(100% - 24px);
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
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    .platform-chip__text {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .game-card--wishlist .platform-chip {
      left: auto;
      right: 12px;
      max-width: min(9rem, calc(100% - 7.5rem));
    }

    .game-card--wishlist .countdown-badge {
      max-width: calc(50% - 12px);
    }

    .completed-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(34, 197, 94, 0.45);
      border: 2px solid rgba(255, 255, 255, 0.15);
    }

    .completed-badge ion-icon {
      color: white;
      font-size: 18px;
    }

    ion-card-header {
      padding: 1rem 1.125rem 0.625rem;
    }

    .game-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.5rem;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .game-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.375rem 0.5rem;
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .developer {
      color: #c4b5fd;
      font-weight: 600;
    }

    .separator {
      color: var(--ink-separator);
    }

    .year {
      color: #cbd5e1;
      font-weight: 500;
    }

    ion-card-content {
      padding: 0 1.125rem 0.875rem;
      flex: 1;
    }

    .game-description {
      color: #cbd5e1;
      font-size: 0.875rem;
      line-height: 1.55;
      margin: 0 0 0.875rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .game-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem 1rem;
      margin-bottom: 0.875rem;
    }

    .stat {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.35rem 0.625rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(148, 163, 184, 0.12);
      color: #e2e8f0;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .stat-icon {
      font-size: 0.95rem;
    }

    .stat--rating {
      padding: 0.35rem 0.5rem;
      background: rgba(251, 191, 36, 0.08);
      border-color: rgba(251, 191, 36, 0.18);
    }

    .time-icon {
      color: #67e8f9;
    }

    .game-genres {
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

    .card-footer {
      padding: 0.75rem 1.125rem 1.125rem;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .card-footer--locked {
      cursor: not-allowed;
    }

    .status-btn {
      --background: transparent;
      --background-hover: rgba(168, 85, 247, 0.12);
      --background-activated: rgba(168, 85, 247, 0.18);
      --border-color: rgba(148, 163, 184, 0.28);
      --border-width: 1px;
      --border-radius: 12px;
      --color: #e2e8f0;
      --padding-top: 11px;
      --padding-bottom: 11px;
      --padding-start: 14px;
      --padding-end: 14px;
      width: 100%;
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: none;
    }

    .status-btn::part(native) {
      border-radius: 12px;
    }

    .status-btn--playing {
      --background: rgba(59, 130, 246, 0.12);
      --border-color: rgba(59, 130, 246, 0.35);
      --color: #93c5fd;
    }

    .status-btn--paused {
      --background: rgba(245, 158, 11, 0.12);
      --border-color: rgba(245, 158, 11, 0.35);
      --color: #fcd34d;
    }

    .status-btn--completed {
      --background: rgba(34, 197, 94, 0.12);
      --border-color: rgba(34, 197, 94, 0.35);
      --color: #86efac;
    }

    .status-btn--wishlist {
      --background: rgba(244, 114, 182, 0.12);
      --border-color: rgba(244, 114, 182, 0.35);
      --color: #f9a8d4;
    }

    .status-btn--disabled {
      opacity: 0.45;
    }

    .status-btn--disabled::part(native) {
      cursor: not-allowed;
    }

    .card-footer--locked .status-btn {
      cursor: not-allowed;
    }

    .status-btn ion-icon {
      font-size: 1.05rem;
      margin-inline-end: 0.375rem;
    }

    .status-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }

    .status-badge--playing {
      background: rgba(59, 130, 246, 0.85);
      color: #fff;
    }

    .status-badge--paused {
      background: rgba(245, 158, 11, 0.88);
      color: #fff;
    }

    .status-badge--completed {
      background: rgba(34, 197, 94, 0.88);
      color: #fff;
    }

    .status-badge--wishlist {
      background: rgba(244, 114, 182, 0.88);
      color: #fff;
    }

    .countdown-badge {
      position: absolute;
      left: 0.75rem;
      bottom: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      border-radius: 999px;
      background: rgba(15, 15, 28, 0.88);
      border: 1px solid rgba(244, 114, 182, 0.45);
      color: #fbcfe8;
      font-size: 0.75rem;
      font-weight: 700;
      backdrop-filter: blur(8px);
    }

    .countdown-badge--released {
      border-color: rgba(34, 197, 94, 0.45);
      color: #bbf7d0;
    }

    .countdown-badge--unknown {
      border-color: rgba(148, 163, 184, 0.35);
      color: #cbd5e1;
    }

    .countdown-badge ion-icon {
      font-size: 0.875rem;
    }

    .status-badge ion-icon {
      font-size: 1.1rem;
    }
  `]
})
export class GameCardComponent {
  @Input() game!: Game;
  @Input() coverImage?: string;
  @Input() countdownTick = 0;
  @Output() onToggleCompleted = new EventEmitter<string>();
  @Output() onMarkCompleted = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();

  constructor() {
    addIcons({
      starOutline, timeOutline, checkmarkCircleOutline,
      ellipseOutline, trashOutline, createOutline, heartOutline, pauseCircleOutline
    });
  }

  get countdown() {
    void this.countdownTick;
    return formatReleaseCountdown(this.game);
  }

  get isWishlistLocked(): boolean {
    void this.countdownTick;
    return this.game.status === 'wishlist' && !canAddWishlistToLibrary(this.game);
  }

  handleStatusClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.onToggleCompleted.emit(this.game.id);
  }

  handleMarkCompletedClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.onMarkCompleted.emit(this.game.id);
  }

  showMarkCompleted(): boolean {
    return this.game.status === 'playing' || this.game.status === 'paused';
  }

  handleFooterClick(event: Event): void {
    this.handleStatusClick(event);
  }

  toggleCompleted(event: Event): void {
    this.handleFooterClick(event);
  }

  cycleStatus(event: Event): void {
    this.handleFooterClick(event);
  }

  getStatusLabel(): string {
    if (this.game.status === 'wishlist') {
      return 'Add to Library';
    }
    return GAME_STATUS_LABELS[this.game.status];
  }

  getStatusIcon(): string {
    const icons: Record<GamePlayStatus, string> = {
      not_started: 'ellipse-outline',
      playing: 'time-outline',
      paused: 'pause-circle-outline',
      completed: 'checkmark-circle-outline',
      wishlist: 'heart-outline',
    };
    return icons[this.game.status];
  }

  getPlaytime(): number | null {
    const hours = this.game.playtimeHours ?? this.game.playtime;
    return hours != null && hours > 0 ? hours : null;
  }

  getPlatformColor(): string {
    return this.game.platform.color || '#a855f7';
  }
}
