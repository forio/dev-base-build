import { Card } from '~/components/ui/card/card';
import styles from './index.module.scss';

export const PlayerHome = () => (
  <div className={styles.root}>
    <Card>
      <p>This example has no participant view. Log in as a facilitator.</p>
    </Card>
  </div>
);
