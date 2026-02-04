import { queryOptions } from '@tanstack/react-query';
import { Fault, runAdapter, SCOPE_BOUNDARY, UserSession } from 'epicenter-libs';
import invariant from 'tiny-invariant';
import * as z from 'zod';
import { ModelVariablesSchema, ROLE_SCHEMAS } from '~/schemas/model';
import type { Role } from '~/schemas/world';
import { EpisodeReadOutView } from '~/types/episode';
import { RunReadOutView } from '~/types/run';

export const MODEL = 'model.xlsx';

/* Unused in multiplayer */
const byUserPerEpisode = ({
  session,
  episodeKey,
}: {
  session: UserSession;
  episodeKey: string;
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
  });

const byWorld = ({ session, worldKey }: { session: UserSession; worldKey: string }) =>
  queryOptions({
    queryKey: ['run', 'byWorld', worldKey, session.userKey],
    queryFn: () =>
      runAdapter
        .retrieveFromWorld(worldKey!, MODEL, {
          allowChannel: true,
          executionContext: {
            version: 'V1',
            // @ts-expect-error type fixed 3.33.0
            presets: { creator: `"${session.userKey}"` }, // EPICENTER-6493
          },
        })
        .then((response) => response as unknown as RunReadOutView),
    staleTime: Infinity,
  });

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
  const variableKeys = Object.keys(ModelVariablesSchema.shape);

  return queryOptions({
    queryKey: ['run', 'per-episode', groupName, episode.name, filter, variableKeys],
    queryFn: () =>
      runAdapter
        .query(MODEL, {
          filter,
          variables: variableKeys,
          groupName,
          episodeName: episode.name,
        })
        .then(
          (body) =>
            body.values as unknown as Array<
              RunReadOutView<z.infer<typeof ModelVariablesSchema>>
            >
        ),
  });
};

// Generic variables query - infers return type from schema
const variables = <S extends z.ZodObject<z.ZodRawShape>>({
  runKey,
  schema,
}: {
  runKey: string;
  schema: S;
}) => {
  const keys = Object.keys(schema.shape);
  return queryOptions({
    queryKey: [runKey, { invalidateOnStep: true }, 'run', 'variables', ...keys],
    queryFn: () =>
      runAdapter
        .getVariables(runKey, keys, { ritual: 'REVIVE' })
        .then((data) => schema.parse(data) as z.infer<S>),
  });
};

// Convenience query for role-based access
const variablesByRole = ({ runKey, role }: { runKey: string; role: Role }) =>
  variables({ runKey, schema: ROLE_SCHEMAS[role] });

const METADATA_KEYS = ['editor'] as const;
type MetadataResponse = [
  string | null, // editor
];
export type Metadata = {
  editor: string | null;
};

const metadata = ({ runKey }: { runKey: string }) =>
  queryOptions({
    queryKey: ['run', 'metadata', runKey, ...METADATA_KEYS],
    queryFn: () =>
      runAdapter
        .getMetadata(runKey!, [...METADATA_KEYS])
        .catch((error) => {
          if (error instanceof Fault && error.status === 410) return [null];
          throw error;
        })
        .then((response) => response as MetadataResponse)
        .then(([editor]): Metadata => ({ editor })),
  });

export const RunQuery = {
  byUserPerEpisode,
  byWorld,
  byEpisode,
  variables,
  variablesByRole,
  metadata,
};
