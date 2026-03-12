import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  PUSH_CATEGORY,
  runAdapter,
  SCOPE_BOUNDARY,
} from 'epicenter-libs';
import { useCallback } from 'react';
import { Button } from '~/components/ui/button/button';
import { cn } from '~/components/ui/cn';
import { Input } from '~/components/ui/input/input';
import { useGuardedSession } from '~/query/auth';
import { useChannel, useChannelEffect } from '~/query/channel';
import { EpisodeQuery } from '~/query/episode';
import {
  LeaderboardQuery,
  LEADERBOARD_COLLECTION,
} from '~/query/leaderboard';
import { MODEL, RunQuery } from '~/query/run';
import { LeaderboardRow } from '~/types/leaderboard';
import { EpisodeLeaderboardPush } from '~/types/push';
import styles from './index.module.scss';

const labelForRow = (row: LeaderboardRow) =>
  row.user?.displayName ?? row.user?.detail.handle ?? 'Anonymous';

const medal = (rank: number) =>
  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

export const PlayerHome = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: run } = useSuspenseQuery(
    RunQuery.byUserPerEpisode({ session, episodeKey: episode.episodeKey })
  );

  const leaderboardQuery = LeaderboardQuery.byEpisodeCollection({
    session,
    episodeKey: episode.episodeKey,
    collection: LEADERBOARD_COLLECTION,
  });
  const { data: leaderboard = [] } = useSuspenseQuery(leaderboardQuery);
  const { data: variables } = useSuspenseQuery(
    RunQuery.variables({ runKey: run.runKey })
  );

  const state = variables.state;

  const invalidateLeaderboard = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ['leaderboard', 'episode', session.groupKey, episode.episodeKey, LEADERBOARD_COLLECTION],
      }),
    [queryClient, session.groupKey, episode.episodeKey]
  );

  const leaderboardChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.EPISODE,
    scopeKey: episode.episodeKey,
    pushCategory: PUSH_CATEGORY.LEADERBOARD,
  });

  const onLeaderboardPush = useCallback(
    (message: EpisodeLeaderboardPush) => {
      if (message.address.key !== episode.episodeKey) return;
      if (message.type !== 'UPDATED') return;
      void invalidateLeaderboard();
    },
    [episode.episodeKey, invalidateLeaderboard]
  );

  useChannelEffect({
    token: session.token,
    channel: leaderboardChannel,
    callback: onLeaderboardPush,
  });

  const handleRestart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runAdapter
      .create(
        MODEL,
        {
          scopeBoundary: SCOPE_BOUNDARY.EPISODE,
          scopeKey: episode.episodeKey,
          userKey: session.userKey,
        },
        {
          executionContext: {
            version: 'v1',
            // @ts-expect-error - Fixed in future version
            presets: {
              leaderboardScope: {
                scopeBoundary: SCOPE_BOUNDARY.EPISODE,
                scopeKey: episode.episodeKey,
              },
            },
          },
          modelContext: {
            version: 'v2',
            // @ts-expect-error - Fixed in future version
            externalFunctions: {
              leaderboard: {
                leaderboard: {},
              },
            },
          },
        }
      )
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: RunQuery.byUserPerEpisode({ session, episodeKey: episode.episodeKey })
            .queryKey,
        })
      );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const value = Number(fd.get('guess'));
    if (!value || value < 1 || value > 1000) return;

    e.currentTarget.reset();
    runAdapter.operation(run.runKey, 'guess', [value]).then(() =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: RunQuery.variables({ runKey: run.runKey }).queryKey,
        }),
        invalidateLeaderboard(),
      ])
    );
  };

  const feedbackFor = (guess: number, index: number): string => {
    if (state.won && index === state.guesses.length - 1) return 'Correct';
    if (guess < state.minimum) return 'Higher';
    if (guess > state.maximum) return 'Lower';
    return state.advice;
  };

  const currentRunEntry = leaderboard.find((row) => row.runKey === run.runKey);
  const nextGuess = Math.round((state.minimum + state.maximum) / 2);

  return (
    <section className={styles.root}>
      <header className={styles.bar}>
        <h1 className={styles.title}>Number challenge</h1>
        <span className={styles.tag}>
          {state.minimum}–{state.maximum}
        </span>
        <span className={styles.tag}>
          {state.attempts} guess{state.attempts !== 1 ? 'es' : ''}
        </span>
      </header>

      <div className={styles.columns}>
        <div className={styles.play}>
          {state.won ? (
            <div className={styles.won}>
              <div className={styles.wonRow}>
                <span className={styles.wonIcon}>✓</span>
                <div>
                  <strong>Solved in {state.attempts}!</strong>
                  <p>
                    {currentRunEntry
                      ? `Rank #${currentRunEntry.rank}`
                      : 'Syncing to leaderboard…'}
                  </p>
                </div>
              </div>
              <form onSubmit={handleRestart}>
                <Button type="submit" variant="primary" size="md" fullWidth>
                  Play Again
                </Button>
              </form>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputRow}>
                <Input
                  className={styles.guessInput}
                  type="number"
                  name="guess"
                  min={state.minimum}
                  max={state.maximum}
                  placeholder={`Try ${nextGuess}?`}
                  autoFocus
                  required
                />
                <Button type="submit" variant="primary" size="md">
                  Guess
                </Button>
              </div>
              {state.attempts > 0 && (
                <div
                  className={cn(
                    styles.hint,
                    state.advice === 'Higher' && styles.hintUp,
                    state.advice === 'Lower' && styles.hintDown
                  )}
                >
                  {state.advice === 'Higher' ? '↑ Higher' : '↓ Lower'}
                </div>
              )}
            </form>
          )}

          {state.guesses.length > 0 && (
            <table className={styles.log}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Guess</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {[...state.guesses]
                  .map((guess, index) => [guess, index] as const)
                  .reverse()
                  .map(([guess, i]) => {
                    const fb = feedbackFor(guess, i);
                    return (
                      <tr key={i} data-feedback={fb}>
                        <td>{i + 1}</td>
                        <td>{guess}</td>
                        <td>
                          {fb === 'Higher' && '↑ '}
                          {fb === 'Lower' && '↓ '}
                          {fb === 'Correct' && '✓ '}
                          {fb}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

        <aside className={styles.board}>
          <div className={styles.boardHead}>
            <h2>Leaderboard</h2>
            <span className={styles.count}>{leaderboard.length}</span>
          </div>

          {leaderboard.length > 0 ? (
            <ol className={styles.list}>
              {leaderboard.map((row) => (
                  <li key={row.leaderboardKey} className={styles.entry}>
                    <span className={styles.rank}>{medal(row.rank)}</span>
                    <span className={styles.name}>{labelForRow(row)}</span>
                    <strong className={styles.score}>
                      {row.attempts ?? '–'}
                    </strong>
                  </li>
              ))}
            </ol>
          ) : (
            <p className={styles.empty}>No finishes yet — be first!</p>
          )}
        </aside>
      </div>
    </section>
  );
};
