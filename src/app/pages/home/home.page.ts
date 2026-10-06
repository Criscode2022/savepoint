import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LowerCasePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import {
  IonContent, IonIcon, IonInput, IonChip,
  IonSelect, IonSelectOption, IonToast, IonPopover,
  AlertController, ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gameControllerOutline, addOutline, searchOutline, filterOutline,
  gridOutline, listOutline, albumsOutline, starOutline, timeOutline,
  checkmarkCircleOutline, closeOutline, heartOutline, ellipseOutline,
  pauseCircleOutline, playCircleOutline, downloadOutline, playOutline, pauseOutline,
  documentAttachOutline, bookmarkOutline, ellipsisHorizontal, arrowDownOutline,
  arrowUpOutline, layersOutline, createOutline, trashOutline, star,
} from 'ionicons/icons';
import { Game, GameFilters, GAME_STATUS_ICONS, GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { formatReleaseCountdown, canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import {
  confirmResetPlayHistory,
  getNextStatus,
  getStatusAction,
  statusChangeClearsPlayHistory,
  statusChangeMessage,
} from '../../shared/utils/game-status.utils';
import { ClockService } from '../../services/clock.service';
import { GameService } from '../../services/game.service';
import { GameCardComponent } from '../../components/game-card/game-card.component';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { exportLibrary, LibraryExportFormat } from '../../shared/utils/library-export.utils';
import { parseLibraryImportJson } from '../../shared/utils/library-import.utils';
import { collectFilterOptions } from '../../shared/utils/filter-options.utils';
import { matchesFilters } from '../../shared/utils/game-filters.utils';
import { DEFAULT_SORT_ORDER, GameSortField, SortOrder, sortGames } from '../../shared/utils/game-sort.utils';
import { LibraryPrefsService, LibraryViewMode } from '../../services/library-prefs.service';
import { CollectionsService, SavedCollection } from '../../services/collections.service';
import {
  LIBRARY_COLLECTIONS,
  LibraryCollection,
  STATUS_COLLECTIONS,
  parseCollection,
} from '../../shared/library-collections';
import { APP_NAME } from '../../shared/brand';
import { isRated } from '../../shared/utils/rating.utils';
import { ToastState } from '../../shared/toast-state';

addIcons({
  gameControllerOutline, addOutline, searchOutline, filterOutline,
  gridOutline, listOutline, albumsOutline, starOutline, timeOutline,
  checkmarkCircleOutline, closeOutline, heartOutline, ellipseOutline,
  pauseCircleOutline, playCircleOutline, downloadOutline, playOutline, pauseOutline,
  documentAttachOutline, bookmarkOutline, ellipsisHorizontal, arrowDownOutline,
  arrowUpOutline, layersOutline, createOutline, trashOutline, star,
});

type FilterType = 'search' | 'platform' | 'year' | 'developer' | 'genre' | 'tag';

interface ActiveFilterChip {
  type: FilterType;
  value: string | number;
  label: string;
}

/** The filters that actually apply: selections that still exist in the library, plus the search */
type ActiveFilters = Required<Pick<GameFilters, 'search' | 'platforms' | 'years' | 'developers' | 'genres' | 'tags'>>;

const CHIP_COLLECTIONS: LibraryCollection[] = ['all', ...STATUS_COLLECTIONS];

@Component({
  selector: 'app-home',
  imports: [
    FormsModule, LowerCasePipe, NgTemplateOutlet, RouterLink, GameCardComponent, GameCoverComponent,
    IonContent, IonIcon, IonInput, IonChip,
    IonSelect, IonSelectOption, IonToast, IonPopover,
  ],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements ViewWillEnter {
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertController = inject(AlertController);
  private readonly prefs = inject(LibraryPrefsService);
  private readonly collections = inject(CollectionsService);
  private readonly clock = inject(ClockService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly collectionMeta = LIBRARY_COLLECTIONS;
  protected readonly chipCollections = CHIP_COLLECTIONS;
  protected readonly getStatusAction = getStatusAction;
  protected readonly appName = APP_NAME;
  protected readonly isRated = isRated;
  protected readonly sortOptions: { value: GameSortField; label: string }[] = [
    { value: 'createdAt', label: 'Recently added' },
    { value: 'title', label: 'Title' },
    { value: 'releaseYear', label: 'Release year' },
    { value: 'rating', label: 'Rating' },
    { value: 'lastPlayedAt', label: 'Last played' },
    { value: 'playtimeHours', label: 'Playtime' },
  ];

  protected readonly skeletonGridItems = Array.from({ length: 12 });
  protected readonly skeletonShelfItems = Array.from({ length: 18 });
  protected readonly skeletonListItems = Array.from({ length: 6 });

  /** Full library (all statuses) — drives filter options, continue rail, empty state */
  private readonly games = this.gameService.games;
  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected readonly viewMode = this.prefs.viewMode;
  protected readonly savedCollections = this.collections.collections;
  protected readonly toast = new ToastState();

  // ── View state ───────────────────────────────────────────

  /** What's typed in the search box; `searchQuery` follows it after a short debounce */
  protected readonly searchInput = signal('');
  private readonly searchQuery = signal('');
  private readonly search$ = new Subject<string>();

  protected readonly showFilters = signal(false);
  private readonly selectedPlatforms = signal<string[]>([]);
  private readonly selectedYears = signal<number[]>([]);
  private readonly selectedDevelopers = signal<string[]>([]);
  private readonly selectedGenres = signal<string[]>([]);
  private readonly selectedTags = signal<string[]>([]);
  /** Tag that arrived through the URL (saved views); cleared again when the URL drops it */
  private readonly urlTag = signal<string | null>(null);

  protected readonly sortBy = signal<GameSortField>('createdAt');
  protected readonly sortOrder = signal<SortOrder>(DEFAULT_SORT_ORDER.createdAt);

  protected readonly collection = signal<LibraryCollection>('all');
  protected readonly activeSavedCollectionId = signal<string | null>(null);

  protected readonly showExportDialog = signal(false);
  protected readonly includeWishlistInExport = signal(true);
  private readonly exportScope = signal<'library' | 'filtered'>('library');
  protected readonly importing = signal(false);

  // ── Derived state ────────────────────────────────────────

  protected readonly filterOptions = computed(() => collectFilterOptions(this.games()));

  protected readonly activeFilters = computed<ActiveFilters>(() => {
    const { platforms, years, developers, genres, tags } = this.filterOptions();
    const urlTag = this.urlTag();
    return {
      search: this.searchQuery().trim(),
      platforms: this.selectedPlatforms().filter((p) => platforms.includes(p)),
      years: this.selectedYears().filter((y) => years.includes(y)),
      developers: this.selectedDevelopers().filter((d) => developers.includes(d)),
      genres: this.selectedGenres().filter((g) => genres.includes(g)),
      // Keep a URL tag even before the library has loaded
      tags: this.selectedTags().filter((t) => tags.includes(t) || t === urlTag),
    };
  });

  /** Every game that passes the filters, in the chosen order — collections slice this list */
  private readonly matchingGames = computed(() => {
    const filters = this.activeFilters();
    const matches = this.games().filter((game) => matchesFilters(game, filters));
    return sortGames(matches, this.sortBy(), this.sortOrder());
  });

  protected readonly collectionGames = computed(() =>
    this.matchingGames().filter(LIBRARY_COLLECTIONS[this.collection()].matches),
  );

  protected readonly wishlistGames = computed(() =>
    this.matchingGames().filter(LIBRARY_COLLECTIONS.wishlist.matches),
  );

  protected readonly collectionCounts = computed(() => {
    const games = this.matchingGames();
    return Object.fromEntries(
      CHIP_COLLECTIONS.map((key) => [key, games.filter(LIBRARY_COLLECTIONS[key].matches).length]),
    ) as Record<LibraryCollection, number>;
  });

  protected readonly libraryIsEmpty = computed(() => this.games().length === 0);

  /** Filters that live inside the Filters panel (search and tags have their own controls) */
  protected readonly panelFilterCount = computed(() => {
    const { platforms, years, developers, genres } = this.activeFilters();
    return platforms.length + years.length + developers.length + genres.length;
  });

  protected readonly hasActiveFilters = computed(
    () => this.panelFilterCount() > 0 || this.activeFilters().tags.length > 0 || !!this.activeFilters().search,
  );

  protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const { search, platforms, years, developers, genres, tags } = this.activeFilters();
    return [
      ...(search ? [{ type: 'search' as const, value: search, label: `“${search}”` }] : []),
      ...platforms.map((p) => ({ type: 'platform' as const, value: p, label: p })),
      ...years.map((y) => ({ type: 'year' as const, value: y, label: String(y) })),
      ...developers.map((d) => ({ type: 'developer' as const, value: d, label: d })),
      ...genres.map((g) => ({ type: 'genre' as const, value: g, label: g })),
      ...tags.map((t) => ({ type: 'tag' as const, value: t, label: `#${t}` })),
    ];
  });

  protected readonly sortOrderLabel = computed(() => (this.sortOrder() === 'asc' ? 'Ascending' : 'Descending'));

  protected readonly continuePlaying = computed(() =>
    this.games()
      .filter((g) => g.status === 'playing')
      .sort((a, b) => Date.parse(b.lastPlayedAt ?? '0') - Date.parse(a.lastPlayedAt ?? '0'))
      .slice(0, 8),
  );

  protected readonly showContinueRail = computed(
    () => this.collection() === 'all' && !this.hasActiveFilters() && this.continuePlaying().length > 0,
  );

  protected readonly showWishlistSection = computed(
    () => this.collection() === 'all' && (this.wishlistGames().length > 0 || !this.hasActiveFilters()),
  );

  protected readonly canSaveView = computed(
    () => this.collection() !== 'all' || this.activeFilters().tags.length > 0,
  );

  private readonly filteredExportGames = computed(() =>
    this.collection() === 'all'
      ? [...this.collectionGames(), ...this.wishlistGames()]
      : this.collectionGames(),
  );

  protected readonly filteredResultsCount = computed(() => this.filteredExportGames().length);

  protected readonly exportDialogTitle = computed(() =>
    this.exportScope() === 'filtered' ? 'Download these results' : 'Download your library',
  );

  protected readonly exportDialogMessage = computed(() => {
    if (this.exportScope() === 'filtered') {
      const count = this.filteredResultsCount();
      return `${count} ${count === 1 ? 'game' : 'games'} matching your filters.`;
    }
    return 'A full backup you can re-import later (JSON) or open in a spreadsheet (Excel).';
  });

  protected readonly showWishlistExportOption = computed(
    () => this.exportScope() === 'library' || this.collection() === 'all',
  );

  constructor() {
    this.search$
      .pipe(debounceTime(200), takeUntilDestroyed())
      .subscribe((query) => this.searchQuery.set(query));

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.collection.set(parseCollection(params.get('collection')));
      this.revealActiveChip();
      this.activeSavedCollectionId.set(params.get('saved'));
      this.syncUrlTag(params.get('tag'));
    });
  }

  public ionViewWillEnter(): void {
    this.consumeNavigationToast();
  }

  // ── Collections ──────────────────────────────────────────

  /** On phones the chip rail scrolls; keep the selected collection visible. */
  private revealActiveChip(): void {
    setTimeout(() =>
      this.host.nativeElement
        .querySelector('.collection-chip--active')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
    );
  }

  protected setCollection(collection: LibraryCollection): void {
    void this.router.navigate(['/home'], {
      queryParams: collection === 'all' ? {} : { collection },
    });
  }

  // ── Search, filters & sort ───────────────────────────────

  protected onSearch(value: string | null | undefined): void {
    this.searchInput.set(value ?? '');
    this.search$.next(value ?? '');
  }

  protected onSortChange(field: GameSortField): void {
    this.sortBy.set(field);
    this.sortOrder.set(DEFAULT_SORT_ORDER[field]);
  }

  protected toggleSortOrder(): void {
    this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'));
  }

  protected isPlatformSelected(platform: string): boolean {
    return this.activeFilters().platforms.includes(platform);
  }

  protected togglePlatform(platform: string): void {
    this.selectedPlatforms.update((values) => toggleValue(values, platform));
  }

  protected isYearSelected(year: number): boolean {
    return this.activeFilters().years.includes(year);
  }

  protected toggleYear(year: number): void {
    this.selectedYears.update((values) => toggleValue(values, year));
  }

  protected isGenreSelected(genre: string): boolean {
    return this.activeFilters().genres.includes(genre);
  }

  protected toggleGenre(genre: string): void {
    this.selectedGenres.update((values) => toggleValue(values, genre));
  }

  protected setDevelopers(developers: string[] | null): void {
    this.selectedDevelopers.set(developers ?? []);
  }

  protected isTagSelected(tag: string): boolean {
    return this.activeFilters().tags.includes(tag);
  }

  protected toggleTag(tag: string): void {
    this.selectedTags.update((values) => toggleValue(values, tag));
    this.activeSavedCollectionId.set(null);
  }

  protected clearTagFilters(): void {
    if (!this.selectedTags().length) return;
    this.selectedTags.set([]);
    this.activeSavedCollectionId.set(null);
  }

  protected removeFilter(chip: ActiveFilterChip): void {
    const without = <T>(values: T[]) => values.filter((v) => v !== chip.value);
    switch (chip.type) {
      case 'search':
        this.clearSearch();
        break;
      case 'platform':
        this.selectedPlatforms.update(without);
        break;
      case 'year':
        this.selectedYears.update(without);
        break;
      case 'developer':
        this.selectedDevelopers.update(without);
        break;
      case 'genre':
        this.selectedGenres.update(without);
        break;
      case 'tag':
        this.selectedTags.update(without);
        break;
    }
  }

  protected clearFilters(): void {
    this.clearSearch();
    this.selectedPlatforms.set([]);
    this.selectedYears.set([]);
    this.selectedDevelopers.set([]);
    this.selectedGenres.set([]);
    this.selectedTags.set([]);
  }

  private clearSearch(): void {
    this.searchInput.set('');
    this.searchQuery.set('');
    // Also reset the debounced stream so a pending keystroke can't bring the old query back
    this.search$.next('');
  }

  private syncUrlTag(tag: string | null): void {
    const previous = this.urlTag();
    if (tag === previous) return;
    if (tag) {
      this.selectedTags.set([tag]);
    } else if (previous) {
      this.selectedTags.update((tags) => tags.filter((t) => t !== previous));
    }
    this.urlTag.set(tag);
  }

  // ── Saved views ──────────────────────────────────────────

  protected async saveCurrentView(): Promise<void> {
    const collection = this.collection();
    const tag = this.activeFilters().tags[0];
    const alert = await this.alertController.create({
      header: 'Save this view',
      message: `Saves “${LIBRARY_COLLECTIONS[collection].title}”${tag ? ` with #${tag}` : ''} so it's one tap away.`,
      cssClass: 'app-alert',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'e.g. Weekend co-op',
          attributes: { maxlength: 40, 'aria-label': 'View name' },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'app-alert-btn-cancel' },
        {
          text: 'Save view',
          cssClass: 'app-alert-btn-primary',
          handler: (data: { name?: string }) => {
            const name = (data?.name || '').trim();
            if (!name) {
              this.toast.show('Give the view a name first', 'warning');
              return false;
            }
            const saved = this.collections.add(name, collection, tag);
            this.activeSavedCollectionId.set(saved.id);
            this.toast.show(`Saved “${saved.name}”`);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  protected applySavedCollection(col: SavedCollection): void {
    void this.router.navigate(['/home'], {
      queryParams: {
        collection: col.filter === 'all' ? null : col.filter,
        tag: col.tag || null,
        saved: col.id,
      },
    });
  }

  protected removeSavedCollection(col: SavedCollection): void {
    this.collections.remove(col.id);
    if (this.activeSavedCollectionId() === col.id) {
      this.activeSavedCollectionId.set(null);
    }
    this.toast.show(`Removed “${col.name}”`);
  }

  // ── Status actions ───────────────────────────────────────

  protected setViewMode(mode: LibraryViewMode): void {
    this.prefs.setViewMode(mode);
  }

  protected canMarkCompleted(game: Game): boolean {
    return game.status === 'playing' || game.status === 'paused';
  }

  /** Reads the shared clock, so wishlist rows re-render as release day approaches */
  protected isWishlistLocked(game: Game): boolean {
    return game.status === 'wishlist' && !canAddWishlistToLibrary(game, this.clock.now());
  }

  protected getCountdownLabel(game: Game): string {
    return formatReleaseCountdown(game, this.clock.now()).label;
  }

  protected onQuickAction(event: Event, game: Game): void {
    event.stopPropagation();
    event.preventDefault();
    this.advanceStatus(game.id);
  }

  protected onMarkCompleted(event: Event, game: Game): void {
    event.stopPropagation();
    event.preventDefault();
    this.markCompleted(game.id);
  }

  protected advanceStatus(gameId: string): void {
    const game = this.findGame(gameId);
    if (!game) return;

    if (this.isWishlistLocked(game)) {
      this.toast.show(`${game.title} isn't out yet — you can add it once it releases.`, 'warning');
      return;
    }

    const next = getNextStatus(game.status);
    if (statusChangeClearsPlayHistory(game.status, next)) {
      void confirmResetPlayHistory(this.alertController).then((ok) => ok && this.performAdvance(game));
      return;
    }
    this.performAdvance(game);
  }

  private performAdvance(game: Game): void {
    this.gameService.cycleStatus(game.id).subscribe({
      next: (updated) => this.toast.show(statusChangeMessage(updated.title, updated.status)),
      error: () => this.toast.show(`Couldn't update ${game.title}. Try again.`, 'danger'),
    });
  }

  protected markCompleted(gameId: string): void {
    const game = this.findGame(gameId);
    this.gameService.setStatus(gameId, 'completed').subscribe({
      next: (updated) => this.toast.show(statusChangeMessage(updated.title, 'completed')),
      error: () => this.toast.show(`Couldn't update ${game?.title ?? 'the game'}. Try again.`, 'danger'),
    });
  }

  protected async deleteGame(gameId: string): Promise<void> {
    const title = this.findGame(gameId)?.title ?? 'this game';
    const alert = await this.alertController.create({
      header: `Remove ${title}?`,
      message: 'Its status, rating, playtime and notes will be permanently deleted.',
      cssClass: 'app-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'app-alert-btn-cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          cssClass: 'app-alert-btn-delete',
          handler: () => this.performDelete(gameId, title),
        },
      ],
    });
    await alert.present();
  }

  private performDelete(gameId: string, title: string): void {
    this.gameService.deleteGame(gameId).subscribe({
      next: () => this.toast.show(`${title} removed from your library`),
      error: () => this.toast.show(`Couldn't remove ${title}. Try again.`, 'danger'),
    });
  }

  private findGame(gameId: string): Game | undefined {
    return this.games().find((g) => g.id === gameId);
  }

  // ── Import / export ──────────────────────────────────────

  protected onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importing.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseLibraryImportJson(String(reader.result || ''));
      if (!parsed.games.length) {
        this.importing.set(false);
        this.toast.show(parsed.errors[0] || 'No games found in that file', 'warning');
        return;
      }

      this.gameService.importGames(parsed.games).subscribe({
        next: (result) => {
          this.importing.set(false);
          const failed = result.failed ? `, ${result.failed} failed` : '';
          this.toast.show(
            `Imported ${result.created} game${result.created === 1 ? '' : 's'}${failed}`,
            result.created > 0 ? 'success' : 'warning',
          );
        },
        error: () => {
          this.importing.set(false);
          this.toast.show('Import failed. Check the file and try again.', 'danger');
        },
      });
    };
    reader.onerror = () => {
      this.importing.set(false);
      this.toast.show("Couldn't read that file", 'danger');
    };
    reader.readAsText(file);
  }

  protected openExportDialog(scope: 'library' | 'filtered'): void {
    const games = scope === 'filtered' ? this.filteredExportGames() : this.games();
    if (!games.length) {
      this.toast.show('Nothing to export yet', 'warning');
      return;
    }
    this.exportScope.set(scope);
    this.includeWishlistInExport.set(true);
    this.showExportDialog.set(true);
  }

  protected closeExportDialog(): void {
    this.showExportDialog.set(false);
  }

  protected exportAndClose(format: LibraryExportFormat): void {
    const scope = this.exportScope();
    const games = scope === 'filtered' ? this.filteredExportGames() : this.games();
    try {
      exportLibrary(games, format, {
        includeWishlist: this.includeWishlistInExport(),
        scope,
      });
      this.toast.show('Download started');
    } catch {
      this.toast.show('No games to export with those options', 'warning');
    }
    this.closeExportDialog();
  }

  // ── Toasts ───────────────────────────────────────────────

  private consumeNavigationToast(): void {
    const state = history.state as { toast?: string } | null;
    if (!state?.toast) return;
    this.toast.show(state.toast);
    history.replaceState({ ...state, toast: undefined }, '');
  }

  protected statusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }

  protected statusIcon(status: GamePlayStatus): string {
    return GAME_STATUS_ICONS[status];
  }

  protected platformLabel(game: Game): string {
    return game.platform.name === 'Unknown' ? '' : game.platform.name;
  }
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
