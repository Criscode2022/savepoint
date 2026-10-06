import { Component, ElementRef, OnInit, OnDestroy, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
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
import { GameService } from '../../services/game.service';
import { GameCardComponent } from '../../components/game-card/game-card.component';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { exportLibrary, LibraryExportFormat } from '../../shared/utils/library-export.utils';
import { parseLibraryImportJson } from '../../shared/utils/library-import.utils';
import { collectFilterOptions, LibraryFilterOptions } from '../../shared/utils/filter-options.utils';
import { DEFAULT_SORT_ORDER, GameSortField, SortOrder } from '../../shared/utils/game-sort.utils';
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

type ToastColor = 'success' | 'danger' | 'warning';
type FilterType = 'search' | 'platform' | 'year' | 'developer' | 'genre' | 'tag';

interface ActiveFilterChip {
  type: FilterType;
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, GameCardComponent, GameCoverComponent,
    IonContent, IonIcon, IonInput, IonChip,
    IonSelect, IonSelectOption, IonToast, IonPopover,
  ],
  templateUrl: './home.page.html',
})
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertController = inject(AlertController);
  private readonly prefs = inject(LibraryPrefsService);
  private readonly collections = inject(CollectionsService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** Full library (all statuses) — drives filter options, continue rail, empty state */
  private games: Game[] = [];
  protected readonly filteredGames: Signal<Game[]> = this.gameService.filteredGames;
  protected readonly gamesLoading: Signal<boolean> = this.gameService.gamesLoading;

  protected readonly collectionMeta = LIBRARY_COLLECTIONS;
  protected readonly chipCollections: LibraryCollection[] = ['all', ...STATUS_COLLECTIONS];
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

  protected viewMode: LibraryViewMode = 'grid';
  protected searchQuery = '';
  private readonly searchSubject = new Subject<string>();

  protected showFilters = false;
  protected filterOptions: LibraryFilterOptions = {
    platforms: [], years: [], developers: [], genres: [], tags: [],
  };

  private selectedPlatforms: string[] = [];
  private selectedYears: number[] = [];
  protected selectedDevelopers: string[] = [];
  private selectedGenres: string[] = [];
  protected selectedTags: string[] = [];
  /** Tag that arrived through the URL (saved views); cleared again when the URL drops it */
  private urlTag: string | null = null;

  protected sortBy: GameSortField = 'createdAt';
  protected sortOrder: SortOrder = DEFAULT_SORT_ORDER.createdAt;

  protected collection: LibraryCollection = 'all';

  protected toastMessage = '';
  protected toastColor: ToastColor = 'success';
  protected countdownTick = 0;

  protected showExportDialog = false;
  protected includeWishlistInExport = true;
  private exportScope: 'library' | 'filtered' = 'library';
  protected importing = false;

  protected savedCollections: SavedCollection[] = [];
  protected activeSavedCollectionId: string | null = null;

  protected readonly skeletonGridItems = Array.from({ length: 12 });
  protected readonly skeletonShelfItems = Array.from({ length: 18 });
  protected readonly skeletonListItems = Array.from({ length: 6 });

  private readonly destroy$ = new Subject<void>();
  private countdownInterval?: ReturnType<typeof setInterval>;

  public ngOnInit(): void {
    addIcons({
      gameControllerOutline, addOutline, searchOutline, filterOutline,
      gridOutline, listOutline, albumsOutline, starOutline, timeOutline,
      checkmarkCircleOutline, closeOutline, heartOutline, ellipseOutline,
      pauseCircleOutline, playCircleOutline, downloadOutline, playOutline, pauseOutline,
      documentAttachOutline, bookmarkOutline, ellipsisHorizontal, arrowDownOutline,
      arrowUpOutline, layersOutline, createOutline, trashOutline, star,
    });

    this.viewMode = this.prefs.viewMode;
    this.prefs.viewMode$.pipe(takeUntil(this.destroy$)).subscribe((mode) => {
      this.viewMode = mode;
    });

    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.games = games;
      this.filterOptions = collectFilterOptions(games);
      this.pruneInvalidFilterSelections();
      this.applyFilters();
    });

    this.searchSubject
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.collections.collections$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => (this.savedCollections = items));

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.collection = parseCollection(params.get('collection'));
      this.revealActiveChip();
      this.activeSavedCollectionId = params.get('saved');
      this.syncUrlTag(params.get('tag'));
    });

    this.countdownInterval = setInterval(() => this.countdownTick++, 60000);
  }

  public ionViewWillEnter(): void {
    // Other pages reload the library without filters; restore this page's view.
    this.applyFilters();
    this.consumeNavigationToast();
  }

  public ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Collections ──────────────────────────────────────────

  protected get collectionGames(): Game[] {
    return this.filteredGames().filter(LIBRARY_COLLECTIONS[this.collection].matches);
  }

  protected get wishlistGames(): Game[] {
    return this.filteredGames().filter(LIBRARY_COLLECTIONS.wishlist.matches);
  }

  protected collectionCount(collection: LibraryCollection): number {
    return this.filteredGames().filter(LIBRARY_COLLECTIONS[collection].matches).length;
  }

  protected get libraryIsEmpty(): boolean {
    return this.games.length === 0;
  }

  protected get showWishlistSection(): boolean {
    return (
      this.collection === 'all' &&
      (this.wishlistGames.length > 0 || !this.hasActiveFilters())
    );
  }

  protected get continuePlaying(): Game[] {
    return this.games
      .filter((g) => g.status === 'playing')
      .sort((a, b) => Date.parse(b.lastPlayedAt ?? '0') - Date.parse(a.lastPlayedAt ?? '0'))
      .slice(0, 8);
  }

  protected get showContinueRail(): boolean {
    return this.collection === 'all' && !this.hasActiveFilters() && this.continuePlaying.length > 0;
  }

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

  protected onSearch(event: Event): void {
    const detail = (event as CustomEvent<{ value?: string | null }>).detail;
    this.searchQuery = detail?.value ?? '';
    this.searchSubject.next(this.searchQuery);
  }

  protected applyFilters(): void {
    const filters: GameFilters = {
      search: this.searchQuery,
      platforms: this.selectedPlatforms.length ? this.selectedPlatforms : undefined,
      years: this.selectedYears.length ? this.selectedYears : undefined,
      developers: this.selectedDevelopers.length ? this.selectedDevelopers : undefined,
      genres: this.selectedGenres.length ? this.selectedGenres : undefined,
      tags: this.selectedTags.length ? this.selectedTags : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
    this.gameService.filterGames(filters);
  }

  protected onSortChange(): void {
    this.sortOrder = DEFAULT_SORT_ORDER[this.sortBy];
    this.applyFilters();
  }

  protected toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  protected get sortOrderLabel(): string {
    return this.sortOrder === 'asc' ? 'Ascending' : 'Descending';
  }

  protected isPlatformSelected(platform: string): boolean {
    return this.selectedPlatforms.includes(platform);
  }

  protected togglePlatform(platform: string): void {
    this.selectedPlatforms = this.toggleValue(this.selectedPlatforms, platform);
    this.applyFilters();
  }

  protected isYearSelected(year: number): boolean {
    return this.selectedYears.includes(year);
  }

  protected toggleYear(year: number): void {
    this.selectedYears = this.toggleValue(this.selectedYears, year);
    this.applyFilters();
  }

  protected isGenreSelected(genre: string): boolean {
    return this.selectedGenres.includes(genre);
  }

  protected toggleGenre(genre: string): void {
    this.selectedGenres = this.toggleValue(this.selectedGenres, genre);
    this.applyFilters();
  }

  protected isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  protected toggleTag(tag: string): void {
    this.selectedTags = this.toggleValue(this.selectedTags, tag);
    this.activeSavedCollectionId = null;
    this.applyFilters();
  }

  protected clearTagFilters(): void {
    if (!this.selectedTags.length) return;
    this.selectedTags = [];
    this.activeSavedCollectionId = null;
    this.applyFilters();
  }

  protected hasActiveFilters(): boolean {
    return this.panelFilterCount > 0 || this.selectedTags.length > 0 || !!this.searchQuery.trim();
  }

  /** Filters that live inside the Filters panel (search and tags have their own controls) */
  protected get panelFilterCount(): number {
    return (
      this.selectedPlatforms.length +
      this.selectedYears.length +
      this.selectedDevelopers.length +
      this.selectedGenres.length
    );
  }

  protected get activeFilterChips(): ActiveFilterChip[] {
    const chips: ActiveFilterChip[] = [];
    if (this.searchQuery.trim()) {
      chips.push({ type: 'search', value: this.searchQuery, label: `“${this.searchQuery.trim()}”` });
    }
    this.selectedPlatforms.forEach((p) => chips.push({ type: 'platform', value: p, label: p }));
    this.selectedYears.forEach((y) => chips.push({ type: 'year', value: y, label: String(y) }));
    this.selectedDevelopers.forEach((d) => chips.push({ type: 'developer', value: d, label: d }));
    this.selectedGenres.forEach((g) => chips.push({ type: 'genre', value: g, label: g }));
    this.selectedTags.forEach((t) => chips.push({ type: 'tag', value: t, label: `#${t}` }));
    return chips;
  }

  protected removeFilter(chip: ActiveFilterChip): void {
    switch (chip.type) {
      case 'search':
        this.searchQuery = '';
        break;
      case 'platform':
        this.selectedPlatforms = this.selectedPlatforms.filter((p) => p !== chip.value);
        break;
      case 'year':
        this.selectedYears = this.selectedYears.filter((y) => y !== chip.value);
        break;
      case 'developer':
        this.selectedDevelopers = this.selectedDevelopers.filter((d) => d !== chip.value);
        break;
      case 'genre':
        this.selectedGenres = this.selectedGenres.filter((g) => g !== chip.value);
        break;
      case 'tag':
        this.selectedTags = this.selectedTags.filter((t) => t !== chip.value);
        break;
    }
    this.applyFilters();
  }

  protected clearFilters(): void {
    this.searchQuery = '';
    this.selectedPlatforms = [];
    this.selectedYears = [];
    this.selectedDevelopers = [];
    this.selectedGenres = [];
    this.selectedTags = [];
    this.applyFilters();
  }

  private toggleValue<T>(values: T[], value: T): T[] {
    return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  }

  private syncUrlTag(tag: string | null): void {
    if (tag === this.urlTag) return;
    if (this.urlTag) {
      this.selectedTags = this.selectedTags.filter((t) => t !== this.urlTag);
    }
    if (tag) {
      this.selectedTags = [tag];
    }
    this.urlTag = tag;
    this.applyFilters();
  }

  private pruneInvalidFilterSelections(): void {
    const { platforms, years, developers, genres, tags } = this.filterOptions;
    this.selectedPlatforms = this.selectedPlatforms.filter((p) => platforms.includes(p));
    this.selectedYears = this.selectedYears.filter((y) => years.includes(y));
    this.selectedDevelopers = this.selectedDevelopers.filter((d) => developers.includes(d));
    this.selectedGenres = this.selectedGenres.filter((g) => genres.includes(g));
    // Keep a URL tag even before the library has loaded
    this.selectedTags = this.selectedTags.filter((t) => tags.includes(t) || t === this.urlTag);
  }

  // ── Saved views ──────────────────────────────────────────

  protected get canSaveView(): boolean {
    return this.collection !== 'all' || this.selectedTags.length > 0;
  }

  protected async saveCurrentView(): Promise<void> {
    const tag = this.selectedTags[0];
    const alert = await this.alertController.create({
      header: 'Save this view',
      message: `Saves “${LIBRARY_COLLECTIONS[this.collection].title}”${tag ? ` with #${tag}` : ''} so it's one tap away.`,
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
              this.showToast('Give the view a name first', 'warning');
              return false;
            }
            const saved = this.collections.add(name, this.collection, tag);
            this.activeSavedCollectionId = saved.id;
            this.showToast(`Saved “${saved.name}”`);
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
    if (this.activeSavedCollectionId === col.id) {
      this.activeSavedCollectionId = null;
    }
    this.showToast(`Removed “${col.name}”`);
  }

  // ── Status actions ───────────────────────────────────────

  protected setViewMode(mode: LibraryViewMode): void {
    this.prefs.setViewMode(mode);
  }

  protected canMarkCompleted(game: Game): boolean {
    return game.status === 'playing' || game.status === 'paused';
  }

  protected isWishlistLocked(game: Game): boolean {
    void this.countdownTick;
    return game.status === 'wishlist' && !canAddWishlistToLibrary(game);
  }

  protected getCountdownLabel(game: Game): string {
    void this.countdownTick;
    return formatReleaseCountdown(game).label;
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
      this.showToast(`${game.title} isn't out yet — you can add it once it releases.`, 'warning');
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
      next: (updated) => this.showToast(statusChangeMessage(updated.title, updated.status)),
      error: () => this.showToast(`Couldn't update ${game.title}. Try again.`, 'danger'),
    });
  }

  protected markCompleted(gameId: string): void {
    const game = this.findGame(gameId);
    this.gameService.setStatus(gameId, 'completed').subscribe({
      next: (updated) => this.showToast(statusChangeMessage(updated.title, 'completed')),
      error: () => this.showToast(`Couldn't update ${game?.title ?? 'the game'}. Try again.`, 'danger'),
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
      next: () => this.showToast(`${title} removed from your library`),
      error: () => this.showToast(`Couldn't remove ${title}. Try again.`, 'danger'),
    });
  }

  private findGame(gameId: string): Game | undefined {
    return this.games.find((g) => g.id === gameId);
  }

  // ── Import / export ──────────────────────────────────────

  protected onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importing = true;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseLibraryImportJson(String(reader.result || ''));
      if (!parsed.games.length) {
        this.importing = false;
        this.showToast(parsed.errors[0] || 'No games found in that file', 'warning');
        return;
      }

      this.gameService.importGames(parsed.games).subscribe({
        next: (result) => {
          this.importing = false;
          const failed = result.failed ? `, ${result.failed} failed` : '';
          this.showToast(
            `Imported ${result.created} game${result.created === 1 ? '' : 's'}${failed}`,
            result.created > 0 ? 'success' : 'warning',
          );
        },
        error: () => {
          this.importing = false;
          this.showToast('Import failed. Check the file and try again.', 'danger');
        },
      });
    };
    reader.onerror = () => {
      this.importing = false;
      this.showToast("Couldn't read that file", 'danger');
    };
    reader.readAsText(file);
  }

  private get filteredExportGames(): Game[] {
    return this.collection === 'all'
      ? [...this.collectionGames, ...this.wishlistGames]
      : [...this.collectionGames];
  }

  protected get filteredResultsCount(): number {
    return this.filteredExportGames.length;
  }

  protected get exportDialogTitle(): string {
    return this.exportScope === 'filtered' ? 'Download these results' : 'Download your library';
  }

  protected get exportDialogMessage(): string {
    if (this.exportScope === 'filtered') {
      const count = this.filteredResultsCount;
      return `${count} ${count === 1 ? 'game' : 'games'} matching your filters.`;
    }
    return 'A full backup you can re-import later (JSON) or open in a spreadsheet (Excel).';
  }

  protected get showWishlistExportOption(): boolean {
    return this.exportScope === 'library' || this.collection === 'all';
  }

  protected openExportDialog(scope: 'library' | 'filtered'): void {
    const games = scope === 'filtered' ? this.filteredExportGames : this.games;
    if (!games.length) {
      this.showToast('Nothing to export yet', 'warning');
      return;
    }
    this.exportScope = scope;
    this.includeWishlistInExport = true;
    this.showExportDialog = true;
  }

  protected closeExportDialog(): void {
    this.showExportDialog = false;
  }

  protected exportAndClose(format: LibraryExportFormat): void {
    const games = this.exportScope === 'filtered' ? this.filteredExportGames : this.games;
    try {
      exportLibrary(games, format, {
        includeWishlist: this.includeWishlistInExport,
        scope: this.exportScope,
      });
      this.showToast('Download started');
    } catch {
      this.showToast('No games to export with those options', 'warning');
    }
    this.closeExportDialog();
  }

  // ── Toasts ───────────────────────────────────────────────

  private consumeNavigationToast(): void {
    const state = history.state as { toast?: string } | null;
    if (!state?.toast) return;
    this.showToast(state.toast);
    history.replaceState({ ...state, toast: undefined }, '');
  }

  private showToast(message: string, color: ToastColor = 'success'): void {
    this.toastMessage = message;
    this.toastColor = color;
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
