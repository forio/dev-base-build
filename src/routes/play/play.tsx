import { DialogClose } from '@radix-ui/react-dialog';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { PUSH_CATEGORY, SCOPE_BOUNDARY } from 'epicenter-libs';
import { FC, Fragment, PropsWithChildren, Suspense, useCallback, useState } from 'react';
import { Outlet } from 'react-router';
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
    scopeKey: world.worldKey,
  });

  const onRunChannelPush = useCallback(
    (message: WorldRunChannelPush) => {
      switch (message.content.objectType) {
        case 'run': {
          const quoted = (str: string) => `"${str}"`; // EPICENTER-6493
          if (
            message.content.run.executionContext.presets.creator ===
            quoted(session.userKey)
          )
            return;
          else return setNewRunDialogOpen(true);
        }
        case 'meta': {
          const { queryKey } = RunQuery.metadata({ runKey: message.content.runKey });
          // set immediately ...
          queryClient.setQueryData(queryKey, message.content.result);
          // ... revalidate
          return queryClient.invalidateQueries({ queryKey });
        }
        case 'state': {
          const {
            runKey,
            actions: [action],
            result: [variables],
          } = message.content;
          switch (action.objectType) {
            case 'execute': {
              const { queryKey } = RunQuery.variables({ runKey });
              // set immediately ...
              queryClient.setQueryData(queryKey, { state: variables });
              // ... revalidate
              return queryClient.invalidateQueries({ queryKey });
            }
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
    async (message: GroupChannelPush) => {
      switch (message.content.objectType) {
        case 'episode':
          return queryClient.invalidateQueries(EpisodeQuery.current({ session }));
        case 'assignment': {
          const episode = await queryClient.ensureQueryData(
            EpisodeQuery.current({ session })
          );
          return queryClient.invalidateQueries(
            WorldQuery.bySessionPerEpisode({
              session,
              episode,
            })
          );
        }
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
