import { GenericScope } from 'epicenter-libs';

type ChannelConversation = {
  kind: 'episode' | 'world';
  room: string;
  scope: GenericScope;
  label: string;
};

type DmConversation = {
  kind: 'dm';
  room: string;
  scope: GenericScope;
  label: string;
  peerKey: string;
};

export type Conversation = ChannelConversation | DmConversation;

export const dmRoom = (a: string, b: string): string =>
  `dm:${[a, b].sort().join(':')}`;
