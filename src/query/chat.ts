import { queryOptions } from '@tanstack/react-query';
import { GenericScope, ROLE, chatAdapter } from 'epicenter-libs';
import { ChatMessage } from '~/types/chat';

const byRoom = ({ room, scope }: { room: string; scope: GenericScope }) =>
  queryOptions({
    queryKey: ['chat', 'byRoom', room, scope],
    queryFn: async () => {
      const {
        values: [found],
      } = await chatAdapter.query({
        filter: [
          `room=${room}`,
          `scopeBoundary=${scope.scopeBoundary}`,
          `scopeKey=${scope.scopeKey}`,
        ],
      });
      if (found) return found;
      return chatAdapter.create(room, scope, {
        readLock: ROLE.PARTICIPANT,
        writeLock: ROLE.PARTICIPANT,
      });
    },
    staleTime: Infinity,
  });

const messages = ({ chatKey }: { chatKey: string }) =>
  queryOptions({
    queryKey: ['chat', 'messages', chatKey],
    queryFn: () => chatAdapter.getMessages(chatKey) as unknown as Promise<ChatMessage[]>,
  });

export const ChatQuery = {
  byRoom,
  messages,
};
