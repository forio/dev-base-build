import { DialogClose } from '@radix-ui/react-dialog';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { PUSH_CATEGORY, runAdapter, SCOPE_BOUNDARY } from 'epicenter-libs';
import {
  FC,
  Fragment,
  PropsWithChildren,
  Suspense,
  useCallback,
  useState,
} from 'react';
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

const Debug = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();
  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episode })
  );
  const { data: run } = useSuspenseQuery(
    RunQuery.byWorld({ session, worldKey: world.worldKey })
  );

  const step = (delta: number) =>
    runAdapter
      .action(run.runKey, [{ objectType: 'execute', name: 'step', arguments: [delta] }])
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: [run.runKey, { invalidateOnStep: true }],
        })
      );

  return (
    <div className={styles.debug}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          runAdapter
            .removeFromWorld(world.worldKey)
            .then(() =>
              queryClient.invalidateQueries(
                RunQuery.byWorld({ session, worldKey: world.worldKey })
              )
            )
        }
      >
        New run
      </Button>
      <Button variant="secondary" size="sm" onClick={() => step(-1)}>
        Step -1
      </Button>
      <Button variant="secondary" size="sm" onClick={() => step(1)}>
        Step +1
      </Button>
    </div>
  );
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
          } = message.content;
          switch (action.objectType) {
            case 'execute':
              return queryClient.invalidateQueries({
                queryKey: [runKey, { invalidateOnStep: true }],
              });
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

  const consensusChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.WORLD,
    scopeKey: world.worldKey,
    pushCategory: PUSH_CATEGORY.CONSENSUS,
  });

  const onConsensusPush = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['consensus', world.worldKey] });
  }, [queryClient, world.worldKey]);

  useChannelEffect({
    token: session.token,
    channel: consensusChannel,
    callback: onConsensusPush,
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
      <Header>
        <Suspense fallback={null}>
          <Debug />
        </Suspense>
      </Header>
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
