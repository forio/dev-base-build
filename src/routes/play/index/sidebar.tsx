import { BarrierReadOutView } from '~/schemas/consensus';
import { Role } from '~/schemas/world';
import { BarrierStatus } from './barrier-status';
import styles from './sidebar.module.scss';
import { useCountdown } from './useCountdown';

type SidebarProps = {
  myRole: Role;
  description: string;
  decisionYear: number;
  step: number;
  barrier: BarrierReadOutView;
  barrierUpdatedAt: number;
  children: React.ReactNode;
};

export const Sidebar = ({
  myRole,
  description,
  decisionYear,
  step,
  barrier,
  barrierUpdatedAt,
  children: playOn,
}: SidebarProps) => {
  const countdown = useCountdown({
    name: barrier.name,
    duration: barrier.secondsLeft,
    startTime: barrierUpdatedAt,
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.roleCard}>
        <p className={styles.roleOverline}>You Are</p>
        <h1 className={styles.roleTitle}>{myRole}</h1>
        <p className={styles.roleDescription}>{description}</p>
        <div className={styles.badges}>
          <span className={styles.yearBadge}>Year {decisionYear}</span>
          <span className={styles.stepBadge}>Step {step}</span>
        </div>
      </div>

      <div className={styles.awaitingCard}>
        <p className={styles.awaitingHeader}>Awaiting Roles</p>
        <BarrierStatus barrier={barrier} myRole={myRole} />
        {countdown <= 0 &&
        Object.entries(barrier.arrivedRoles).some(
          ([role, arr]) => role !== myRole && !arr.length
        ) ? (
          playOn
        ) : countdown > 60 ? null : (
          <span
            style={{
              alignSelf: 'end',
              fontSize: '0.625rem',
              color: 'lightgray',
              fontFamily: 'monospace',
              marginTop: 'auto',
            }}
          >
            {countdown}
          </span>
        )}
      </div>
    </aside>
  );
};
