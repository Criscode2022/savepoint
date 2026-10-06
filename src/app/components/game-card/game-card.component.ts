import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline, checkmarkCircleOutline, ellipseOutline, trashOutline, createOutline,
  heartOutline, pauseCircleOutline, playCircleOutline, playOutline, pauseOutline, addOutline, star,
} from 'ionicons/icons';
import { Game, GAME_STATUS_ICONS, GAME_STATUS_LABELS } from '../../models/game.model';
import { ClockService } from '../../services/clock.service';
import { formatReleaseCountdown, canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import { getStatusAction } from '../../shared/utils/game-status.utils';
import { isRated } from '../../shared/utils/rating.utils';
import { GameCoverComponent } from '../game-cover/game-cover.component';

addIcons({
  timeOutline, checkmarkCircleOutline, ellipseOutline, trashOutline, createOutline,
  heartOutline, pauseCircleOutline, playCircleOutline, playOutline, pauseOutline, addOutline, star,
});

@Component({
  selector: 'app-game-card',
  imports: [DatePipe, RouterLink, GameCoverComponent, IonIcon],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCardComponent {
  private readonly clock = inject(ClockService);

  public readonly game = input.required<Game>();
  public readonly advanceStatus = output<string>();
  public readonly markCompleted = output<string>();
  public readonly deleteGame = output<string>();

  protected readonly statusLabels = GAME_STATUS_LABELS;
  protected readonly statusIcons = GAME_STATUS_ICONS;

  protected readonly countdown = computed(() => formatReleaseCountdown(this.game(), this.clock.now()));
  protected readonly isWishlistLocked = computed(
    () => this.game().status === 'wishlist' && !canAddWishlistToLibrary(this.game(), this.clock.now()),
  );
  protected readonly action = computed(() => getStatusAction(this.game().status));
  protected readonly canMarkCompleted = computed(
    () => this.game().status === 'playing' || this.game().status === 'paused',
  );
  protected readonly showRating = computed(() => isRated(this.game()) && this.game().status !== 'wishlist');
  protected readonly playtime = computed(() => {
    const hours = this.game().playtimeHours;
    return hours != null && hours > 0 ? hours : null;
  });
  protected readonly hasPlatform = computed(() => {
    const name = this.game().platform.name;
    return !!name && name !== 'Unknown';
  });

  protected emit(event: Event, target: { emit(id: string): void }): void {
    event.stopPropagation();
    event.preventDefault();
    target.emit(this.game().id);
  }
}
