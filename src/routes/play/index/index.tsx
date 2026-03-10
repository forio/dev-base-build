import { useSuspenseQuery } from '@tanstack/react-query';
import { SCOPE_BOUNDARY } from 'epicenter-libs';
import { useMemo } from 'react';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { GroupQuery } from '~/query/group';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import { ChatLayout } from './chat/chat-layout';
import { Conversation, dmRoom } from './chat/types';

export const PlayerHome = () => {
  const session = useGuardedSession();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episode })
  );
  const { data: run } = useSuspenseQuery(RunQuery.byWorld({ worldKey: world.worldKey }));
  const { data: members = [] } = useSuspenseQuery(GroupQuery.members({ session }));

  const participants = useMemo(
    () => members.filter((member) => member.role?.toLowerCase() === 'participant'),
    [members]
  );

  const conversations = useMemo(() => {
    const list: Conversation[] = [
      {
        kind: 'episode',
        room: 'episode-chat',
        scope: { scopeBoundary: SCOPE_BOUNDARY.EPISODE, scopeKey: episode.episodeKey },
        label: 'Episode Chat',
      },
    ];
    if (world) {
      list.push({
        kind: 'world',
        room: 'world-chat',
        scope: { scopeBoundary: SCOPE_BOUNDARY.WORLD, scopeKey: world.worldKey },
        label: 'World Chat',
      });
      if (run) {
        list.push({
          kind: 'world',
          room: run.runKey,
          scope: { scopeBoundary: SCOPE_BOUNDARY.WORLD, scopeKey: world.worldKey },
          label: 'Run Chat',
        });
      }
    }
    for (const p of participants) {
      if (p.user.userKey === session.userKey) continue;
      list.push({
        kind: 'dm',
        room: dmRoom(session.userKey, p.user.userKey),
        scope: { scopeBoundary: SCOPE_BOUNDARY.EPISODE, scopeKey: episode.episodeKey },
        label: p.user.displayName ?? p.user.detail?.handle ?? p.user.userKey,
        peerKey: p.user.userKey,
      });
    }
    return list;
  }, [episode.episodeKey, world, run, participants, session.userKey]);

  return (
    <ChatLayout
      conversations={conversations}
      currentUserKey={session.userKey}
      members={participants}
    />
  );
};
