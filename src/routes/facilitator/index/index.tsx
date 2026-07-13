import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { INTERVALS, TaskQuery } from '~/query/task';
import styles from './index.module.scss';

const IntervalSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (cron: string) => void;
}) => (
  <label className={styles.field}>
    Interval
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {INTERVALS.map((interval) => (
        <option key={interval.cron} value={interval.cron}>
          {interval.label}
        </option>
      ))}
    </select>
  </label>
);

const TaskPanel = () => {
  const session = useGuardedSession();
  const queryClient = useQueryClient();
  const { data: task } = useQuery(TaskQuery.active({ session }));
  const { data: ticks } = useQuery(TaskQuery.ticks({ session }));

  const [cron, setCron] = useState<string>(INTERVALS[0].cron);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();

  const perform = async (action?: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await TaskQuery.stop(session);
      await action?.();
      await Promise.all([
        queryClient.invalidateQueries(TaskQuery.active({ session })),
        queryClient.invalidateQueries(TaskQuery.ticks({ session })),
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={styles.taskPanel}>
      <h2>Scheduled task</h2>
      <p className={styles.note}>
        Schedules a recurring task that POSTs the proxy&rsquo;s <code>/tick</code> route;
        each fire overwrites the tick state below. The platform schedules nothing sooner
        than 5 minutes out, so the first tick lands ~5 minutes after the task is created.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error.message}
        </p>
      )}

      {task ? (
        <div className={styles.controlRow}>
          <dl className={styles.meta}>
            <div>
              <dt>Status</dt>
              <dd>{task.status}</dd>
            </div>
            <div>
              <dt>Cron</dt>
              <dd>
                <code>{task.cron}</code>
              </dd>
            </div>
            <div>
              <dt>Fires</dt>
              <dd>
                ✓ {task.successes} ✗ {task.failures}
              </dd>
            </div>
          </dl>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => perform()}
          >
            Stop
          </Button>
        </div>
      ) : (
        <div className={styles.controlRow}>
          <IntervalSelect value={cron} onChange={setCron} />
          <Button disabled={busy} onClick={() => perform(() => TaskQuery.start(session, cron))}>
            Start task
          </Button>
        </div>
      )}

      <p className={styles.tickState}>
        {ticks?.lastTickAt
          ? `${ticks.tickCount} tick${ticks.tickCount === 1 ? '' : 's'} — last at ${new Date(ticks.lastTickAt).toLocaleTimeString()}`
          : 'No ticks yet.'}
      </p>
    </Card>
  );
};

export const Route = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: currentEpisode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: episodes = [] } = useSuspenseQuery(EpisodeQuery.list({ session }));

  const [selectedEpisodeKey, setSelectedEpisodeKey] = useState(currentEpisode.episodeKey);
  const selectedEpisode = episodes.find((ep) => ep.episodeKey === selectedEpisodeKey);
  invariant(selectedEpisode, 'Selected episode not found in episode list');

  const newEpisode = () =>
    EpisodeQuery.push(session.groupName!).then(() =>
      Promise.all([
        queryClient.refetchQueries(EpisodeQuery.list({ session })),
        queryClient.refetchQueries(EpisodeQuery.current({ session })),
      ]).then(() => {
        const current = queryClient.getQueryData(
          EpisodeQuery.current({ session }).queryKey
        );
        invariant(current, 'Just created an episode but none found in cache');
        setSelectedEpisodeKey(current.episodeKey);
      })
    );

  return (
    <div className={styles.root}>
      <div className={styles.selectEpisode}>
        <label>
          Episode
          <select
            value={selectedEpisodeKey}
            onChange={(e) => setSelectedEpisodeKey(e.target.value)}
          >
            {episodes.map((ep) => (
              <option key={ep.episodeKey} value={ep.episodeKey}>
                {new Date(ep.created).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" onClick={newEpisode}>
          New Episode
        </Button>
      </div>

      <TaskPanel />
    </div>
  );
};
