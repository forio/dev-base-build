import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Button } from '~/components/ui/button/button';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { GroupQuery } from '~/query/group';
import { RunQuery } from '~/query/run';
import { formatDollar } from '~/utils/formatter';

export const Route = () => {
  const queryClient = useQueryClient();

  const session = useGuardedSession();

  const { data: episode } = useQuery(EpisodeQuery.current({ session }));
  const { data: members = [] } = useQuery(GroupQuery.members({ session }));

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
    RunQuery.byEpisode({ session, episodeKey: episode?.episodeKey })
  );

  return (
    <div>
      <Button
        intent="ghost"
        size="sm"
        onClick={() =>
          queryClient.invalidateQueries(
            RunQuery.byEpisode({
              session,
              episodeKey: episode?.episodeKey,
            })
          )
        }
      >
        Refresh
      </Button>
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
            .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
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
  );
};
