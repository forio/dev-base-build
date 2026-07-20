import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { GroupQuery } from '~/query/group';
import { RunQuery } from '~/query/run';
import { formatDollar } from '~/utils/formatter';
import styles from './index.module.scss';

export const Route = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: currentEpisode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: episodes = [] } = useSuspenseQuery(EpisodeQuery.list({ session }));

  const [selectedEpisodeKey, setSelectedEpisodeKey] = useState(currentEpisode.episodeKey);
  const selectedEpisode = episodes.find((ep) => ep.episodeKey === selectedEpisodeKey);
  invariant(selectedEpisode, 'Selected episode not found in episode list');

  const { data: members = [] } = useSuspenseQuery(GroupQuery.members({ session }));
  const participants = useMemo(
    () =>
      new Map(
        members
          .filter((member) => member.role === 'participant')
          .map((p) => [p.user.userKey, p])
      ),
    [members]
  );

  const { data: runs = [] } = useQuery(
    RunQuery.byEpisode({ session, episode: selectedEpisode })
  );

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
      <div className={styles.data}>
        <Table striped compact numeric>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Run Created</th>
              <th>Year</th>
              <th>Revenue</th>
              <th>Total Costs</th>
              <th>Profit</th>
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
                  <td>{participants.get(run.scope.userKey!)?.user.displayName}</td>
                  <td>{new Date(run.created).toLocaleDateString()}</td>
                  <td>{run.variables.Step}</td>
                  <td>{formatDollar(run.variables.Revenue[run.variables.Step])}</td>
                  <td>{formatDollar(run.variables.Total_Costs[run.variables.Step])}</td>
                  <td>{formatDollar(run.variables.Profit[run.variables.Step])}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};
