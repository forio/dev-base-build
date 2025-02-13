import { PseudonymReadOutView } from './types.user';

export type PresenceReadOutView = {
  lastUpdated?: string;
  ttlSeconds?: number;
  user: PseudonymReadOutView;
  groupRole: 'facilitator' | 'reviewer' | 'leader' | 'participant';
};
