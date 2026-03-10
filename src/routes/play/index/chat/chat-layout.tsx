import { FC, Suspense, useState } from 'react';
import { GroupPermissionReadOutView } from '~/types/group';
import { ChatMessages } from './chat-messages';
import { ChatSidebar } from './chat-sidebar';
import { Conversation } from './types';
import styles from './chat-layout.module.scss';

type ChatLayoutProps = {
  conversations: Conversation[];
  currentUserKey: string;
  members: GroupPermissionReadOutView[];
};

export const ChatLayout: FC<ChatLayoutProps> = ({
  conversations,
  currentUserKey,
  members,
}) => {
  const [active, setActive] = useState<Conversation>(conversations[0]);

  return (
    <div className={styles.layout}>
      <ChatSidebar
        conversations={conversations}
        active={active}
        onSelect={setActive}
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
