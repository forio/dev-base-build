import { cn } from '~/components/ui/cn';
import { BarrierReadOutView } from '~/schemas/consensus';
import { Role, ROLES } from '~/schemas/world';
import styles from './index.module.scss';

const hasArrived = (barrier: BarrierReadOutView, role: Role) =>
  (barrier.arrivedRoles?.[role]?.length ?? 0) > 0;

export const BarrierStatus = ({
  barrier,
  myRole,
}: {
  barrier: BarrierReadOutView;
  myRole: Role;
}) => {
  return (
    <div className={styles.roleStatusList}>
      {ROLES.map((role) => {
        const arrived = hasArrived(barrier, role);
        return (
          <div
            key={role}
            className={cn(styles.roleStatusItem, role === myRole && styles.roleStatusYou)}
          >
            <span
              className={cn(
                styles.statusDot,
                arrived ? styles.dotArrived : styles.dotPending
              )}
            />
            <span className={styles.roleStatusLabel}>{role}</span>
            <span className={styles.roleStatusText}>
              {arrived ? 'Submitted' : 'Waiting'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
