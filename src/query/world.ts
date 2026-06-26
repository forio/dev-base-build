import { queryOptions } from '@tanstack/react-query';
import { Fault, UserSession, worldAdapter } from 'epicenter-libs';
import { EpisodeReadOutView } from '~/types/episode';
import { WorldReadOutView } from '~/types/world';

const bySessionPerEpisode = ({
  session,
  episodeName,
}: {
  session: UserSession;
  episodeName: string;
}) =>
  queryOptions({
    queryKey: [
      'world',
      'bySessionPerEpisode',
      session.token,
      session.groupName,
      episodeName,
    ],
    queryFn: () =>
      worldAdapter
        .get({
          mine: true,
          groupName: session.groupName,
          episodeName,
        })
        .then((response) => response as unknown as Array<WorldReadOutView>)
        .then(([mine]) => {
          if (!mine) throw new Fault({ status: 404, message: 'World not found' });
          return mine;
        }),
    staleTime: Infinity,
    retry(failureCount, error) {
      if (error instanceof Fault && error.status === 404) return false;
      return failureCount < 3;
    },
  });

const byEpisode = ({
  session,
  episodeName,
}: {
  session: UserSession;
  episodeName: string;
}) =>
  queryOptions({
    queryKey: ['world', 'byEpisode', session.token, session.groupName, episodeName],
    queryFn: () =>
      worldAdapter
        .get({
          groupName: session.groupName,
          episodeName,
        })
        .then((response) => response as unknown as Array<WorldReadOutView>),
    staleTime: Infinity,
  });

type Placement = {
  worldKey: string;
  role: string;
};

export type PlacementChangeReason = 'added' | 'moved' | 'role-changed' | 'removed';

export const isWorldInEpisode =
  (episode: EpisodeReadOutView) => (world: WorldReadOutView) =>
    world.orbitType?.toLowerCase() === 'episode' && world.orbitKey === episode.episodeKey;

const placementInWorld = (
  world: WorldReadOutView | undefined,
  userKey: string
): Placement | undefined => {
  const assignment = world?.assignments.find(
    (assignment) => assignment.user.userKey === userKey
  );

  return world && assignment
    ? { worldKey: world.worldKey, role: assignment.role }
    : undefined;
};

const placementInWorlds = (
  worlds: WorldReadOutView[],
  userKey: string
): Placement | undefined => {
  for (const world of worlds) {
    const placement = placementInWorld(world, userKey);

    if (placement) return placement;
  }

  return undefined;
};

export const detectPlacementChangeFromPush = ({
  pushedWorlds,
  cachedWorld,
  userKey,
}: {
  pushedWorlds: WorldReadOutView[];
  cachedWorld: WorldReadOutView | undefined;
  userKey: string;
}): PlacementChangeReason | undefined => {
  const before = placementInWorld(cachedWorld, userKey);
  const after = placementInWorlds(pushedWorlds, userKey);

  if (!before && after) return 'added';
  if (before && !after) {
    const cachedWorldWasPushed = Boolean(
      cachedWorld && pushedWorlds.some((world) => world.worldKey === cachedWorld.worldKey)
    );

    // Assignment pushes are partial. Missing from this push means removed only
    // when the pushed payload includes the world we previously believed held the user.
    return cachedWorldWasPushed ? 'removed' : undefined;
  }
  if (before && after && before.worldKey !== after.worldKey) return 'moved';
  if (before && after && before.role !== after.role) return 'role-changed';

  return undefined;
};

export const WorldQuery = {
  bySessionPerEpisode,
  byEpisode,
};
