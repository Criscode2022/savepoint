import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline, checkmarkCircleOutline, ellipseOutline, trashOutline, createOutline,
  heartOutline, pauseCircleOutline, playCircleOutline, playOutline, pauseOutline, addOutline, star,
} from 'ionicons/icons';
import { Game, GAME_STATUS_ICONS, GAME_STATUS_LABELS } from '../../models/game.model';
import { formatReleaseCountdown, canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import { getStatusAction } from '../../shared/utils/game-status.utils';
import { isRated } from '../../shared/utils/rating.utils';
import { GameCoverComponent } from '../game-cover/game-cover.component';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule, RouterLink, GameCoverComponent, IonIcon],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
})
export class GameCardComponent implements OnInit {
  @Input({ required: true }) game!: Game;
  @Input() countdownTick = 0;
  @Output() advanceStatus = new EventEmitter<string>();
  @Output() markCompleted = new EventEmitter<string>();
  @Output() deleteGame = new EventEmitter<string>();

  protected readonly statusLabels = GAME_STATUS_LABELS;
  protected readonly statusIcons = GAME_STATUS_ICONS;

  public ngOnInit(): void {
    addIcons({
      timeOutline, checkmarkCircleOutline, ellipseOutline, trashOutline, createOutline,
      heartOutline, pauseCircleOutline, playCircleOutline, playOutline, pauseOutline, addOutline, star,
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

  protected get action() {
    return getStatusAction(this.game.status);
  }

  protected get canMarkCompleted(): boolean {
    return this.game.status === 'playing' || this.game.status === 'paused';
  }

  protected get showRating(): boolean {
    return isRated(this.game) && this.game.status !== 'wishlist';
  }

  protected get playtime(): number | null {
    const hours = this.game.playtimeHours;
    return hours != null && hours > 0 ? hours : null;
  }

  protected get hasPlatform(): boolean {
    return !!this.game.platform.name && this.game.platform.name !== 'Unknown';
  }

  protected emit(event: Event, output: EventEmitter<string>): void {
    event.stopPropagation();
    event.preventDefault();
    output.emit(this.game.id);
  }
}
