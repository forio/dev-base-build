import { RunReadOutView } from './run';
import { LeaderboardScore, LeaderboardTag } from './leaderboard';

export type GroupChannelPush<C> = {
  date: string;
  address: {
    boundary: 'GROUP';
    category: 'GROUP';
    key: string;
  };
} & C;

export type BaseWorldRunChannelPush<
  State,
  Meta,
  Run = {
    ignition: 'created';
    run: RunReadOutView;
  },
> = {
  date: string;
  address: {
    boundary: 'WORLD';
    category: 'RUN';
    key: string;
  };
} & {
  content: { runKey: string } & (
    | ({ objectType: 'state' } & State)
    | ({ objectType: 'meta' } & Meta)
    | ({ objectType: 'run' } & Run)
  );
};

export type EpisodeLeaderboardPush = {
  date: string;
  address: {
    boundary: 'EPISODE';
    category: 'LEADERBOARD';
    key: string;
  };
  type: 'UPDATED';
  content: {
    leaderboardKey: string;
    leaderboardScores: LeaderboardScore[];
    leaderboardTags: LeaderboardTag[];
  };
};
