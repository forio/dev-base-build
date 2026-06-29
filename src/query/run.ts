import { queryOptions } from '@tanstack/react-query';
import { runAdapter, type UserSession } from 'epicenter-libs';
import invariant from 'tiny-invariant';
import { EpisodeReadOutView } from '~/types/episode';
import { RunReadOutView } from '~/types/run';

export const MODEL = 'model.py';

const byWorld = ({ session, worldKey }: { session: UserSession; worldKey: string }) =>
  queryOptions({
    queryKey: ['run', 'byWorld', worldKey, session.userKey],
    queryFn: () =>
      runAdapter
        .retrieveFromWorld(worldKey, MODEL, {
          allowChannel: true,
        })
        .then((response) => response as unknown as RunReadOutView),
    staleTime: Infinity,
  });

const RANGES = ['signal', 'pitch', 'private_note', 'ready'] as const;

export type Variables = {
  signal: string;
  pitch: string;
  private_note: string;
  ready: boolean;
};

const byEpisode = ({
  session,
  episode,
}: {
  session: UserSession;
  episode: EpisodeReadOutView;
}) => {
  const { groupRole, groupName } = session;

  invariant(
    groupRole === 'FACILITATOR',
    'Only Facilitator should call RunQuery.byEpisode'
  );

  invariant(groupName, 'Reached authenticated route without session.groupName');

  const filter = ['run.hidden=false'];
  const variables = [...RANGES];

  return queryOptions({
    queryKey: ['run', 'per-episode', groupName, episode.name, filter, variables],
    queryFn: () =>
      runAdapter
        .query(MODEL, {
          filter,
          variables,
          groupName,
          episodeName: episode.name,
        })
        .then((body) => body.values as unknown as Array<RunReadOutView<Variables>>),
  });
};

const variables = ({ runKey }: { runKey: string }) =>
  queryOptions({
    queryKey: ['run', 'variables', runKey, ...RANGES],
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
  });

export const RunQuery = {
  byWorld,
  byEpisode,
  variables,
};
