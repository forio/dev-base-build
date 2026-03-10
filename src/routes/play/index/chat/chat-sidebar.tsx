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
};

type ConversationButtonProps = {
  conversation: Conversation;
  activeRoom: string;
  onSelect: (room: string) => void;
};

const ConversationButton: FC<ConversationButtonProps> = ({
  conversation,
  activeRoom,
  onSelect,
}) => {
  const unread = useAtomValue(chatRoomUnreadAtomFamily(conversation.room));
  const active = conversation.room === activeRoom;

  return (
    <button
      className={cn(styles.channel, active && styles.active)}
      onClick={() => onSelect(conversation.room)}
    >
      <span className={styles.labelGroup}>
        {conversation.kind !== 'dm' && <span className={styles.hash}>#</span>}
        <span className={styles.label}>{conversation.label}</span>
      </span>
      {unread && <span className={styles.unreadDot} aria-hidden />}
    </button>
  );
};

export const ChatSidebar: FC<ChatSidebarProps> = ({ conversations, activeRoom, onSelect }) => {
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
            />
          ))}
        </>
      )}
    </aside>
  );
};
