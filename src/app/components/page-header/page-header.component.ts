import { Component, Input, OnInit } from '@angular/core';
import { IonBackButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

/**
 * In-page title row shared by every routed page.
 * Top-level destinations omit `backHref`; drill-down pages (detail, forms) set it.
 * Page actions are projected with the `pageActions` attribute.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [IonBackButton],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent implements OnInit {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() backHref?: string;
  @Input() backLabel = '';

  public ngOnInit(): void {
    addIcons({ arrowBackOutline });
  }
}
