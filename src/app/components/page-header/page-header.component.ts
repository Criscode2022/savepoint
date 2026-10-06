import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonBackButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

addIcons({ arrowBackOutline });

/**
 * In-page title row shared by every routed page.
 * Top-level destinations omit `backHref`; drill-down pages (detail, forms) set it.
 * Page actions are projected with the `pageActions` attribute.
 */
@Component({
  selector: 'app-page-header',
  imports: [IonBackButton],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  public readonly title = input('');
  public readonly subtitle = input('');
  public readonly backHref = input<string>();
  public readonly backLabel = input('');
}
