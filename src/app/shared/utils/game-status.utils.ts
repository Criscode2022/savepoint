import { AlertController } from '@ionic/angular/standalone';
import { GamePlayStatus } from '../../models/game.model';

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
    header: 'Reset play history?',
    message:
      'Changing this game to Not Started will permanently delete all play sessions and clear play dates and playtime. This cannot be undone.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Reset & change status',
        role: 'confirm',
        cssClass: 'alert-button-danger',
      },
    ],
  });

  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === 'confirm';
}
