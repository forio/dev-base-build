import { queryOptions } from '@tanstack/react-query';
import { UserSession, episodeAdapter } from 'epicenter-libs';
import { EpisodeReadOutView } from '~/types/types.episode';

const currentEpisode = (session: UserSession) => {
  const { groupName, groupRole } = session;
  return queryOptions({
    queryKey: [groupName, 'current-episode'],
    enabled: Boolean(groupName),
    staleTime: Infinity,
    queryFn: async (): Promise<EpisodeReadOutView | null> => {
      const searchOptions = {
        sort: ['-episode.created'],
        max: 1,
      };
      const {
        values: [current],
      } = await episodeAdapter.query(searchOptions);
      if (current) return current as EpisodeReadOutView;
      if (groupRole === 'FACILITATOR') {
        const episodeName = `episode-${Date.now().toString()}`;
        return episodeAdapter.create(
          episodeName,
          groupName!
        ) as Promise<EpisodeReadOutView>;
      }
      return null;
    },
  });
};

export const EpisodeQuery = {
  currentEpisode,
};
