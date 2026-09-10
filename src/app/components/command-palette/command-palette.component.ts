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
} from 'ionicons/icons';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Game, GamePlayStatus, Platform } from '../../models/game.model';
import { CommandPaletteService } from '../../services/command-palette.service';
import { GameService } from '../../services/game.service';
import { LibraryPrefsService, LibraryViewMode } from '../../services/library-prefs.service';
import { PlatformService } from '../../services/platform.service';
import { RawgGameSummary, RawgService } from '../../services/rawg.service';

type PaletteGroup = 'Actions' | 'Collections' | 'Games' | 'RAWG';

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: PaletteGroup;
  kind?: 'rawg';
  rawg?: RawgGameSummary;
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonToast],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  private readonly palette = inject(CommandPaletteService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly prefs = inject(LibraryPrefsService);
  private readonly rawg = inject(RawgService);
  private readonly platformService = inject(PlatformService);
  private readonly destroy$ = new Subject<void>();
  private readonly rawgQuery$ = new Subject<string>();

  @ViewChild('queryInput') queryInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  activeId = '';
  games: Game[] = [];
  rawgSearching = false;
  addingKey: string | null = null;
  toastMessage = '';
  toastColor: 'success' | 'danger' | 'warning' = 'success';
  private platforms: Platform[] = [];
  private rawgItems: PaletteItem[] = [];
  private allItems: PaletteItem[] = [];
  flatItems: PaletteItem[] = [];
  readonly groups: PaletteGroup[] = [
    'Actions',
    'Collections',
    'Games',
    'RAWG',
  ];

  constructor() {
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
    });
  }

  ngOnInit(): void {
    this.palette.open$.pipe(takeUntil(this.destroy$)).subscribe((open) => {
      this.open = open;
      if (open) {
        this.query = '';
        this.rawgItems = [];
        this.rawgSearching = false;
        this.refreshItems();
        this.rawgQuery$.next('');
        setTimeout(() => this.queryInput?.nativeElement.focus(), 20);
      }
    });

    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.games = games;
      if (this.open) {
        this.refreshItems();
      }
    });

    this.platformService
      .getPlatforms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (platforms) => {
          this.platforms = platforms;
        },
      });

    this.rawgQuery$
      .pipe(
        debounceTime(320),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (q.length < 2 || !this.rawg.isConfigured) {
            this.rawgSearching = false;
            this.rawgItems = [];
            this.mergeRawgIntoFlat();
            return of([] as RawgGameSummary[]);
          }
          this.rawgSearching = true;
          this.rawgItems = [];
          this.mergeRawgIntoFlat();
          return this.rawg.searchGames(q, 8).pipe(
            catchError(() => of([] as RawgGameSummary[])),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.rawgSearching = false;
        const owned = new Set(this.games.map((g) => g.title.toLowerCase()));
        this.rawgItems = results
          .filter((hit) => !owned.has(hit.name.toLowerCase()))
          .map((hit) => this.toRawgItem(hit));
        this.mergeRawgIntoFlat();
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
    this.rawgQuery$.next(this.query);
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

  itemsForGroup(group: PaletteGroup): PaletteItem[] {
    return this.flatItems.filter((i) => i.group === group);
  }

  run(item: PaletteItem): void {
    if (item.kind === 'rawg' && item.rawg) {
      this.addRawg(item.rawg, 'not_started');
      return;
    }
    item.run();
    this.close();
  }

  addRawgToLibrary(hit: RawgGameSummary, event?: Event): void {
    event?.stopPropagation();
    this.addRawg(hit, 'not_started');
  }

  addRawgToWishlist(hit: RawgGameSummary, event?: Event): void {
    event?.stopPropagation();
    this.addRawg(hit, 'wishlist');
  }

  isAdding(hit: RawgGameSummary): boolean {
    return this.addingKey?.startsWith(`${hit.id}:`) ?? false;
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
    const local = q
      ? this.allItems.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            (i.hint?.toLowerCase().includes(q) ?? false),
        )
      : this.allItems;
    this.flatItems = [...local, ...this.rawgItems];
    this.activeId = this.flatItems[0]?.id ?? '';
  }

  private mergeRawgIntoFlat(): void {
    const local = this.flatItems.filter((i) => i.group !== 'RAWG');
    this.flatItems = [...local, ...this.rawgItems];
    if (!this.flatItems.some((i) => i.id === this.activeId)) {
      this.activeId = this.flatItems[0]?.id ?? '';
    }
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
      kind: 'rawg',
      rawg: hit,
      run: () => this.addRawg(hit, 'not_started'),
    };
  }

  private addRawg(hit: RawgGameSummary, status: GamePlayStatus): void {
    if (this.addingKey != null) {
      return;
    }

    const already = this.games.some(
      (g) => g.title.toLowerCase() === hit.name.toLowerCase(),
    );
    if (already) {
      this.toast('Already in your vault', 'warning');
      return;
    }

    const destination = status === 'wishlist' ? 'wishlist' : 'library';
    this.addingKey = `${hit.id}:${destination}`;

    this.rawg
      .importGame(hit.id, hit)
      .pipe(
        switchMap((imported) => {
          if (!imported) {
            return of(null);
          }
          const platformId =
            this.rawg.matchPlatformId(imported.platforms, this.platforms) ??
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
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (saved) => {
          this.addingKey = null;
          if (!saved) {
            this.toast('Could not load that RAWG game', 'danger');
            return;
          }
          this.rawgItems = this.rawgItems.filter((i) => i.rawg?.id !== hit.id);
          this.mergeRawgIntoFlat();
          this.toast(
            destination === 'wishlist'
              ? `“${hit.name}” added to wishlist`
              : `“${hit.name}” added to library`,
            'success',
          );
        },
        error: (err: { message?: string }) => {
          this.addingKey = null;
          this.toast(err?.message || `Could not add to ${destination}`, 'danger');
        },
      });
  }

  private toast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success',
  ): void {
    this.toastMessage = '';
    setTimeout(() => {
      this.toastMessage = message;
      this.toastColor = color;
    }, 0);
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
