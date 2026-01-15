import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
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
import { WorldQuery } from '~/query/world';
import { GroupChannelPush } from '~/types/push';
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

const Main = () => <Outlet />;

const Layout = () => {
  const session = useGuardedSession();
  const queryClient = useQueryClient();
  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));

  const groupChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.GROUP,
    scopeKey: session.groupKey!,
    pushCategory: PUSH_CATEGORY.GROUP,
  });

  /**
   * Requires `allowChannel: true` for group.
   * Set `project.allowChannelGroupDefault: true` to create groups with the flag on.
   */
  const onGroupChannelPush = useCallback(
    (message: GroupChannelPush) => {
      switch (message.type) {
        case 'EPISODE':
          return queryClient.invalidateQueries(EpisodeQuery.current({ session }));
        case 'ASSIGNMENT': {
          const { queryKey: myWorldQueryKey } = WorldQuery.bySessionPerEpisode({
            session,
            episode,
          });
          const myWorldCached = queryClient.getQueryData(myWorldQueryKey);
          const myWorldLatest = message.content.worlds.find(
            (w) => w.worldKey === myWorldCached?.worldKey
          );
          if (myWorldLatest) queryClient.setQueryData(myWorldQueryKey, myWorldLatest);

          return queryClient.invalidateQueries(
            WorldQuery.bySessionPerEpisode({ session, episode })
          );
        }
      }
    },
    [queryClient, session, episode]
  );

  useChannelEffect({
    token: session.token,
    channel: groupChannel,
    callback: onGroupChannelPush,
  });

  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Suspense fallback={<Loading />}>
          <Main />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export const PlayerShell = () => {
  return (
    <Guard>
      <Layout />
    </Guard>
  );
};

PlayerShell.errorElement = () => (
  <ErrorShell>
    <ErrorRoot.Match />
  </ErrorShell>
);
