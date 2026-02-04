import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import invariant from 'tiny-invariant';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import { formatDollar } from '~/utils/formatter';
import styles from './index.module.scss';

const toStepIndex = (value: number | number[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'number' && Number.isFinite(raw)
    ? Math.max(0, Math.floor(raw))
    : 0;
};

const formatMoney = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? formatDollar(value) : '—';

export const Route = () => {
  const session = useGuardedSession();

  const { data: currentEpisode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: episodes } = useSuspenseQuery(EpisodeQuery.list({ session }));

  const [selectedEpisodeKey, setSelectedEpisodeKey] = useState(currentEpisode.episodeKey);
  const selectedEpisode = episodes.find((ep) => ep.episodeKey === selectedEpisodeKey);
  invariant(selectedEpisode, 'Selected episode not found in episode list');

  const { data: runs = [] } = useQuery(
    RunQuery.byEpisode({ session, episode: selectedEpisode })
  );

  const { data: worlds } = useSuspenseQuery(
    WorldQuery.byEpisode({ session, episode: currentEpisode })
  );

  const worldsMap = useMemo(
    () => new Map(worlds.map((world) => [world.worldKey, world])),
    [worlds]
  );

  /* Manage both worlds and episodes through Epicenter UI */
  // const newEpisode = () =>
  //   EpisodeQuery.push(session.groupName!).then(() =>
  //     Promise.all([
  //       queryClient.refetchQueries(EpisodeQuery.list({ session })),
  //       queryClient.refetchQueries(EpisodeQuery.current({ session })),
  //     ]).then(() => {
  //       const current = queryClient.getQueryData(
  //         EpisodeQuery.current({ session }).queryKey
  //       );
  //       invariant(current, 'Just created an episode but none found in cache');
  //       setSelectedEpisodeKey(current.episodeKey);
  //     })
  //   );

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
      </div>
      <div className={styles.data}>
        <Table striped compact numeric>
          <thead>
            <tr>
              <th>Participants</th>
              <th>Run Created</th>
              <th>Step</th>
              <th>Decision Year</th>
              <th>Report Profit</th>
            </tr>
          </thead>
          <tbody>
            {runs
              .slice()
              .sort(
                (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
              )
              .map((run) => (
                <tr key={run.runKey}>
                  <td>
                    {worldsMap
                      .get(run.scope.scopeKey!)
                      ?.assignments.map((assignment) => assignment.user.displayName)
                      .join(', ')}
                  </td>
                  <td>{new Date(run.created).toLocaleDateString()}</td>
                  <td>{toStepIndex(run.variables.Step)}</td>
                  <td>
                    {run.variables.Time?.[toStepIndex(run.variables.Step)] ??
                      toStepIndex(run.variables.Step) + 1}
                  </td>
                  <td>
                    {formatMoney(
                      run.variables.Report_Profit?.[toStepIndex(run.variables.Step)]
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};
