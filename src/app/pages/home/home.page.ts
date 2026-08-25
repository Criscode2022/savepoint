import { Component, OnInit, OnDestroy, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, forkJoin, take } from 'rxjs';
import {
  IonContent, IonButton,
  IonIcon, IonGrid, IonRow, IonCol, IonInput, IonChip,
  IonList, IonItem, IonThumbnail, IonLabel,
  IonSelect, IonSelectOption, IonToast, AlertController, ViewWillEnter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gameControllerOutline, addOutline, searchOutline, filterOutline,
  gridOutline, listOutline, albumsOutline,
  starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
  closeOutline, imageOutline, heartOutline, ellipseOutline,
  pauseCircleOutline, downloadOutline, playOutline, chevronForwardOutline,
  documentAttachOutline, bookmarkOutline
} from 'ionicons/icons';
import { Game, GameFilters, PLATFORMS, GAME_STATUS_LABELS, GamePlayStatus, GAME_STATUS_CYCLE } from '../../models/game.model';
import { formatReleaseCountdown, canAddWishlistToLibrary } from '../../shared/utils/release-countdown';
import {
  confirmResetPlayHistory,
  statusChangeClearsPlayHistory,
} from '../../shared/utils/game-status.utils';
import { GameService } from '../../services/game.service';
import { GameCardComponent } from '../../components/game-card/game-card.component';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { GameRatingComponent } from '../../components/game-rating/game-rating.component';
import {
  exportLibrary,
  LibraryExportFormat,
} from '../../shared/utils/library-export.utils';
import { parseLibraryImportJson } from '../../shared/utils/library-import.utils';
import { collectUniqueTags } from '../../shared/utils/tag.utils';
import { LibraryPrefsService, LibraryViewMode } from '../../services/library-prefs.service';
import { CollectionsService, SavedCollection } from '../../services/collections.service';

type LibraryStatusFilter = 'all' | 'not_started' | 'playing' | 'paused' | 'completed' | 'rated' | 'with_playtime' | 'wishlist';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, GameCardComponent, GameCoverComponent, GameRatingComponent,
    IonContent, IonButton,
    IonIcon, IonGrid, IonRow, IonCol, IonInput, IonChip,
    IonList, IonItem, IonThumbnail, IonLabel,
    IonSelect, IonSelectOption, IonToast
  ],
  templateUrl: './home.page.html',
})
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
  games: Game[] = [];
  readonly filteredGames: Signal<Game[]>;
  readonly gamesLoading: Signal<boolean>;

  viewMode: LibraryViewMode = 'grid';
  searchQuery = '';
  private searchSubject = new Subject<string>();

  showFilters = false;
  platforms: string[] = [];
  years: number[] = [];
  developers: string[] = [];
  genres: string[] = [];

  selectedPlatforms: string[] = [];
  selectedYears: number[] = [];
  selectedDevelopers: string[] = [];
  selectedGenres: string[] = [];
  selectedTags: string[] = [];
  availableTags: string[] = [];

  sortBy: 'title' | 'releaseYear' | 'rating' | 'createdAt' | 'lastPlayedAt' | 'playtimeHours' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  libraryStatusFilter: LibraryStatusFilter = 'all';

  toastMessage = '';
  toastColor: 'success' | 'danger' | 'warning' = 'success';
  countdownTick = 0;

  showExportDialog = false;
  includeWishlistInExport = true;
  exportScope: 'library' | 'filtered' = 'library';
  importing = false;

  savedCollections: SavedCollection[] = [];
  activeSavedCollectionId: string | null = null;

  readonly skeletonGridItems = Array.from({ length: 12 });
  readonly skeletonShelfItems = Array.from({ length: 18 });
  readonly skeletonListItems = Array.from({ length: 6 });

  private destroy$ = new Subject<void>();
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor(
    private gameService: GameService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private prefs: LibraryPrefsService,
    private collections: CollectionsService,
  ) {
    this.filteredGames = this.gameService.filteredGames;
    this.gamesLoading = this.gameService.gamesLoading;
    addIcons({
      gameControllerOutline, addOutline, searchOutline, filterOutline,
      gridOutline, listOutline, albumsOutline,
      starOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
      closeOutline, imageOutline, heartOutline, ellipseOutline,
      pauseCircleOutline, downloadOutline, playOutline, chevronForwardOutline,
      documentAttachOutline, bookmarkOutline
    });
  }

  ngOnInit(): void {
    this.viewMode = this.prefs.viewMode;
    this.prefs.viewMode$.pipe(takeUntil(this.destroy$)).subscribe((m) => {
      this.viewMode = m;
    });

    this.loadGames();
    this.setupSearch();
    this.applyFilters();
    this.countdownInterval = setInterval(() => {
      this.countdownTick++;
    }, 60000);

    this.collections.collections$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.savedCollections = items;
      });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const c = params.get('collection');
      const tag = params.get('tag');
      this.activeSavedCollectionId = params.get('saved') || null;
      if (
        c === 'playing' ||
        c === 'paused' ||
        c === 'completed' ||
        c === 'wishlist' ||
        c === 'not_started' ||
        c === 'rated' ||
        c === 'with_playtime'
      ) {
        this.libraryStatusFilter = c;
      } else {
        this.libraryStatusFilter = 'all';
      }

      if (tag) {
        this.selectedTags = [tag];
        this.applyFilters();
      }
    });
  }

  ionViewWillEnter(): void {
    this.refreshFilterOptions();
    this.consumeNavigationToast();
  }

  private consumeNavigationToast(): void {
    const state = history.state as { showDeletedGameToast?: boolean } | null;
    if (!state?.showDeletedGameToast) {
      return;
    }
    this.showToast('Game deleted successfully', 'success');
    history.replaceState({ ...state, showDeletedGameToast: false }, '');
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGames(): void {
    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      this.games = games;
      this.availableTags = collectUniqueTags(games);
      this.syncLibraryFilter();
    });
  }

  private refreshFilterOptions(): void {
    forkJoin({
      platforms: this.gameService.getPlatforms().pipe(take(1)),
      years: this.gameService.getYears().pipe(take(1)),
      developers: this.gameService.getDevelopers().pipe(take(1)),
      genres: this.gameService.getGenres().pipe(take(1)),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ platforms, years, developers, genres }) => {
        this.platforms = platforms;
        this.years = years;
        this.developers = developers;
        this.genres = genres;
        this.pruneInvalidFilterSelections();
      });
  }

  private pruneInvalidFilterSelections(): void {
    const nextPlatforms = this.selectedPlatforms.filter((p) => this.platforms.includes(p));
    const nextYears = this.selectedYears.filter((y) => this.years.includes(y));
    const nextDevelopers = this.selectedDevelopers.filter((d) => this.developers.includes(d));
    const nextGenres = this.selectedGenres.filter((g) => this.genres.includes(g));

    const changed =
      nextPlatforms.length !== this.selectedPlatforms.length ||
      nextYears.length !== this.selectedYears.length ||
      nextDevelopers.length !== this.selectedDevelopers.length ||
      nextGenres.length !== this.selectedGenres.length;

    this.selectedPlatforms = nextPlatforms;
    this.selectedYears = nextYears;
    this.selectedDevelopers = nextDevelopers;
    this.selectedGenres = nextGenres;

    if (changed) {
      this.applyFilters();
    }
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  onSearch(event: CustomEvent | Event): void {
    const detail = (event as CustomEvent<{ value?: string | null }>).detail;
    const target = event.target as HTMLInputElement | null;
    this.searchQuery = detail?.value ?? target?.value ?? this.searchQuery ?? '';
    this.searchSubject.next(this.searchQuery);
  }

  applyFilters(): void {
    const filters: GameFilters = {
      search: this.searchQuery,
      platforms: this.selectedPlatforms.length > 0 ? this.selectedPlatforms : undefined,
      years: this.selectedYears.length > 0 ? this.selectedYears : undefined,
      developers: this.selectedDevelopers.length > 0 ? this.selectedDevelopers : undefined,
      genres: this.selectedGenres.length > 0 ? this.selectedGenres : undefined,
      tags: this.selectedTags.length > 0 ? this.selectedTags : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    this.gameService.getGames(filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => undefined,
      error: () => {
        this.showToast('Failed to load games', 'danger');
      },
    });
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  isGenreSelected(genre: string): boolean {
    return this.selectedGenres.includes(genre);
  }

  toggleGenre(genre: string): void {
    const index = this.selectedGenres.indexOf(genre);
    if (index > -1) {
      this.selectedGenres.splice(index, 1);
    } else {
      this.selectedGenres.push(genre);
    }
    this.activeSavedCollectionId = null;
    this.applyFilters();
  }

  clearTagFilters(): void {
    if (!this.selectedTags.length) return;
    this.selectedTags = [];
    this.activeSavedCollectionId = null;
    this.applyFilters();
  }

  toggleTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.activeSavedCollectionId = null;
    this.applyFilters();
  }

  async saveCurrentCollection(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Save collection',
      message: 'Name this view (status filter + optional tag).',
      cssClass: 'app-alert',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'e.g. Weekend backlog',
          attributes: { maxlength: 40 },
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'app-alert-btn-cancel' },
        {
          text: 'Save',
          cssClass: 'app-alert-btn-delete',
          handler: (data: { name?: string }) => {
            const name = (data?.name || '').trim();
            if (!name) {
              this.showToast('Name is required', 'warning');
              return false;
            }
            const filter =
              this.libraryStatusFilter === 'wishlist' ||
              this.libraryStatusFilter === 'playing' ||
              this.libraryStatusFilter === 'paused' ||
              this.libraryStatusFilter === 'completed' ||
              this.libraryStatusFilter === 'not_started' ||
              this.libraryStatusFilter === 'rated' ||
              this.libraryStatusFilter === 'with_playtime'
                ? this.libraryStatusFilter
                : 'all';
            const col = this.collections.add(name, filter, this.selectedTags[0]);
            this.showToast(`Saved “${col.name}”`, 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  applySavedCollection(col: SavedCollection): void {
    void this.router.navigate(['/home'], {
      queryParams: {
        collection: col.filter === 'all' ? null : col.filter,
        tag: col.tag || null,
        saved: col.id,
      },
    });
  }

  removeSavedCollection(event: Event, id: string): void {
    event.stopPropagation();
    this.collections.remove(id);
    if (this.activeSavedCollectionId === id) {
      this.activeSavedCollectionId = null;
    }
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing = true;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseLibraryImportJson(text);
      if (!parsed.games.length) {
        this.importing = false;
        this.showToast(parsed.errors[0] || 'No games found in file', 'warning');
        return;
      }

      this.gameService.importGames(parsed.games).subscribe({
        next: (result) => {
          this.importing = false;
          this.refreshFilterOptions();
          this.showToast(
            `Imported ${result.created} game${result.created === 1 ? '' : 's'}${
              result.failed ? `, ${result.failed} failed` : ''
            }`,
            result.created > 0 ? 'success' : 'warning',
          );
        },
        error: () => {
          this.importing = false;
          this.showToast('Import failed', 'danger');
        },
      });
    };
    reader.onerror = () => {
      this.importing = false;
      this.showToast('Could not read file', 'danger');
    };
    reader.readAsText(file);
  }

  setViewMode(mode: LibraryViewMode): void {
    this.prefs.setViewMode(mode);
  }

  setCollection(filter: LibraryStatusFilter): void {
    if (filter === 'all') {
      void this.router.navigate(['/home'], { queryParams: {} });
      return;
    }
    if (!this.canSelectLibraryFilter(filter) && filter !== 'wishlist') {
      return;
    }
    void this.router.navigate(['/home'], { queryParams: { collection: filter } });
  }

  isPlatformSelected(platform: string): boolean {
    return this.selectedPlatforms.includes(platform);
  }

  togglePlatform(platform: string): void {
    const index = this.selectedPlatforms.indexOf(platform);
    if (index > -1) {
      this.selectedPlatforms.splice(index, 1);
    } else {
      this.selectedPlatforms.push(platform);
    }
    this.applyFilters();
  }

  getPlatformColor(platform: string): string {
    const p = PLATFORMS.find((x) => x.name === platform);
    return p?.color || '#a855f7';
  }

  isYearSelected(year: number): boolean {
    return this.selectedYears.includes(year);
  }

  toggleYear(year: number): void {
    const index = this.selectedYears.indexOf(year);
    if (index > -1) {
      this.selectedYears.splice(index, 1);
    } else {
      this.selectedYears.push(year);
    }
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return (
      this.selectedPlatforms.length > 0 ||
      this.selectedYears.length > 0 ||
      this.selectedDevelopers.length > 0 ||
      this.selectedGenres.length > 0 ||
      this.selectedTags.length > 0 ||
      !!this.searchQuery
    );
  }

  get activeFilterCount(): number {
    return (
      this.selectedPlatforms.length +
      this.selectedYears.length +
      this.selectedDevelopers.length +
      this.selectedGenres.length +
      this.selectedTags.length +
      (this.searchQuery ? 1 : 0)
    );
  }

  getActiveFilterChips(): Array<{ type: string; value: unknown; label: string }> {
    const chips: Array<{ type: string; value: unknown; label: string }> = [];
    if (this.searchQuery) {
      chips.push({ type: 'search', value: this.searchQuery, label: `Search: ${this.searchQuery}` });
    }
    this.selectedPlatforms.forEach((p) => chips.push({ type: 'platform', value: p, label: p }));
    this.selectedYears.forEach((y) => chips.push({ type: 'year', value: y, label: y.toString() }));
    this.selectedDevelopers.forEach((d) => chips.push({ type: 'developer', value: d, label: d }));
    this.selectedGenres.forEach((g) => chips.push({ type: 'genre', value: g, label: g }));
    this.selectedTags.forEach((t) => chips.push({ type: 'tag', value: t, label: `#${t}` }));
    return chips;
  }

  removeFilter(type: string, value: unknown): void {
    switch (type) {
      case 'search':
        this.searchQuery = '';
        break;
      case 'platform':
        this.selectedPlatforms = this.selectedPlatforms.filter((p) => p !== value);
        break;
      case 'year':
        this.selectedYears = this.selectedYears.filter((y) => y !== value);
        break;
      case 'developer':
        this.selectedDevelopers = this.selectedDevelopers.filter((d) => d !== value);
        break;
      case 'genre':
        this.selectedGenres = this.selectedGenres.filter((g) => g !== value);
        break;
      case 'tag':
        this.selectedTags = this.selectedTags.filter((t) => t !== value);
        break;
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedPlatforms = [];
    this.selectedYears = [];
    this.selectedDevelopers = [];
    this.selectedGenres = [];
    this.selectedTags = [];
    this.applyFilters();
  }

  handleStatusClick(event: Event, game: Game): void {
    event.stopPropagation();
    event.preventDefault();
    this.cycleStatus(game.id);
  }

  handleMarkCompletedClick(event: Event, gameId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.markCompleted(gameId);
  }

  showMarkCompleted(game: Game): boolean {
    return game.status === 'playing' || game.status === 'paused';
  }

  cycleStatus(gameId: string): void {
    const game =
      this.games.find((g) => g.id === gameId) ??
      this.filteredGames().find((g) => g.id === gameId);

    if (game && this.isWishlistLocked(game)) {
      this.showWishlistLockedToast();
      return;
    }

    const nextStatus = game ? GAME_STATUS_CYCLE[game.status] : undefined;
    if (game && nextStatus && statusChangeClearsPlayHistory(game.status, nextStatus)) {
      void this.confirmAndCycleStatus(gameId);
      return;
    }

    this.performCycleStatus(gameId);
  }

  private async confirmAndCycleStatus(gameId: string): Promise<void> {
    const confirmed = await confirmResetPlayHistory(this.alertController);
    if (confirmed) {
      this.performCycleStatus(gameId);
    }
  }

  private performCycleStatus(gameId: string): void {
    this.gameService.cycleStatus(gameId).subscribe({
      next: () => {
        this.syncLibraryFilter();
        this.showToast('Game status updated', 'success');
      },
      error: () => {
        this.showToast('Failed to update game', 'danger');
      },
    });
  }

  markCompleted(gameId: string): void {
    this.gameService.setStatus(gameId, 'completed').subscribe({
      next: () => {
        this.syncLibraryFilter();
        this.showToast('Game marked as completed', 'success');
      },
      error: () => {
        this.showToast('Failed to update game', 'danger');
      },
    });
  }

  isWishlistLocked(game: Game): boolean {
    void this.countdownTick;
    return game.status === 'wishlist' && !canAddWishlistToLibrary(game);
  }

  getStatusLabel(status: GamePlayStatus): string {
    if (status === 'wishlist') {
      return 'Add to Library';
    }
    return GAME_STATUS_LABELS[status];
  }

  getStatusIcon(status: GamePlayStatus): string {
    const icons: Record<GamePlayStatus, string> = {
      not_started: 'ellipse-outline',
      playing: 'time-outline',
      paused: 'pause-circle-outline',
      completed: 'checkmark-circle-outline',
      wishlist: 'heart-outline',
    };
    return icons[status];
  }

  getCountdownLabel(game: Game): string {
    void this.countdownTick;
    return formatReleaseCountdown(game).label;
  }

  get showStatusSections(): boolean {
    return !this.hasActiveFilters();
  }

  get libraryGames(): Game[] {
    return this.filteredGames().filter((game) => game.status !== 'wishlist');
  }

  get wishlistGames(): Game[] {
    return this.filteredGames().filter((game) => game.status === 'wishlist');
  }

  get continuePlaying(): Game[] {
    return this.libraryGames
      .filter((g) => g.status === 'playing')
      .slice()
      .sort((a, b) => {
        const ta = a.lastPlayedAt ? Date.parse(a.lastPlayedAt) : 0;
        const tb = b.lastPlayedAt ? Date.parse(b.lastPlayedAt) : 0;
        return tb - ta;
      })
      .slice(0, 8);
  }

  get libraryGamesCount(): number {
    return this.libraryGames.length;
  }

  get displayGames(): Game[] {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return this.libraryGames.filter((game) => game.status === 'not_started');
      case 'playing':
        return this.libraryGames.filter((game) => game.status === 'playing');
      case 'paused':
        return this.libraryGames.filter((game) => game.status === 'paused');
      case 'completed':
        return this.libraryGames.filter((game) => game.status === 'completed');
      case 'rated':
        return this.libraryGames.filter((game) => game.rating != null);
      case 'with_playtime':
        return this.libraryGames.filter((game) => (game.playtime || 0) > 0);
      case 'wishlist':
        return [];
      default:
        return this.libraryGames;
    }
  }

  get collectionTitle(): string {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return 'Backlog';
      case 'playing':
        return 'Playing';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'rated':
        return 'Rated';
      case 'with_playtime':
        return 'With playtime';
      default:
        return 'Your library';
    }
  }

  isLibraryFilterActive(filter: LibraryStatusFilter): boolean {
    return this.libraryStatusFilter === filter;
  }

  canSelectLibraryFilter(filter: LibraryStatusFilter): boolean {
    switch (filter) {
      case 'all':
        return this.libraryGamesCount > 0;
      case 'not_started':
        return this.notStartedCount > 0;
      case 'playing':
        return this.playingCount > 0;
      case 'paused':
        return this.pausedCount > 0;
      case 'completed':
        return this.completedCount > 0;
      case 'rated':
        return this.ratedCount > 0;
      case 'with_playtime':
        return this.playtimeGamesCount > 0;
      case 'wishlist':
        return true;
    }
  }

  private syncLibraryFilter(): void {
    if (this.libraryStatusFilter === 'all' || this.libraryStatusFilter === 'wishlist') {
      return;
    }
    if (!this.canSelectLibraryFilter(this.libraryStatusFilter)) {
      this.libraryStatusFilter = 'all';
    }
  }

  get librarySectionCountLabel(): string {
    const label = this.activeLibraryFilterLabel;
    return label ? `${this.displayGames.length} ${label}` : `${this.displayGames.length}`;
  }

  get activeLibraryFilterLabel(): string | null {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return 'not started';
      case 'playing':
        return 'playing';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      case 'rated':
        return 'rated';
      case 'with_playtime':
        return 'played';
      default:
        return null;
    }
  }

  getLibraryEmptyMessage(): string {
    switch (this.libraryStatusFilter) {
      case 'not_started':
        return 'No not started games in your library.';
      case 'playing':
        return 'No games currently playing.';
      case 'paused':
        return 'No paused games in your library.';
      case 'completed':
        return 'No completed games in your library.';
      case 'rated':
        return 'No rated games in your library.';
      case 'with_playtime':
        return 'No games with recorded playtime.';
      default:
        return 'No games in your library yet.';
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    const game = this.games.find((g) => g.id === gameId);
    const title = game?.title ?? 'this game';

    const alert = await this.alertController.create({
      header: 'Delete game?',
      message: `"${title}" will be permanently removed from your library.`,
      cssClass: 'app-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'app-alert-btn-cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'app-alert-btn-delete',
          handler: () => this.performDelete(gameId),
        },
      ],
    });

    await alert.present();
  }

  private performDelete(gameId: string): void {
    this.gameService.deleteGame(gameId).subscribe({
      next: () => {
        this.syncLibraryFilter();
        this.refreshFilterOptions();
        this.showToast('Game deleted successfully', 'success');
      },
      error: () => {
        this.showToast('Failed to delete game', 'danger');
      },
    });
  }

  get filteredExportGames(): Game[] {
    if (this.libraryStatusFilter === 'wishlist') {
      return [...this.wishlistGames];
    }
    return [...this.displayGames, ...(this.libraryStatusFilter === 'all' ? this.wishlistGames : [])];
  }

  get filteredResultsCount(): number {
    return this.filteredExportGames.length;
  }

  get exportDialogTitle(): string {
    return this.exportScope === 'filtered' ? 'Download filtered games' : 'Download library';
  }

  get exportDialogMessage(): string {
    if (this.exportScope === 'filtered') {
      const count = this.filteredResultsCount;
      const label = count === 1 ? 'game' : 'games';
      return `Export ${count} filtered ${label} in your chosen format.`;
    }
    return 'Choose a format for your export.';
  }

  openExportDialog(): void {
    if (this.games.length === 0) {
      this.showToast('No games to export', 'warning');
      return;
    }
    this.exportScope = 'library';
    this.includeWishlistInExport = true;
    this.showExportDialog = true;
  }

  openFilteredExportDialog(): void {
    if (this.filteredExportGames.length === 0) {
      this.showToast('No games to export', 'warning');
      return;
    }
    this.exportScope = 'filtered';
    this.includeWishlistInExport = true;
    this.showExportDialog = true;
  }

  closeExportDialog(): void {
    this.showExportDialog = false;
  }

  exportAndClose(format: LibraryExportFormat): void {
    this.exportLibrary(format, this.includeWishlistInExport);
    this.closeExportDialog();
  }

  private exportLibrary(format: LibraryExportFormat, includeWishlist = true): void {
    const games = this.exportScope === 'filtered' ? this.filteredExportGames : this.games;
    try {
      exportLibrary(games, format, {
        includeWishlist,
        scope: this.exportScope,
      });
      this.showToast(
        this.exportScope === 'filtered'
          ? 'Filtered games downloaded successfully'
          : 'Library downloaded successfully',
        'success',
      );
    } catch {
      this.showToast('No games to export with the selected options', 'warning');
    }
  }

  private showWishlistLockedToast(): void {
    this.showToast("You can't add a game to your library before its release date.", 'warning');
  }

  private showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): void {
    this.toastMessage = message;
    this.toastColor = color;
  }

  trackByGameId(_index: number, game: Game): string {
    return game.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  get completedCount(): number {
    return this.libraryGames.filter((g) => g.status === 'completed').length;
  }

  get playingCount(): number {
    return this.libraryGames.filter((g) => g.status === 'playing').length;
  }

  get pausedCount(): number {
    return this.libraryGames.filter((g) => g.status === 'paused').length;
  }

  get ratedCount(): number {
    return this.libraryGames.filter((g) => g.rating != null).length;
  }

  get notStartedCount(): number {
    return this.libraryGames.filter((g) => g.status === 'not_started').length;
  }

  get totalPlaytime(): number {
    return this.libraryGames.reduce((sum, g) => sum + (g.playtime || 0), 0);
  }

  get playtimeGamesCount(): number {
    return this.libraryGames.filter((g) => (g.playtime || 0) > 0).length;
  }
}
