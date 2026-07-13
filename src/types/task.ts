export type TaskStatus =
  | 'initialized'
  | 'triggered'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'terminated';

export type TaskReadOutView = {
  taskKey: string;
  name: string;
  status: TaskStatus;
  cron: string;
  successes: number;
  failures: number;
  failSafeTermination?: string;
  payload: {
    objectType: 'http';
    method: string;
    url: string;
    target?: 'APPLICATION' | 'PROXY';
  };
};

/** The entire contents of the tick vault — current state, not a history. */
export type TickState = {
  tickCount: number;
  lastTickAt?: string;
};
