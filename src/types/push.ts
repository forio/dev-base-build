import { EpisodeReadOutView } from './episode';
import { RunReadOutView } from './run';
import { WorldReadOutView } from './world';

export type BaseGroupChannelPush<C> = {
  date: string;
  address: {
    boundary: 'GROUP';
    category: 'GROUP';
    key: string;
  };
  content: C;
};

export type GroupChannelPush = BaseGroupChannelPush<
  | {
      groupKey: string;
      objectType: 'episode';
      activity: 'create';
      episode: EpisodeReadOutView;
    }
  | {
      groupKey: string;
      objectType: 'assignment';
      worlds?: Array<WorldReadOutView>;
    }
>;

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
