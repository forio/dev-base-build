import { queryOptions } from '@tanstack/react-query';
import { leaderboardAdapter, SCOPE_BOUNDARY, UserSession } from 'epicenter-libs';
import {
  LeaderboardReadOutView,
  LeaderboardRow,
  LeaderboardScore,
  LeaderboardTag,
} from '~/types/leaderboard';

export const LEADERBOARD_COLLECTION = 'binary-search';

const extractAttempts = (scores: LeaderboardScore[]): number | null => {
  const match = scores.find((score) => score.name === 'attempts');
  return Number.isFinite(match?.quantity) ? match!.quantity : null;
};

const normalizeDate = (value: Date | string | undefined): string => {
  if (value instanceof Date) return value.toISOString();
  if (!value) return new Date(0).toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString();
};

const normalizeTags = (tags: LeaderboardReadOutView['tags']): LeaderboardTag[] =>
  (tags ?? [])
    .map((tag) => ({
      label: tag.label ?? '',
      content: tag.content ?? tag.value ?? '',
    }))
    .filter((tag) => tag.label.length > 0);

const compareRows = (left: LeaderboardRow, right: LeaderboardRow) => {
  const leftAttempts = left.attempts ?? Number.POSITIVE_INFINITY;
  const rightAttempts = right.attempts ?? Number.POSITIVE_INFINITY;

  if (leftAttempts !== rightAttempts) return leftAttempts - rightAttempts;

  const leftUpdated = new Date(left.lastUpdated).getTime();
  const rightUpdated = new Date(right.lastUpdated).getTime();
  if (leftUpdated !== rightUpdated) return leftUpdated - rightUpdated;

  return left.leaderboardKey.localeCompare(right.leaderboardKey);
};

const normalizeRows = (rows: Array<LeaderboardReadOutView>): Array<LeaderboardRow> =>
  rows
    .map((row, index) => {
      const scores = row.scores ?? [];
      const tags = normalizeTags(row.tags);
      const runKey = tags.find((tag) => tag.label === 'runKey')?.content;
      const lastUpdated = normalizeDate(row.lastUpdated);
      const leaderboardKey =
        row.leaderboardKey ??
        runKey ??
        `${row.collection ?? LEADERBOARD_COLLECTION}:${lastUpdated}:${index}`;

      return {
        leaderboardKey,
        collection: row.collection ?? LEADERBOARD_COLLECTION,
        lastUpdated,
        scope: row.scope ?? {},
        scores,
        tags,
        user: row.scope?.user,
        attempts: extractAttempts(scores),
        rank: 0,
        runKey,
      } satisfies LeaderboardRow;
    })
    .sort(compareRows)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

const byEpisodeCollection = ({
  session,
  episodeKey,
  collection = LEADERBOARD_COLLECTION,
}: {
  session: UserSession;
  episodeKey: string;
  collection?: string;
}) =>
  queryOptions({
    queryKey: ['leaderboard', 'episode', session.groupKey, episodeKey, collection],
    queryFn: () =>
      leaderboardAdapter
        .list(
          collection,
          {
            scopeBoundary: SCOPE_BOUNDARY.EPISODE,
            scopeKey: episodeKey,
          },
          {
            sort: ['+score.attempts'],
            max: 200,
          }
        )
        .then((response) => normalizeRows(response as Array<LeaderboardReadOutView>)),
    staleTime: Infinity,
  });

export const LeaderboardQuery = {
  byEpisodeCollection,
};
