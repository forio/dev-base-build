import { queryOptions } from '@tanstack/react-query';
import { runAdapter, SCOPE_BOUNDARY, UserSession } from 'epicenter-libs';
import invariant from 'tiny-invariant';
import { RunReadOutView } from '~/types/run';

export const MODEL = 'model.xlsx';

const byUserPerEpisode = ({
  session,
  episodeKey = '',
}: {
  session: UserSession;
  episodeKey: string | undefined;
}) =>
  queryOptions({
    queryKey: ['run', 'per-user', episodeKey, session.userKey],
    queryFn: async () => {
      const scope = {
        scopeBoundary: SCOPE_BOUNDARY.EPISODE,
        scopeKey: episodeKey,
        userKey: session.userKey,
      };
      const [run] = await runAdapter
        .query(MODEL, {
          scope,
          filter: ['run.hidden=false'],
          sort: ['-run.created'],
          max: 1,
        })
        .then((response) => response.values as Array<RunReadOutView>);
      if (run) return run;
      return runAdapter.create(MODEL, scope).then((run) => run as RunReadOutView);
    },
    staleTime: Infinity,
    enabled: Boolean(session.userKey && episodeKey),
  });

const byEpisode = ({
  session,
  episodeKey = '',
}: {
  session: UserSession;
  episodeKey: string | undefined;
}) => {
  invariant(
    session.groupRole === 'FACILITATOR',
    'Only Facilitator should call RunQuery.byEpisode'
  );

  const filters = ['run.hidden=false', 'run.userKey*=true'];
  const variables = [...RANGES];

  return queryOptions({
    queryKey: ['run', 'per-episode', episodeKey, filters, variables],
    queryFn: () =>
      runAdapter
        .query(MODEL, {
          scope: {
            scopeBoundary: SCOPE_BOUNDARY.EPISODE,
            scopeKey: episodeKey,
          },
          filter: filters,
          sort: ['+run.created'],
          variables,
        })
        .then(({ values }) => values as Array<RunReadOutView<Variables>>),
    staleTime: Infinity,
    enabled: Boolean(episodeKey),
  });
};

const RANGES = [
  'Time',
  'Bike_Sales',
  'Price',
  'Revenue',
  'Variable_Costs',
  'Fixed_Costs',
  'Total_Costs',
  'Profit',
  'Step',
] as const;

type Variables = { Step: number } & {
  [K in Exclude<(typeof RANGES)[number], 'Step'>]: number[];
};

const variables = ({ runKey = '' }: { runKey: string | undefined }) =>
  queryOptions({
    queryKey: ['variables', runKey],
    queryFn: () =>
      runAdapter
        .getVariables(runKey!, [...RANGES], { ritual: 'REVIVE' })
        .then((response) => {
          invariant(
            !Array.isArray(response),
            'Fetched multiple runs when only one was expected.'
          );
          return response;
        })
        .then((response) => response as Variables),
    enabled: Boolean(runKey),
  });

export const RunQuery = {
  byUserPerEpisode,
  byEpisode,
  variables,
};
