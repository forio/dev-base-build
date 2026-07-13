import { EpisodeReadOutView } from './episode';

export type BaseGroupChannelPush<C> = {
  date: string;
  address: {
    boundary: 'GROUP';
    category: 'GROUP';
    key: string;
  };
  content: C;
};

export type GroupChannelPush = BaseGroupChannelPush<{
  groupKey: string;
  objectType: 'episode';
  activity: 'create';
  episode: EpisodeReadOutView;
}>;
