import { FC, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { cn } from '~/components/ui/cn';
import { Lang } from '../../lang';
import { chatRoomUnreadAtomFamily } from './chat-state';
import { Conversation } from './types';
import styles from './chat-sidebar.module.scss';

type ChatSidebarProps = {
  conversations: Conversation[];
  activeRoom: string;
  onSelect: (room: string) => void;
  onlineUserKeys: Set<string>;
};

type ConversationButtonProps = {
  conversation: Conversation;
  activeRoom: string;
  onSelect: (room: string) => void;
  onlineUserKeys: Set<string>;
};

const ConversationButton: FC<ConversationButtonProps> = ({
  conversation,
  activeRoom,
  onSelect,
  onlineUserKeys,
}) => {
  const unread = useAtomValue(chatRoomUnreadAtomFamily(conversation.room));
  const active = conversation.room === activeRoom;
  const peerOnline = conversation.kind !== 'dm' || onlineUserKeys.has(conversation.peerKey);

  return (
    <button
      className={cn(styles.channel, active && styles.active)}
      onClick={() => onSelect(conversation.room)}
    >
      <span className={styles.labelGroup}>
        {conversation.kind !== 'dm' && <span className={styles.hash}>#</span>}
        <span className={styles.labelStack}>
          <span className={styles.label}>{conversation.label}</span>
          {conversation.kind === 'dm' && (
            <span
              className={cn(
                styles.status,
                peerOnline ? styles.online : styles.offline
              )}
            >
              <span className={styles.statusDot} aria-hidden />
              <Lang kp="chat">{peerOnline ? 'online' : 'offline'}</Lang>
            </span>
          )}
        </span>
      </span>
      {unread && <span className={styles.unreadDot} aria-hidden />}
    </button>
  );
};

export const ChatSidebar: FC<ChatSidebarProps> = ({
  conversations,
  activeRoom,
  onSelect,
  onlineUserKeys,
}) => {
  const channels = useMemo(() => conversations.filter((c) => c.kind !== 'dm'), [conversations]);
  const dms = useMemo(() => conversations.filter((c) => c.kind === 'dm'), [conversations]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionHeader}>
        <Lang kp="chat">channels</Lang>
      </div>
      {channels.map((c) => (
        <ConversationButton
          key={c.room}
          conversation={c}
          activeRoom={activeRoom}
          onSelect={onSelect}
          onlineUserKeys={onlineUserKeys}
        />
      ))}
      {dms.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <Lang kp="chat">direct_messages</Lang>
          </div>
          {dms.map((c) => (
            <ConversationButton
              key={c.room}
              conversation={c}
              activeRoom={activeRoom}
              onSelect={onSelect}
              onlineUserKeys={onlineUserKeys}
            />
          ))}
        </>
      )}
    </aside>
  );
};
