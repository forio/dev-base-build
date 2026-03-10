import { FC, useMemo } from 'react';
import { cn } from '~/components/ui/cn';
import { Lang } from '../../lang';
import { Conversation } from './types';
import styles from './chat-sidebar.module.scss';

type ChatSidebarProps = {
  conversations: Conversation[];
  active: Conversation;
  onSelect: (c: Conversation) => void;
};

export const ChatSidebar: FC<ChatSidebarProps> = ({ conversations, active, onSelect }) => {
  const channels = useMemo(() => conversations.filter((c) => c.kind !== 'dm'), [conversations]);
  const dms = useMemo(() => conversations.filter((c) => c.kind === 'dm'), [conversations]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionHeader}>
        <Lang kp="chat">channels</Lang>
      </div>
      {channels.map((c) => (
        <button
          key={c.room}
          className={cn(styles.channel, c.room === active.room && styles.active)}
          onClick={() => onSelect(c)}
        >
          <span className={styles.hash}>#</span>
          {c.label}
        </button>
      ))}
      {dms.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <Lang kp="chat">direct_messages</Lang>
          </div>
          {dms.map((c) => (
            <button
              key={c.room}
              className={cn(styles.channel, c.room === active.room && styles.active)}
              onClick={() => onSelect(c)}
            >
              {c.label}
            </button>
          ))}
        </>
      )}
    </aside>
  );
};
