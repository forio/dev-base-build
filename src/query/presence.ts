import { queryOptions } from '@tanstack/react-query';
import { presenceAdapter } from 'epicenter-libs';
import { PresenceReadOutView } from '~/types/presence';

const group = ({ groupKey }: { groupKey: string }) =>
  queryOptions({
    queryKey: ['presence', 'group', groupKey],
    queryFn: () =>
      presenceAdapter
        .forGroup(groupKey)
        .then((response) => response as unknown as PresenceReadOutView[]),
  });

export const PresenceQuery = {
  group,
};
