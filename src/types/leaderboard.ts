import { PseudonymReadOutView } from './user';

export type LeaderboardScore = {
  name: string;
  quantity: number;
};

export type LeaderboardTag = {
  label: string;
  content: string;
};

type RawLeaderboardTag = {
  label?: string;
  content?: string;
  value?: string;
};

type LeaderboardScope = {
  scopeBoundary?: string;
  scopeKey?: string;
  user?: PseudonymReadOutView;
};

export type LeaderboardReadOutView = {
  leaderboardKey?: string;
  collection?: string;
  lastUpdated?: string | Date;
  scope?: LeaderboardScope;
  scores?: LeaderboardScore[];
  tags?: RawLeaderboardTag[];
};

export type LeaderboardRow = {
  leaderboardKey: string;
  collection: string;
  lastUpdated: string;
  scope: LeaderboardScope;
  scores: LeaderboardScore[];
  tags: LeaderboardTag[];
  user?: PseudonymReadOutView;
  attempts: number | null;
  rank: number;
  runKey?: string;
};
