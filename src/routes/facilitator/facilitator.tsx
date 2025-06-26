import { FC, PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router';
import { ErrorRoot } from '~/components/error/error';
import { Footer } from '~/components/footer/footer';
import { Header } from '~/components/header/header';
import { useGuardedSession } from '~/query/auth';
import styles from './facilitator.module.scss';

const ErrorShell: FC<PropsWithChildren> = ({ children }) => (
  <div className={styles.errorShell}>
    <Header />
    <div className={styles.contentWrapper}>
      <div className={styles.innerContent}>{children}</div>
    </div>
    <Footer />
  </div>
);

const Guard: FC<PropsWithChildren> = ({ children }) => {
  const session = useGuardedSession();
  if (session.groupRole === 'PARTICIPANT') return <Navigate to="/" />;
  return children;
};

const Impl = () => {
  /**
   * work that persists across all facilitator pages
   */
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export const FacilitatorShell = () => (
  <Guard>
    <Impl />
  </Guard>
);

FacilitatorShell.errorElement = () => (
  <ErrorShell>
    <ErrorRoot.Match />
  </ErrorShell>
);
