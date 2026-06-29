import { queryOptions } from '@tanstack/react-query';
import {
  Channel,
  PUSH_CATEGORY,
  SCOPE_BOUNDARY,
  config,
  type UserSession,
} from 'epicenter-libs';
import { type FloorChannelContent } from '~/types/push';
import { type WorldReadOutView } from '~/types/world';

export const PUBLIC_WORLD_VARIABLES = ['signal', 'pitch'] as const;

export type PublicWorldVariableName = (typeof PUBLIC_WORLD_VARIABLES)[number];
export type PublicPosture = Partial<Record<PublicWorldVariableName, string>>;

const proxyBase = () =>
  config.apiProtocol
    .concat('://')
    .concat(config.apiHost)
    .concat(`/proxy/${config.accountShortName}/${config.projectShortName}`);

const readPublicWorldVariables = async ({
  token,
  episodeKey,
  worldKey,
  variableNames,
}: {
  token: string;
  episodeKey: string;
  worldKey: string;
  variableNames: readonly PublicWorldVariableName[];
}): Promise<PublicPosture> => {
  const response = await fetch(
    `${proxyBase()}/world/${encodeURIComponent(episodeKey)}/${encodeURIComponent(
      worldKey
    )}/public/${encodeURIComponent(variableNames.join(';'))}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof body?.error === 'string'
        ? body.error
        : typeof body?.message === 'string'
          ? body.message
          : 'Unavailable';
    throw new Error(error);
  }

  return body as PublicPosture;
};

const publicWorldVariables = ({
  session,
  episodeKey,
  worldKey,
  variableNames,
}: {
  session: UserSession;
  episodeKey: string;
  worldKey: WorldReadOutView['worldKey'];
  variableNames: readonly PublicWorldVariableName[];
}) =>
  queryOptions({
    queryKey: [
      'proxy',
      'episode',
      session.token,
      episodeKey,
      'world',
      worldKey,
      'public',
      variableNames,
    ],
    queryFn: () =>
      readPublicWorldVariables({
        token: session.token,
        episodeKey,
        worldKey,
        variableNames,
      }),
    staleTime: 5_000,
  });

type PublishFloorChangeInput = Omit<FloorChannelContent, 'groupKey' | 'objectType'> & {
  session: UserSession;
};

const publishFloorChange = ({
  session,
  activity,
  episodeKey,
  worldKey,
  runKey,
}: PublishFloorChangeInput) => {
  if (!session.groupKey) {
    return Promise.reject(new Error('Cannot publish floor changes without a group.'));
  }

  return new Channel({
    scopeBoundary: SCOPE_BOUNDARY.GROUP,
    scopeKey: session.groupKey,
    pushCategory: PUSH_CATEGORY.CONTROL,
  }).publish({
    groupKey: session.groupKey,
    objectType: 'floor',
    activity,
    episodeKey,
    worldKey,
    runKey,
  } satisfies FloorChannelContent);
};

export const ProxyQuery = {
  publicWorldVariables,
  publishFloorChange,
};
