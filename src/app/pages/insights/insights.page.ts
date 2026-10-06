import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, checkmarkCircleOutline, flameOutline, heartOutline, layersOutline,
  pauseCircleOutline, playCircleOutline, statsChartOutline,
} from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { InsightBucket, computeLibraryInsights, LibraryInsights } from '../../shared/utils/insights.utils';
import { LIBRARY_COLLECTIONS, LibraryCollection, STATUS_COLLECTIONS } from '../../shared/library-collections';

interface StatusRow {
  collection: LibraryCollection;
  status: GamePlayStatus;
  label: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule, RouterLink, GameCoverComponent, PageHeaderComponent, IonContent, IonIcon, IonSpinner],
  templateUrl: './insights.page.html',
  styleUrl: './insights.page.scss',
})
export class InsightsPage implements OnInit, OnDestroy {
  private readonly gameService = inject(GameService);

  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected insights: LibraryInsights | null = null;
  protected statusRows: StatusRow[] = [];

  private readonly destroy$ = new Subject<void>();

  public ngOnInit(): void {
    addIcons({
      addOutline, checkmarkCircleOutline, flameOutline, heartOutline, layersOutline,
      pauseCircleOutline, playCircleOutline, statsChartOutline,
    });

    this.gameService.games$.pipe(takeUntil(this.destroy$)).subscribe((games) => {
      const insights = computeLibraryInsights(games);
      this.insights = insights;
      const counts: Record<GamePlayStatus, number> = {
        not_started: insights.notStartedCount,
        playing: insights.playingCount,
        paused: insights.pausedCount,
        completed: insights.completedCount,
        wishlist: insights.wishlistCount,
      };
      this.statusRows = STATUS_COLLECTIONS.map((collection) => ({
        collection,
        status: collection as GamePlayStatus,
        label: LIBRARY_COLLECTIONS[collection].label,
        icon: LIBRARY_COLLECTIONS[collection].icon,
        count: counts[collection as GamePlayStatus],
      }));
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected share(count: number, total: number): number {
    return total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  }

  protected maxCount(rows: InsightBucket[]): number {
    return rows.reduce((max, row) => Math.max(max, row.count), 0);
  }

  protected statusLabel(status: GamePlayStatus): string {
    return GAME_STATUS_LABELS[status];
  }
}
