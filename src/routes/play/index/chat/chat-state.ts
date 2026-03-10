import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

export const chatStateScopeAtom = atom('');

export const activeChatRoomAtom = atom<string | null>(null);

export const unreadRoomsAtom = atom<Set<string>>(new Set<string>());

export const syncChatStateScopeAtom = atom(null, (get, set, scope: string) => {
  if (get(chatStateScopeAtom) === scope) return;

  set(chatStateScopeAtom, scope);
  set(activeChatRoomAtom, null);
  set(unreadRoomsAtom, new Set());
});

export const setActiveChatRoomAtom = atom(null, (get, set, room: string) => {
  set(activeChatRoomAtom, room);

  const unreadRooms = get(unreadRoomsAtom);
  if (!unreadRooms.has(room)) return;

  const nextUnreadRooms = new Set(unreadRooms);
  nextUnreadRooms.delete(room);
  set(unreadRoomsAtom, nextUnreadRooms);
});

export const clearChatRoomUnreadAtom = atom(null, (get, set, room: string) => {
  const unreadRooms = get(unreadRoomsAtom);
  if (!unreadRooms.has(room)) return;

  const nextUnreadRooms = new Set(unreadRooms);
  nextUnreadRooms.delete(room);
  set(unreadRoomsAtom, nextUnreadRooms);
});

export const markChatRoomUnreadAtom = atom(null, (get, set, room: string) => {
  if (get(activeChatRoomAtom) === room) return;

  const unreadRooms = get(unreadRoomsAtom);
  if (unreadRooms.has(room)) return;

  const nextUnreadRooms = new Set(unreadRooms);
  nextUnreadRooms.add(room);
  set(unreadRoomsAtom, nextUnreadRooms);
});

export const chatRoomUnreadAtomFamily = atomFamily((room: string) =>
  atom((get) => get(unreadRoomsAtom).has(room))
);
