import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, checkmarkCircleOutline, flameOutline, heartOutline, layersOutline,
  pauseCircleOutline, playCircleOutline, statsChartOutline,
} from 'ionicons/icons';
import { GameService } from '../../services/game.service';
import { GameCoverComponent } from '../../components/game-cover/game-cover.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { GAME_STATUS_LABELS, GamePlayStatus } from '../../models/game.model';
import { InsightBucket, computeLibraryInsights, LibraryInsights } from '../../shared/utils/insights.utils';
import { LIBRARY_COLLECTIONS, LibraryCollection, STATUS_COLLECTIONS } from '../../shared/library-collections';

addIcons({
  addOutline, checkmarkCircleOutline, flameOutline, heartOutline, layersOutline,
  pauseCircleOutline, playCircleOutline, statsChartOutline,
});

interface StatusRow {
  collection: LibraryCollection;
  status: GamePlayStatus;
  label: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-insights',
  imports: [NgTemplateOutlet, RouterLink, GameCoverComponent, PageHeaderComponent, IonContent, IonIcon, IonSpinner],
  templateUrl: './insights.page.html',
  styleUrl: './insights.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  private readonly gameService = inject(GameService);

  protected readonly gamesLoading = this.gameService.gamesLoading;
  protected readonly insights = computed(() => computeLibraryInsights(this.gameService.games()));
  protected readonly statusRows = computed(() => buildStatusRows(this.insights()));

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

function buildStatusRows(insights: LibraryInsights): StatusRow[] {
  const counts: Record<GamePlayStatus, number> = {
    not_started: insights.notStartedCount,
    playing: insights.playingCount,
    paused: insights.pausedCount,
    completed: insights.completedCount,
    wishlist: insights.wishlistCount,
  };
  return STATUS_COLLECTIONS.map((collection) => ({
    collection,
    status: collection as GamePlayStatus,
    label: LIBRARY_COLLECTIONS[collection].label,
    icon: LIBRARY_COLLECTIONS[collection].icon,
    count: counts[collection as GamePlayStatus],
  }));
}
