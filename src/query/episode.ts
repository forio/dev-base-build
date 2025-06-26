import { queryOptions } from '@tanstack/react-query';
import { UserSession, episodeAdapter } from 'epicenter-libs';
import { EpisodeReadOutView } from '~/types/episode';

const current = ({ session }: { session: UserSession }) =>
  queryOptions({
    queryKey: ['episode', 'current', session.groupName, session.groupRole],
    queryFn: async () => {
      const [current] = await episodeAdapter
        .query({
          sort: ['-episode.created'],
          max: 1,
        })
        .then((response) => response.values as Array<EpisodeReadOutView>);
      if (current) return current;
      if (session.groupRole === 'FACILITATOR') {
        const episodeName = 'ep'.concat(Date.now().toString());
        return episodeAdapter
          .create(episodeName, session.groupName!)
          .then((episode) => episode as unknown as EpisodeReadOutView);
      }
      throw new Error('No episode found');
    },
    staleTime: Infinity,
    enabled: Boolean(session.groupName),
  });

const push = (groupName: string) =>
  episodeAdapter
    .create('ep'.concat(Date.now().toString()), groupName)
    .then((episode) => episode as unknown as EpisodeReadOutView);

export const EpisodeQuery = {
  current,
  push,
};
