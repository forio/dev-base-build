import { QueryClient, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { chatAdapter, PUSH_CATEGORY, SCOPE_BOUNDARY } from 'epicenter-libs';
import { FC, PropsWithChildren, Suspense, useCallback, useMemo } from 'react';
import { Outlet } from 'react-router';
import { ErrorRoot } from '~/components/error/error';
import { Footer } from '~/components/footer/footer';
import { Header } from '~/components/header/header';
import { Card } from '~/components/ui/card/card';
import { useGuardedSession } from '~/query/auth';
import { useChannel, useChannelEffect } from '~/query/channel';
import { ChatQuery } from '~/query/chat';
import { EpisodeQuery } from '~/query/episode';
import { WorldQuery } from '~/query/world';
import { ChatMessage } from '~/types/chat';
import { EpisodeReadOutView } from '~/types/episode';
import { ChatChannelPush, GroupChannelPush } from '~/types/push';
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

const onChatPushImpl =
  (queryClient: QueryClient) =>
  (session: ReturnType<typeof useGuardedSession>) =>
  async (data: ChatChannelPush) => {
    const { queryKey } = ChatQuery.messages({ chatKey: data.content.chatKey });
    const { chatMessage } = data.content;
    if (chatMessage.senderKey !== session.userKey) {
      switch (data.type) {
        case 'BROADCAST': {
          queryClient.setQueryData(queryKey, (prev: ChatMessage[] | undefined) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === chatMessage.id)) return prev;
            return [
              {
                ...chatMessage,
                receiverKey: chatMessage.receiverKey || null,
              },
              ...prev,
            ];
          });
          break;
        }
        case 'TARGETED': {
          try {
            const fetched = await chatAdapter
              .getMessages(data.content.chatKey, {
                horizon: chatMessage.id,
                maxRecords: 1,
              })
              .then((response) => response as unknown as ChatMessage[])
              .then(([msg]) => msg);
            if (fetched) {
              queryClient.setQueryData(queryKey, (prev: ChatMessage[] | undefined) => {
                if (!prev) return prev;
                if (prev.some((m) => m.id === fetched.id)) return prev;
                return [fetched, ...prev];
              });
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    return queryClient.invalidateQueries({ queryKey });
  };

const Impl = () => {
  const session = useGuardedSession();
  const queryClient = useQueryClient();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episode })
  );

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

  const episodeChatChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.EPISODE,
    scopeKey: episode.episodeKey,
    pushCategory: PUSH_CATEGORY.CHAT,
  });

  const worldChatChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.WORLD,
    scopeKey: world.worldKey,
    pushCategory: PUSH_CATEGORY.CHAT,
  });

  const onChatPush = useMemo(
    () => onChatPushImpl(queryClient)(session),
    [queryClient, session]
  );

  useChannelEffect({
    token: session.token,
    channel: episodeChatChannel,
    callback: onChatPush,
  });

  useChannelEffect({
    token: session.token,
    channel: worldChatChannel,
    callback: onChatPush,
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
