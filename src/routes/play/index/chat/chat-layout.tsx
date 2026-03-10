import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import type { Store } from 'jotai/vanilla/store';
import { chatAdapter, PUSH_CATEGORY, SCOPE_BOUNDARY } from 'epicenter-libs';
import { FC, Suspense, useEffect, useMemo } from 'react';
import { useChannel, useChannelEffect } from '~/query/channel';
import { ChatQuery } from '~/query/chat';
import { ChatMessage } from '~/types/chat';
import { GroupPermissionReadOutView } from '~/types/group';
import { ChatChannelPush } from '~/types/push';
import { ChatMessages } from './chat-messages';
import { ChatSidebar } from './chat-sidebar';
import {
  activeChatRoomAtom,
  markChatRoomUnreadAtom,
  setActiveChatRoomAtom,
  syncChatStateScopeAtom,
} from './chat-state';
import { Conversation } from './types';
import styles from './chat-layout.module.scss';

const onChatPushImpl =
  (queryClient: QueryClient, store: Store, currentUserKey: string) =>
  async (data: ChatChannelPush) => {
    const { queryKey } = ChatQuery.messages({ chatKey: data.content.chatKey });
    const {
      chatMessage,
      room,
    } = data.content;

    if (chatMessage.senderKey === currentUserKey) {
      return queryClient.invalidateQueries({ queryKey });
    }

    switch (data.type) {
      case 'BROADCAST': {
        queryClient.setQueryData(queryKey, (prev: ChatMessage[] | undefined) => {
          if (!prev) return prev;
          if (prev.some((message) => message.id === chatMessage.id)) return prev;
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
            .then(([message]) => message);

          if (fetched) {
            queryClient.setQueryData(queryKey, (prev: ChatMessage[] | undefined) => {
              if (!prev) return prev;
              if (prev.some((message) => message.id === fetched.id)) return prev;
              return [fetched, ...prev];
            });
          }
        } catch (error) {
          console.error(error);
        }
        break;
      }
    }

    store.set(markChatRoomUnreadAtom, room);

    return queryClient.invalidateQueries({ queryKey });
  };

type ChatLayoutProps = {
  conversations: Conversation[];
  currentUserKey: string;
  members: GroupPermissionReadOutView[];
  token: string;
  episodeKey: string;
  worldKey: string;
  chatStateScope: string;
};

export const ChatLayout: FC<ChatLayoutProps> = ({
  conversations,
  currentUserKey,
  members,
  token,
  episodeKey,
  worldKey,
  chatStateScope,
}) => {
  const queryClient = useQueryClient();
  const store = useStore();
  const activeRoom = useAtomValue(activeChatRoomAtom);
  const setActiveRoom = useSetAtom(setActiveChatRoomAtom);
  const syncChatStateScope = useSetAtom(syncChatStateScopeAtom);

  const episodeChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.EPISODE,
    scopeKey: episodeKey,
    pushCategory: PUSH_CATEGORY.CHAT,
  });

  const worldChannel = useChannel({
    scopeBoundary: SCOPE_BOUNDARY.WORLD,
    scopeKey: worldKey,
    pushCategory: PUSH_CATEGORY.CHAT,
  });

  const onChatPush = useMemo(
    () => onChatPushImpl(queryClient, store, currentUserKey),
    [queryClient, store, currentUserKey]
  );

  useChannelEffect({ token, channel: episodeChannel, callback: onChatPush });
  useChannelEffect({ token, channel: worldChannel, callback: onChatPush });

  useEffect(() => {
    syncChatStateScope(chatStateScope);
  }, [chatStateScope, syncChatStateScope]);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.room === activeRoom) ?? conversations[0],
    [conversations, activeRoom]
  );

  useEffect(() => {
    if (!active) return;
    if (active.room === activeRoom) return;
    setActiveRoom(active.room);
  }, [active, activeRoom, setActiveRoom]);

  if (!active) return null;

  return (
    <div className={styles.layout}>
      <ChatSidebar
        conversations={conversations}
        activeRoom={active.room}
        onSelect={setActiveRoom}
      />
      <Suspense fallback={<div style={{ flex: 1 }} />}>
        <ChatMessages
          conversation={active}
          currentUserKey={currentUserKey}
          members={members}
        />
      </Suspense>
    </div>
  );
};
