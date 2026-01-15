import { Metadata } from '~/query/run';
import { EpisodeReadOutView } from './episode';
import { RunReadOutView } from './run';
import { WorldReadOutView } from './world';

export type GroupChannelPush<
  Episode = {
    activity: 'create';
    episode: EpisodeReadOutView;
  },
  Assignment = {
    worlds: WorldReadOutView[];
  },
> = {
  date: string;
  address: {
    boundary: 'GROUP';
    category: 'GROUP';
    key: string;
  };
} & (
  | {
      type: 'EPISODE';
      content: { groupKey: string; objectType: 'episode' } & Episode;
    }
  | {
      type: 'ASSIGNMENT';
      content: { groupKey: string; objectType: 'assignment' } & Assignment;
    }
);

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
    actions:
      | [
          {
            objectType: 'set';
            name: `Price[0,${number}]`;
            value: number;
          },
        ]
      | [
          {
            objectType: 'execute';
            name: 'step';
            arguments: [];
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

export type WorldChannelPush = {
  date: string;
  address: {
    boundary: 'WORLD';
    category: 'WORLD';
    key: string;
  };
  content: {
    type: 'world';
    subType: 'assignchange';
    data: Record<string, unknown>;
  };
};
