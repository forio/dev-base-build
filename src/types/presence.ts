import { PseudonymReadOutView } from './user';

export type PresenceReadOutView = {
  lastUpdated?: number;
  ttlSeconds?: number;
  user: PseudonymReadOutView;
  groupRole: 'FACILITATOR' | 'REVIEWER' | 'LEADER' | 'PARTICIPANT';
};
