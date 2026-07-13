import { Game } from '../../models/game.model';

export interface InsightBucket {
  label: string;
  count: number;
  hours: number;
}

export interface LibraryInsights {
  total: number;
  libraryCount: number;
  wishlistCount: number;
  completedCount: number;
  playingCount: number;
  pausedCount: number;
  notStartedCount: number;
  completionRate: number;
  totalHours: number;
  averageRating: number | null;
  ratedCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  byPlatform: InsightBucket[];
  byGenre: InsightBucket[];
  recentActivity: Game[];
}

function dayKey(iso?: string): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function activityDates(games: Game[]): string[] {
  const keys = new Set<string>();
  for (const g of games) {
    for (const field of [g.lastPlayedAt, g.completedAt, g.startedAt, g.ratedAt]) {
      const k = dayKey(field);
      if (k) {
        keys.add(k);
      }
    }
  }
  return [...keys].sort();
}

function computeStreaks(sortedDays: string[]): {
  current: number;
  longest: number;
} {
  if (sortedDays.length === 0) {
    return { current: 0, longest: 0 };
  }

  const daySet = new Set(sortedDays);
  let longest = 1;
  let run = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(`${sortedDays[i - 1]}T12:00:00Z`).getTime();
    const cur = new Date(`${sortedDays[i]}T12:00:00Z`).getTime();
    const diffDays = Math.round((cur - prev) / 86400000);
    if (diffDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: consecutive days ending today or yesterday
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const y = new Date(today);
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterdayKey = y.toISOString().slice(0, 10);

  let cursor: string | null = null;
  if (daySet.has(todayKey)) {
    cursor = todayKey;
  } else if (daySet.has(yesterdayKey)) {
    cursor = yesterdayKey;
  }

  let current = 0;
  while (cursor && daySet.has(cursor)) {
    current += 1;
    const d = new Date(`${cursor}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  return { current, longest: Math.max(longest, current) };
}

function topBuckets(
  entries: Array<{ label: string; hours: number }>,
  limit = 6,
): InsightBucket[] {
  const map = new Map<string, InsightBucket>();
  for (const e of entries) {
    const key = e.label || 'Unknown';
    const existing = map.get(key) ?? { label: key, count: 0, hours: 0 };
    existing.count += 1;
    existing.hours += e.hours;
    map.set(key, existing);
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.hours - a.hours)
    .slice(0, limit);
}

export function computeLibraryInsights(games: Game[]): LibraryInsights {
  const library = games.filter((g) => g.status !== 'wishlist');
  const wishlist = games.filter((g) => g.status === 'wishlist');
  const completed = library.filter((g) => g.status === 'completed');
  const playing = library.filter((g) => g.status === 'playing');
  const paused = library.filter((g) => g.status === 'paused');
  const notStarted = library.filter((g) => g.status === 'not_started');

  const totalHours = library.reduce(
    (sum, g) => sum + (g.playtimeHours ?? g.playtime ?? 0),
    0,
  );

  const ratings = library
    .map((g) => g.rating)
    .filter((r): r is number => r != null && Number.isFinite(r));

  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null;

  const hoursOf = (g: Game) => g.playtimeHours ?? g.playtime ?? 0;

  const byPlatform = topBuckets(
    library.map((g) => ({
      label: g.platform?.name || 'Unknown',
      hours: hoursOf(g),
    })),
  );

  const byGenre = topBuckets(
    library.flatMap((g) =>
      (g.genre?.length ? g.genre : ['Uncategorized']).map((label) => ({
        label,
        hours: hoursOf(g),
      })),
    ),
  );

  const streaks = computeStreaks(activityDates(games));

  const recentActivity = [...library]
    .filter((g) => g.lastPlayedAt || g.completedAt || g.updatedAt)
    .sort((a, b) => {
      const ta = Date.parse(a.lastPlayedAt || a.completedAt || a.updatedAt || '') || 0;
      const tb = Date.parse(b.lastPlayedAt || b.completedAt || b.updatedAt || '') || 0;
      return tb - ta;
    })
    .slice(0, 8);

  return {
    total: games.length,
    libraryCount: library.length,
    wishlistCount: wishlist.length,
    completedCount: completed.length,
    playingCount: playing.length,
    pausedCount: paused.length,
    notStartedCount: notStarted.length,
    completionRate:
      library.length > 0
        ? Math.round((completed.length / library.length) * 100)
        : 0,
    totalHours: Math.round(totalHours * 10) / 10,
    averageRating,
    ratedCount: ratings.length,
    currentStreakDays: streaks.current,
    longestStreakDays: streaks.longest,
    byPlatform,
    byGenre,
    recentActivity,
  };
}
