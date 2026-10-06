import { AlertController } from '@ionic/angular/standalone';
import { GAME_STATUS_CYCLE, GamePlayStatus } from '../../models/game.model';

interface StatusAction {
  label: string;
  icon: string;
}

/**
 * The one-tap status button describes what tapping does next,
 * not the state the game is already in (that's shown by the status badge).
 * Completed games get no quick action: replaying is a deliberate choice made on the detail page.
 */
const STATUS_ACTIONS: Partial<Record<GamePlayStatus, StatusAction>> = {
  not_started: { label: 'Start playing', icon: 'play-outline' },
  playing: { label: 'Pause', icon: 'pause-outline' },
  paused: { label: 'Resume', icon: 'play-outline' },
  wishlist: { label: 'Add to library', icon: 'add-outline' },
};

export function getStatusAction(status: GamePlayStatus): StatusAction | null {
  return STATUS_ACTIONS[status] ?? null;
}

export function getNextStatus(status: GamePlayStatus): GamePlayStatus {
  return GAME_STATUS_CYCLE[status];
}

/** Toast copy after a status change — specific, with a little save-point flavor. */
export function statusChangeMessage(title: string, status: GamePlayStatus): string {
  switch (status) {
    case 'playing':
      return `Now playing ${title}`;
    case 'paused':
      return `${title} paused — progress saved`;
    case 'completed':
      return `GG! ${title} completed`;
    case 'not_started':
      return `${title} moved to your backlog`;
    case 'wishlist':
      return `${title} added to your wishlist`;
  }
}

export function statusChangeClearsPlayHistory(
  from: GamePlayStatus,
  to: GamePlayStatus,
): boolean {
  if (to !== 'not_started') {
    return false;
  }

  return from === 'playing' || from === 'completed' || from === 'paused';
}

export async function confirmResetPlayHistory(
  alertController: AlertController,
): Promise<boolean> {
  const alert = await alertController.create({
    header: 'Start over from scratch?',
    message:
      'Moving this game back to Not started deletes its play sessions, dates and playtime. This can’t be undone.',
    cssClass: 'app-alert',
    buttons: [
      { text: 'Keep progress', role: 'cancel', cssClass: 'app-alert-btn-cancel' },
      {
        text: 'Reset progress',
        role: 'confirm',
        cssClass: 'app-alert-btn-delete',
      },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === 'confirm';
}
