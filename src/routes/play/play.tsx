import { useQueryClient } from '@tanstack/react-query';
import { PUSH_CATEGORY, SCOPE_BOUNDARY } from 'epicenter-libs';
import { FC, PropsWithChildren, Suspense, useCallback } from 'react';
import { Outlet } from 'react-router';
import { ErrorRoot } from '~/components/error/error';
import { Footer } from '~/components/footer/footer';
import { Header } from '~/components/header/header';
import { Card } from '~/components/ui/card/card';
import { useGuardedSession } from '~/query/auth';
import { useChannel, useChannelEffect } from '~/query/channel';
import { EpisodeQuery } from '~/query/episode';
import { PUBLIC_WORLD_VARIABLES, ProxyQuery } from '~/query/proxy';
import { FloorChannelContent, GroupChannelPush } from '~/types/push';
import { Lang } from './lang';
import styles from './play.module.scss';

const ErrorShell: FC<PropsWithChildren> = ({ children }) => (
  <div className={styles.errorShell}>
    <Header />
    <div className={styles.contentWrapper}>
      <div className={styles.innerContent}>{children}</div>
    </div>
    <Footer />
  </div>
);

const Guard: FC<PropsWithChildren> = ({ children }) => {
  return children;
};

const Loading = () => (
  <div className={styles.loading}>
    <Card>
      <p>
        <Lang>getting_ready</Lang>
      </p>
    </Card>
  </div>
);

const Impl = () => {
  const session = useGuardedSession();
  const queryClient = useQueryClient();

  const groupChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.GROUP,
    scopeKey: session.groupKey!,
    pushCategory: PUSH_CATEGORY.GROUP,
  });
  const controlChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.GROUP,
    scopeKey: session.groupKey!,
    pushCategory: PUSH_CATEGORY.CONTROL,
  });

  /**
   * Requires `allowChannel: true` for group.
   * Set `project.allowChannelGroupDefault: true` to create groups with the flag on.
   */
  const onGroupChannelPush = useCallback(
    (message: GroupChannelPush) => {
      switch (message.content.objectType) {
        case 'episode':
          return queryClient.invalidateQueries(EpisodeQuery.current({ session }));
        // case 'assignment': {
        //   const currentEpisode = queryClient.getQueryData<EpisodeReadOutView>(
        //     EpisodeQuery.current({ session }).queryKey
        //   );
        //   if (!currentEpisode) return undefined;

        //   const pushedWorldsForCurrentEpisode = (message.content.worlds ?? []).filter(
        //     isWorldInEpisode(currentEpisode)
        //   );

        //   const myCachedWorld = queryClient.getQueryData<WorldReadOutView>(
        //     WorldQuery.bySessionPerEpisode({
        //       session,
        //       episodeName: currentEpisode.name,
        //     }).queryKey
        //   );

        //   const placementChangeReason = detectPlacementChangeFromPush({
        //     pushedWorlds: pushedWorldsForCurrentEpisode,
        //     cachedWorld: myCachedWorld,
        //     userKey: session.userKey,
        //   });

        //   if (placementChangeReason) {
        //     void regenerateSession().catch(console.error);
        //   }

        //   return undefined;
        // }
        default:
          console.warn('Unknown group channel message', message);
      }
    },
    [queryClient, session]
  );

  const onControlChannelPush = useCallback(
    (message: FloorChannelContent) => {
      switch (message.objectType) {
        case 'floor':
          return queryClient.invalidateQueries(
            ProxyQuery.publicWorldVariables({
              session,
              episodeKey: message.episodeKey,
              worldKey: message.worldKey,
              variableNames: PUBLIC_WORLD_VARIABLES,
            })
          );
        default:
          console.warn('Unknown control channel message', message);
      }
    },
    [queryClient, session]
  );

  useChannelEffect({
    token: session.token,
    channel: groupChannel,
    callback: onGroupChannelPush,
  });
  useChannelEffect({
    token: session.token,
    channel: controlChannel,
    callback: onControlChannelPush,
  });

  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export const PlayerShell = () => {
  return (
    <Guard>
      <Impl />
    </Guard>
  );
};

PlayerShell.errorElement = () => (
  <ErrorShell>
    <ErrorRoot.Match />
  </ErrorShell>
);
