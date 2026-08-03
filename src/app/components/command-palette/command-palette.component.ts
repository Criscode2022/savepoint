import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  gameControllerOutline,
  heartOutline,
  personCircleOutline,
  searchOutline,
  timeOutline,
  downloadOutline,
  gridOutline,
  listOutline,
  albumsOutline,
  sparklesOutline,
  statsChartOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { Game } from '../../models/game.model';
import { CommandPaletteService } from '../../services/command-palette.service';
import { GameService } from '../../services/game.service';
import { LibraryPrefsService, LibraryViewMode } from '../../services/library-prefs.service';

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: 'Actions' | 'Collections' | 'Games';
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './command-palette.component.html',
  styles: [
    `
      .cmd-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: min(15vh, 7rem) 1rem 2rem;
        background: rgba(4, 4, 10, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: cmd-fade 160ms var(--ease-out, ease-out);
      }

      .cmd-panel {
        width: min(560px, 100%);
        background: var(--vault-elevated, #151520);
        border: 1px solid rgba(168, 85, 247, 0.28);
        border-radius: 14px;
        box-shadow:
          0 24px 64px rgba(0, 0, 0, 0.55),
          0 0 0 1px rgba(255, 255, 255, 0.04);
        overflow: hidden;
        animation: cmd-rise 200ms var(--ease-out, ease-out);
      }

      .cmd-search {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--border-subtle, rgba(148, 163, 184, 0.14));
      }

      .cmd-search ion-icon {
        font-size: 1.25rem;
        color: var(--ink-muted, #94a3b8);
        flex-shrink: 0;
      }

      .cmd-input {
        flex: 1;
        min-width: 0;
        border: 0;
        background: transparent;
        color: var(--ink-primary, #f8fafc);
        font: inherit;
        font-size: 1rem;
        outline: none;
      }

      .cmd-input::placeholder {
        color: var(--ink-muted, #94a3b8);
      }

      .cmd-kbd {
        flex-shrink: 0;
        font-family: inherit;
        font-size: 0.6875rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--ink-muted, #94a3b8);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle, rgba(148, 163, 184, 0.14));
        border-radius: 6px;
        padding: 0.2rem 0.4rem;
      }

      .cmd-results {
        max-height: min(52vh, 380px);
        overflow-y: auto;
        padding: 0.5rem;
      }

      .cmd-group-label {
        padding: 0.5rem 0.75rem 0.25rem;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-muted, #94a3b8);
      }

      .cmd-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        margin: 0;
        padding: 0.625rem 0.75rem;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--ink-secondary, #cbd5e1);
        font: inherit;
        font-size: 0.9375rem;
        text-align: left;
        cursor: pointer;
        transition: background 140ms ease, color 140ms ease;
      }

      .cmd-item ion-icon {
        font-size: 1.125rem;
        color: var(--ink-muted, #94a3b8);
        flex-shrink: 0;
      }

      .cmd-item--active,
      .cmd-item:hover {
        background: rgba(168, 85, 247, 0.16);
        color: var(--ink-primary, #f8fafc);
      }

      .cmd-item--active ion-icon,
      .cmd-item:hover ion-icon {
        color: #e9d5ff;
      }

      .cmd-item__label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 550;
      }

      .cmd-item__hint {
        flex-shrink: 0;
        font-size: 0.75rem;
        color: var(--ink-muted, #94a3b8);
      }

      .cmd-empty {
        margin: 0;
        padding: 1.5rem 0.75rem;
        text-align: center;
        color: var(--ink-muted, #94a3b8);
        font-size: 0.875rem;
      }

      @keyframes cmd-fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes cmd-rise {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .cmd-backdrop,
        .cmd-panel {
          animation: none;
        }
      }
    `,
  ],
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  private readonly palette = inject(CommandPaletteService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly prefs = inject(LibraryPrefsService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('queryInput') queryInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  activeId = '';
  games: Game[] = [];
  private allItems: PaletteItem[] = [];
  flatItems: PaletteItem[] = [];
  readonly groups: Array<'Actions' | 'Collections' | 'Games'> = [
    'Actions',
    'Collections',
    'Games',
  ];

  constructor() {
    addIcons({
      addOutline,
      checkmarkCircleOutline,
      gameControllerOutline,
      heartOutline,
      personCircleOutline,
      searchOutline,
      timeOutline,
      downloadOutline,
      gridOutline,
      listOutline,
      albumsOutline,
      sparklesOutline,
      statsChartOutline,
    });
  }

  ngOnInit(): void {
    this.palette.open$.pipe(takeUntil(this.destroy$)).subscribe((open) => {
      this.open = open;
      if (open) {
        this.query = '';
        this.refreshItems();
        setTimeout(() => this.queryInput?.nativeElement.focus(), 20);
      }
    });

    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.games = games;
      if (this.open) {
        this.refreshItems();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.palette.toggle();
      return;
    }
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.close();
    }
  }

  close(): void {
    this.palette.close();
  }

  onQueryChange(): void {
    this.refreshItems();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.flatItems.find((i) => i.id === this.activeId);
      if (item) {
        this.run(item);
      }
    }
  }

  itemsForGroup(group: PaletteItem['group']): PaletteItem[] {
    return this.flatItems.filter((i) => i.group === group);
  }

  run(item: PaletteItem): void {
    item.run();
    this.close();
  }

  private move(delta: number): void {
    if (!this.flatItems.length) {
      return;
    }
    const idx = this.flatItems.findIndex((i) => i.id === this.activeId);
    const next = (idx + delta + this.flatItems.length) % this.flatItems.length;
    this.activeId = this.flatItems[next].id;
  }

  private refreshItems(): void {
    const q = this.query.trim().toLowerCase();
    this.allItems = this.buildItems();
    this.flatItems = q
      ? this.allItems.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            (i.hint?.toLowerCase().includes(q) ?? false),
        )
      : this.allItems;
    this.activeId = this.flatItems[0]?.id ?? '';
  }

  private buildItems(): PaletteItem[] {
    const actions: PaletteItem[] = [
      {
        id: 'a-add',
        label: 'Add game',
        icon: 'add-outline',
        group: 'Actions',
        run: () => void this.router.navigate(['/add']),
      },
      {
        id: 'a-wishlist-add',
        label: 'Add to wishlist',
        icon: 'heart-outline',
        group: 'Actions',
        run: () => void this.router.navigate(['/wishlist/add']),
      },
      {
        id: 'a-history',
        label: 'Play history',
        icon: 'checkmark-circle-outline',
        group: 'Actions',
        run: () => void this.router.navigate(['/play-history']),
      },
      {
        id: 'a-insights',
        label: 'Insights',
        icon: 'stats-chart-outline',
        group: 'Actions',
        run: () => void this.router.navigate(['/insights']),
      },
      {
        id: 'a-recs',
        label: 'Recommendations',
        icon: 'sparkles-outline',
        group: 'Actions',
        run: () => void this.router.navigate(['/recommendations']),
      },
      {
        id: 'a-profile',
        label: 'Profile',
        icon: 'person-circle-outline',
        group: 'Actions',
        run: () => void this.router.navigate(['/profile']),
      },
      {
        id: 'a-view-grid',
        label: 'Grid view',
        icon: 'grid-outline',
        group: 'Actions',
        run: () => this.setView('grid'),
      },
      {
        id: 'a-view-list',
        label: 'List view',
        icon: 'list-outline',
        group: 'Actions',
        run: () => this.setView('list'),
      },
      {
        id: 'a-view-shelf',
        label: 'Shelf view',
        icon: 'albums-outline',
        group: 'Actions',
        run: () => this.setView('shelf'),
      },
    ];

    const collections: PaletteItem[] = [
      {
        id: 'c-all',
        label: 'All games',
        icon: 'game-controller-outline',
        group: 'Collections',
        run: () => void this.router.navigate(['/home'], { queryParams: {} }),
      },
      {
        id: 'c-playing',
        label: 'Playing',
        icon: 'time-outline',
        group: 'Collections',
        run: () =>
          void this.router.navigate(['/home'], {
            queryParams: { collection: 'playing' },
          }),
      },
      {
        id: 'c-wishlist',
        label: 'Wishlist',
        icon: 'heart-outline',
        group: 'Collections',
        run: () =>
          void this.router.navigate(['/home'], {
            queryParams: { collection: 'wishlist' },
          }),
      },
      {
        id: 'c-completed',
        label: 'Completed',
        icon: 'checkmark-circle-outline',
        group: 'Collections',
        run: () =>
          void this.router.navigate(['/home'], {
            queryParams: { collection: 'completed' },
          }),
      },
      {
        id: 'c-paused',
        label: 'Paused',
        icon: 'time-outline',
        group: 'Collections',
        run: () =>
          void this.router.navigate(['/home'], {
            queryParams: { collection: 'paused' },
          }),
      },
    ];

    const games: PaletteItem[] = this.games.slice(0, 40).map((g) => ({
      id: `g-${g.id}`,
      label: g.title,
      hint: g.platform?.name,
      icon: 'game-controller-outline',
      group: 'Games' as const,
      run: () => void this.router.navigate(['/game', g.id]),
    }));

    return [...actions, ...collections, ...games];
  }

  private setView(mode: LibraryViewMode): void {
    this.prefs.setViewMode(mode);
    void this.router.navigate(['/home']);
  }
}
