import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { UserSession, worldAdapter } from 'epicenter-libs';
import { Card } from '~/components/ui/card/card';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { regenerateSession } from '~/query/regenerate-session';
import { WorldQuery } from '~/query/world';
import { WorldReadOutView } from '~/types/world';
import styles from './index.module.scss';

export const PlayerHome = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episode })
  );

  const myAssignment = world?.assignments.find((a) => a.user.userKey === session.userKey);

  const handleRoleChange = (role: string) =>
    worldAdapter
      .selfAssign({
        role,
        episodeName: episode.name,
        objective: 'MAXIMUM',
      })
      .then((world) => world as unknown as WorldReadOutView)
      .then((newWorld) =>
        regenerateSession()
          .then((session) => session as UserSession)
          .then((newSession) => {
            queryClient.setQueryData(
              WorldQuery.bySessionPerEpisode({ session: newSession, episode }).queryKey,
              newWorld
            );
          })
      );

  const getRoleStatus = (role: string) => {
    const assignment = world.assignments.find((a) => a.role === role);
    if (!assignment) return { occupied: false, occupant: null, isMe: false };
    return {
      occupied: true,
      occupant: assignment.user.displayName,
      isMe: assignment.user.userKey === session.userKey,
    };
  };

  return (
    <section className={styles.root}>
      <Card>
        <h2>Select your role</h2>
        <fieldset className={styles.roleList}>
          {world.personae
            ?.filter((persona) => persona.role !== 'Waiting')
            .map((persona) => {
              const { occupied, occupant, isMe } = getRoleStatus(persona.role);
              const isDisabled = occupied && !isMe;
              const stateClass = isMe
                ? styles.mine
                : occupied
                  ? styles.occupied
                  : styles.available;

              return (
                <label key={persona.role} className={`${styles.roleCard} ${stateClass}`}>
                  <input
                    type="radio"
                    name="role"
                    value={persona.role}
                    checked={isMe}
                    disabled={isDisabled}
                    onChange={() => handleRoleChange(persona.role)}
                    className={styles.hiddenRadio}
                  />
                  <span className={styles.roleName}>{persona.role}</span>
                  {occupied && !isMe && (
                    <span className={styles.occupant}>{occupant}</span>
                  )}
                </label>
              );
            })}
        </fieldset>
        {myAssignment && myAssignment.role !== 'Waiting' && (
          <p className={styles.currentRole}>
            Your current role: <strong>{myAssignment.role}</strong>
            <button
              type="button"
              className={styles.clearRole}
              onClick={() => handleRoleChange('Waiting')}
              aria-label="Clear role assignment"
            >
              ✕
            </button>
          </p>
        )}
      </Card>
    </section>
  );
};
