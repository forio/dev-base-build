import { DialogClose } from '@radix-ui/react-dialog';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { PUSH_CATEGORY, SCOPE_BOUNDARY } from 'epicenter-libs';
import { FC, Fragment, PropsWithChildren, Suspense, useCallback, useState } from 'react';
import { Outlet } from 'react-router';
import invariant from 'tiny-invariant';
import { ErrorRoot } from '~/components/error/error';
import { Footer } from '~/components/footer/footer';
import { Header } from '~/components/header/header';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '~/components/ui/dialog/dialog';
import { useGuardedSession } from '~/query/auth';
import { useChannel, useChannelEffect } from '~/query/channel';
import { EpisodeQuery } from '~/query/episode';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import { EpisodeReadOutView } from '~/types/episode';
import { GroupChannelPush, WorldRunChannelPush } from '~/types/push';
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

const Main = () => {
  const session = useGuardedSession();
  const queryClient = useQueryClient();
  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episode })
  );

  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);

  const runChannel = useChannel({
    pushCategory: PUSH_CATEGORY.RUN,
    scopeBoundary: SCOPE_BOUNDARY.WORLD,
    scopeKey: world?.worldKey,
  });

  const onRunChannelPush = useCallback(
    (message: WorldRunChannelPush) => {
      switch (message.content.objectType) {
        case 'run': {
          if (message.content.run.executionContext.presets.creator === session.userKey)
            return;
          else return setNewRunDialogOpen(true);
        }
        case 'meta':
          return queryClient.setQueryData(
            RunQuery.metadata({ runKey: message.content.runKey }).queryKey,
            message.content.result
          );
        case 'state': {
          const {
            runKey,
            actions: [action],
          } = message.content;
          switch (action.objectType) {
            case 'set': {
              const cell = action.name.match(/Price\[0,(\d+)\]/);
              invariant(cell, 'Invalid cell name in run channel message');
              const step = Number(cell[1]);
              const next = action.value;
              return queryClient.setQueryData(
                RunQuery.variables({ runKey }).queryKey,
                (old) =>
                  !old
                    ? old
                    : { ...old, Price: old.Price.map((v, i) => (i === step ? next : v)) }
              );
            }
            case 'execute':
              return queryClient.invalidateQueries(
                RunQuery.variables({ runKey: message.content.runKey })
              );
            default:
              console.warn('Unknown run channel message', message);
          }
        }
      }
    },
    [session.userKey, queryClient]
  );

  useChannelEffect({
    token: session.token,
    channel: runChannel,
    callback: onRunChannelPush,
  });

  return (
    <Fragment>
      <Outlet />
      <Dialog open={newRunDialogOpen} onOpenChange={setNewRunDialogOpen}>
        <DialogContent>
          <DialogTitle>
            <Lang ns="play" kp="new_run">
              dialog_title
            </Lang>
          </DialogTitle>
          <p>
            <Lang ns="play" kp="new_run">
              dialog_body
            </Lang>
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries(
                    RunQuery.byWorld({
                      session,
                      worldKey: world.worldKey,
                    })
                  )
                }
              >
                <Lang ns="play" kp="new_run">
                  dialog_ok
                </Lang>
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
};

const Layout = () => {
  const session = useGuardedSession();
  const queryClient = useQueryClient();

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
    (
      message: GroupChannelPush<{
        type: 'EPISODE';
        content: {
          activity: 'create';
          episode: EpisodeReadOutView;
          groupKey: string;
          objectType: 'episode';
        };
      }>
    ) => {
      switch (message.content.activity) {
        case 'create':
          return queryClient.invalidateQueries(EpisodeQuery.current({ session }));
        default:
          console.warn('Unknown group channel message', message);
      }
    },
    [queryClient, session]
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
