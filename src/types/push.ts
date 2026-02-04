import { Metadata } from '~/query/run';
import { EpisodeReadOutView } from './episode';
import { RunReadOutView } from './run';

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

export type WorldRunChannelPush = BaseWorldRunChannelPush<
  {
    actions: [
      {
        objectType: 'execute';
        name: 'step';
        arguments: Array<unknown>;
      },
    ];
  },
  { result: Metadata },
  {
    ignition: 'created';
    run: Omit<RunReadOutView, 'executionContext'> & {
      executionContext: {
        version: 'V1';
        presets: { creator: string };
      };
    };
  }
>;
