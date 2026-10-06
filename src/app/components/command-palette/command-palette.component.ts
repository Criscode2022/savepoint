import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon, IonToast } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkCircleOutline,
  gameControllerOutline,
  globeOutline,
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
  layersOutline,
  playCircleOutline,
  pauseCircleOutline,
  trophyOutline,
} from 'ionicons/icons';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { Game, GamePlayStatus } from '../../models/game.model';
import { CommandPaletteService } from '../../services/command-palette.service';
import { GameService } from '../../services/game.service';
import { LibraryPrefsService, LibraryViewMode } from '../../services/library-prefs.service';
import { PlatformService } from '../../services/platform.service';
import { RawgGameSummary, RawgService } from '../../services/rawg.service';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { LIBRARY_COLLECTIONS, LibraryCollection, STATUS_COLLECTIONS } from '../../shared/library-collections';
import { ToastState } from '../../shared/toast-state';

addIcons({
  addOutline,
  checkmarkCircleOutline,
  gameControllerOutline,
  globeOutline,
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
  layersOutline,
  playCircleOutline,
  pauseCircleOutline,
  trophyOutline,
});

type PaletteGroup = 'Actions' | 'Go to' | 'Collections' | 'Games' | 'RAWG';

/** Display order — items are built in this order so arrow keys follow what you see */
const GROUP_ORDER: PaletteGroup[] = ['Actions', 'Go to', 'Collections', 'Games', 'RAWG'];
const MAX_GAME_RESULTS = 40;
const MAX_GAMES_WITHOUT_QUERY = 8;
const MIN_RAWG_QUERY = 2;

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: PaletteGroup;
  rawg?: RawgGameSummary;
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  imports: [FormsModule, IonIcon, IonToast, AutofocusDirective],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onGlobalKey($event)' },
})
export class CommandPaletteComponent {
  private readonly palette = inject(CommandPaletteService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly prefs = inject(LibraryPrefsService);
  private readonly rawg = inject(RawgService);
  private readonly platformService = inject(PlatformService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rawgQuery$ = new Subject<string>();

  protected readonly isOpen = this.palette.isOpen;
  protected readonly query = signal('');
  protected readonly activeId = signal('');
  protected readonly rawgSearching = signal(false);
  protected readonly addingKey = signal<string | null>(null);
  protected readonly toast = new ToastState();

  private readonly rawgResults = signal<RawgGameSummary[]>([]);
  private readonly platforms = toSignal(
    this.platformService.getPlatforms().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
  private readonly ownedTitles = computed(
    () => new Set(this.gameService.games().map((g) => g.title.toLowerCase())),
  );
  private readonly allLocalItems = computed(() => this.buildItems(this.gameService.games()));

  private readonly localItems = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.allLocalItems();
    const matches = q
      ? all.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            (i.hint?.toLowerCase().includes(q) ?? false),
        )
      : all;
    // Search the whole library, but keep the visible list short.
    const gameLimit = q ? MAX_GAME_RESULTS : MAX_GAMES_WITHOUT_QUERY;
    const games = matches.filter((i) => i.group === 'Games').slice(0, gameLimit);
    return [...matches.filter((i) => i.group !== 'Games'), ...games];
  });

  private readonly rawgItems = computed(() => {
    if (this.query().trim().length < MIN_RAWG_QUERY) {
      return [];
    }
    const owned = this.ownedTitles();
    return this.rawgResults()
      .filter((hit) => !owned.has(hit.name.toLowerCase()))
      .map((hit) => this.toRawgItem(hit));
  });

  protected readonly items = computed(() => [...this.localItems(), ...this.rawgItems()]);

  protected readonly sections = computed(() => {
    const items = this.items();
    return GROUP_ORDER.map((group) => ({
      group,
      items: items.filter((i) => i.group === group),
    })).filter((section) => section.items.length > 0);
  });

  /** Falls back to the first result whenever the hovered/selected item drops out of the list */
  protected readonly activeItemId = computed(() => {
    const items = this.items();
    const id = this.activeId();
    return items.some((i) => i.id === id) ? id : (items[0]?.id ?? '');
  });

  constructor() {
    this.rawgQuery$
      .pipe(
        debounceTime(320),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          const shouldSearch = q.length >= MIN_RAWG_QUERY && this.rawg.isConfigured;
          this.rawgResults.set([]);
          this.rawgSearching.set(shouldSearch);
          return shouldSearch
            ? this.rawg.searchGames(q, 8).pipe(catchError(() => of([] as RawgGameSummary[])))
            : of([] as RawgGameSummary[]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.rawgSearching.set(false);
        this.rawgResults.set(results);
      });
  }

  protected onGlobalKey(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.isOpen()) {
        this.close();
      } else {
        this.palette.open();
      }
      return;
    }
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }

  /** Every close path comes through here, so the next open starts from a clean slate */
  protected close(): void {
    this.palette.close();
    this.query.set('');
    this.activeId.set('');
    this.rawgResults.set([]);
    this.rawgSearching.set(false);
    this.rawgQuery$.next('');
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.activeId.set('');
    this.rawgQuery$.next(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.items().find((i) => i.id === this.activeItemId());
      if (item) {
        this.run(item);
      }
    }
  }

  protected run(item: PaletteItem): void {
    item.run();
    // RAWG items add in place so you can keep picking from the same search
    if (!item.rawg) {
      this.close();
    }
  }

  protected addRawgToLibrary(hit: RawgGameSummary, event?: Event): void {
    event?.stopPropagation();
    this.addRawg(hit, 'not_started');
  }

  protected addRawgToWishlist(hit: RawgGameSummary, event?: Event): void {
    event?.stopPropagation();
    this.addRawg(hit, 'wishlist');
  }

  protected isAdding(hit: RawgGameSummary): boolean {
    return this.addingKey()?.startsWith(`${hit.id}:`) ?? false;
  }

  private move(delta: number): void {
    const items = this.items();
    if (!items.length) {
      return;
    }
    const idx = items.findIndex((i) => i.id === this.activeItemId());
    const next = (idx + delta + items.length) % items.length;
    this.activeId.set(items[next].id);
  }

  private toRawgItem(hit: RawgGameSummary): PaletteItem {
    const year = hit.released?.slice(0, 4);
    const platform = hit.platforms[0];
    const hint = [year, platform].filter(Boolean).join(' · ');
    return {
      id: `rawg-${hit.id}`,
      label: hit.name,
      hint,
      icon: 'globe-outline',
      group: 'RAWG',
      rawg: hit,
      run: () => this.addRawg(hit, 'not_started'),
    };
  }

  private addRawg(hit: RawgGameSummary, status: GamePlayStatus): void {
    if (this.addingKey() != null) {
      return;
    }

    if (this.ownedTitles().has(hit.name.toLowerCase())) {
      this.toast.show('Already in your vault', 'warning');
      return;
    }

    const destination = status === 'wishlist' ? 'wishlist' : 'library';
    this.addingKey.set(`${hit.id}:${destination}`);

    this.rawg
      .importGame(hit.id, hit)
      .pipe(
        switchMap((imported) => {
          if (!imported) {
            return of(null);
          }
          const platformId =
            this.rawg.matchPlatformId(imported.platforms, this.platforms()) ??
            'pc';
          const placeNote =
            destination === 'wishlist'
              ? `Added from RAWG search · ${imported.rawgUrl}`
              : `Imported from RAWG · ${imported.rawgUrl}`;
          return this.gameService.saveGameFromForm({
            title: imported.title,
            description: imported.description,
            coverImage: imported.coverImage ?? undefined,
            platformId,
            developerName: imported.developerName || 'Unknown',
            releaseYear: imported.releaseYear,
            releaseDate: imported.releaseDate?.slice(0, 10),
            genre: imported.genres.slice(0, 4),
            tags: imported.tags,
            playtimeHours: imported.playtimeHours ?? undefined,
            status,
            notes: placeNote,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.addingKey.set(null);
          if (!saved) {
            this.toast.show('Could not load that RAWG game', 'danger');
            return;
          }
          this.rawgResults.update((results) => results.filter((r) => r.id !== hit.id));
          this.toast.show(`“${hit.name}” added to ${destination}`);
        },
        error: (err: { message?: string }) => {
          this.addingKey.set(null);
          this.toast.show(err?.message || `Could not add to ${destination}`, 'danger');
        },
      });
  }

  private buildItems(library: Game[]): PaletteItem[] {
    const navigate = (commands: unknown[], queryParams?: Record<string, string>) => () =>
      void this.router.navigate(commands, { queryParams });

    const actions: PaletteItem[] = [
      { id: 'a-add', label: 'Add game', icon: 'add-outline', group: 'Actions', run: navigate(['/add']) },
      { id: 'a-wishlist-add', label: 'Add to wishlist', icon: 'heart-outline', group: 'Actions', run: navigate(['/wishlist/add']) },
      { id: 'a-view-grid', label: 'Switch to grid layout', icon: 'grid-outline', group: 'Actions', run: () => this.setView('grid') },
      { id: 'a-view-list', label: 'Switch to list layout', icon: 'list-outline', group: 'Actions', run: () => this.setView('list') },
      { id: 'a-view-shelf', label: 'Switch to shelf layout', icon: 'albums-outline', group: 'Actions', run: () => this.setView('shelf') },
    ];

    const pages: PaletteItem[] = [
      { id: 'p-insights', label: 'Insights', icon: 'stats-chart-outline', group: 'Go to', run: navigate(['/insights']) },
      { id: 'p-recs', label: 'For you', hint: 'Recommendations', icon: 'sparkles-outline', group: 'Go to', run: navigate(['/recommendations']) },
      { id: 'p-history', label: 'Play history', icon: 'trophy-outline', group: 'Go to', run: navigate(['/play-history']) },
      { id: 'p-profile', label: 'Profile', icon: 'person-circle-outline', group: 'Go to', run: navigate(['/profile']) },
    ];

    const collectionKeys: LibraryCollection[] = ['all', ...STATUS_COLLECTIONS];
    const collections: PaletteItem[] = collectionKeys.map((key) => ({
      id: `c-${key}`,
      label: key === 'all' ? 'Whole library' : LIBRARY_COLLECTIONS[key].label,
      icon: LIBRARY_COLLECTIONS[key].icon,
      group: 'Collections',
      run: navigate(['/home'], key === 'all' ? {} : { collection: key }),
    }));

    const games: PaletteItem[] = library.map((g) => ({
      id: `g-${g.id}`,
      label: g.title,
      hint: g.platform?.name,
      icon: 'game-controller-outline',
      group: 'Games' as const,
      run: navigate(['/game', g.id]),
    }));

    return [...actions, ...pages, ...collections, ...games];
  }

  private setView(mode: LibraryViewMode): void {
    this.prefs.setViewMode(mode);
    void this.router.navigate(['/home']);
  }
}
