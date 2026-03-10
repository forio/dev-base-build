import { RunReadOutView } from './run';

export type ChatChannelPush = {
  date: string;
  type: 'BROADCAST' | 'TARGETED';
  address: {
    boundary: 'EPISODE' | 'WORLD';
    category: 'CHAT';
    key: string;
  };
  sender: {
    type: string;
    key: string;
  };
  content: {
    chatKey: string;
    room: string;
    objectType: 'broadcast' | 'targeted';
    chatMessage: {
      senderKey: string;
      created: number;
      id: number;
      message: string;
      receiverKey?: string;
    };
  };
};

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
