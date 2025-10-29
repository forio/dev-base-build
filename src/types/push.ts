export type GroupChannelPush<C> = {
  date: string;
  address: {
    boundary: 'GROUP';
    category: 'GROUP';
    key: string;
  };
} & C;
