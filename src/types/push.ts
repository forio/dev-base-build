import { Metadata } from '~/query/run';
import { RunReadOutView } from './run';

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
