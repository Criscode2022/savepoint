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
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
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

  protected get countdown() {
    void this.countdownTick;
    return formatReleaseCountdown(this.game);
  }

  protected get isWishlistLocked(): boolean {
    void this.countdownTick;
    return this.game.status === 'wishlist' && !canAddWishlistToLibrary(this.game);
  }

  protected handleStatusClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.onToggleCompleted.emit(this.game.id);
  }

  protected handleMarkCompletedClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.onMarkCompleted.emit(this.game.id);
  }

  protected showMarkCompleted(): boolean {
    return this.game.status === 'playing' || this.game.status === 'paused';
  }

  private handleFooterClick(event: Event): void {
    this.handleStatusClick(event);
  }

  private toggleCompleted(event: Event): void {
    this.handleFooterClick(event);
  }

  private cycleStatus(event: Event): void {
    this.handleFooterClick(event);
  }

  protected getStatusLabel(): string {
    if (this.game.status === 'wishlist') {
      return 'Add to Library';
    }
    return GAME_STATUS_LABELS[this.game.status];
  }

  protected getStatusIcon(): string {
    const icons: Record<GamePlayStatus, string> = {
      not_started: 'ellipse-outline',
      playing: 'time-outline',
      paused: 'pause-circle-outline',
      completed: 'checkmark-circle-outline',
      wishlist: 'heart-outline',
    };
    return icons[this.game.status];
  }

  protected getPlaytime(): number | null {
    const hours = this.game.playtimeHours ?? this.game.playtime;
    return hours != null && hours > 0 ? hours : null;
  }

  protected getPlatformColor(): string {
    return this.game.platform.color || '#a855f7';
  }
}
