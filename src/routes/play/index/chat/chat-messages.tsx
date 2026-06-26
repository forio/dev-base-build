import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { chatAdapter } from 'epicenter-libs';
import { useSetAtom } from 'jotai';
import { FC, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { cn } from '~/components/ui/cn';
import { ChatQuery } from '~/query/chat';
import { GroupPermissionReadOutView } from '~/types/group';
import { Lang } from '../../lang';
import { clearChatRoomUnreadAtom } from './chat-state';
import { Conversation } from './types';
import styles from './chat-messages.module.scss';

type ChatMessagesProps = {
  conversation: Conversation;
  currentUserKey: string;
  members: GroupPermissionReadOutView[];
  onlineUserKeys: Set<string>;
};

const formatRelativeTime = (created: number) => {
  const diff = Date.now() - created;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const ChatMessages: FC<ChatMessagesProps> = ({
  conversation,
  currentUserKey,
  members,
  onlineUserKeys,
}) => {
  const queryClient = useQueryClient();
  const clearChatRoomUnread = useSetAtom(clearChatRoomUnreadAtom);
  const { t } = useTranslation('play', { keyPrefix: 'chat' });
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const peerOnline = conversation.kind !== 'dm' || onlineUserKeys.has(conversation.peerKey);

  const { data: chat } = useSuspenseQuery(
    ChatQuery.byRoom({ room: conversation.room, scope: conversation.scope })
  );

  const { data: rawMessages } = useQuery({
    ...ChatQuery.messages({ chatKey: chat.chatKey }),
    enabled: !!chat.chatKey,
  });

  const messages = useMemo(
    () => [...(rawMessages ?? [])].reverse(),
    [rawMessages]
  );

  const displayNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const name = m.user.displayName ?? m.user.detail?.handle ?? m.user.userKey;
      map.set(m.user.userKey, name);
    }
    return map;
  }, [members]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    clearChatRoomUnread(conversation.room);
  }, [conversation.room, clearChatRoomUnread]);

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      chatAdapter.sendMessage(
        chat.chatKey,
        message,
        conversation.kind === 'dm' ? { userKey: conversation.peerKey } : {}
      ),
    onMutate: async (message) => {
      await queryClient.cancelQueries(ChatQuery.messages({ chatKey: chat.chatKey }));
      const prev = queryClient.getQueryData(ChatQuery.messages({ chatKey: chat.chatKey }).queryKey);
      queryClient.setQueryData(
        ChatQuery.messages({ chatKey: chat.chatKey }).queryKey,
        (old: typeof prev) => [
          {
            id: -Date.now(),
            senderKey: currentUserKey,
            receiverKey: conversation.kind === 'dm' ? conversation.peerKey : null,
            message,
            created: Date.now(),
          },
          ...(old ?? []),
        ]
      );
      return { prev };
    },
    onError: (_err, _msg, context) => {
      if (context?.prev) {
        queryClient.setQueryData(
          ChatQuery.messages({ chatKey: chat.chatKey }).queryKey,
          context.prev
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(ChatQuery.messages({ chatKey: chat.chatKey }));
    },
  });
  const canSend = peerOnline && !sendMutation.isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!peerOnline) return;
    setText('');
    sendMutation.mutate(trimmed);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        {conversation.kind !== 'dm' && <span className={styles.headerHash}>#</span>}
        {conversation.label}
        {conversation.kind === 'dm' && (
          <span
            className={cn(
              styles.headerStatus,
              peerOnline ? styles.online : styles.offline
            )}
          >
            <span className={styles.headerStatusDot} aria-hidden />
            <Lang kp="chat">{peerOnline ? 'online' : 'offline'}</Lang>
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className={styles.empty}>
          <Lang kp="chat">no_messages</Lang>
        </div>
      ) : (
        <div className={styles.messageList} ref={listRef}>
          {messages.map((msg) => {
            const own = msg.senderKey === currentUserKey;
            return (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${own ? styles.own : styles.peer}`}
              >
                <div className={styles.meta}>
                  <span>{displayNames.get(msg.senderKey) ?? msg.senderKey}</span>
                  <span>{formatRelativeTime(msg.created)}</span>
                </div>
                <div className={`${styles.bubble} ${own ? styles.ownBubble : styles.peerBubble}`}>
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={peerOnline ? t('type_message') : t('offline_message_disabled')}
          disabled={!peerOnline}
        />
        <Button type="submit" disabled={!text.trim() || !canSend}>
          <Lang kp="chat">send</Lang>
        </Button>
      </form>
    </div>
  );
};
