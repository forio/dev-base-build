import { useAtomValue } from 'jotai';
import { FC, Fragment, PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { sessionAtom } from '~/query/auth';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';

const Guard: FC<PropsWithChildren> = ({ children }) => {
  const session = useAtomValue(sessionAtom);

  if (!session)
    throw new Error('Reached facilitator page without user session');
  const { groupRole } = session;

  if (groupRole === 'PARTICIPANT') return <Navigate to="/" />;
  return children;
};

const routes = [{
  path: '/logout',
  title: 'logout',
  className: 'logout',
}];

const Impl = () => {
  /**
   * work that persists across all facilitator pages
   */
  return (
    <Fragment>
      <Header routes={routes} />
      <Outlet />
      <Footer />
    </Fragment>
  );
};

export const Facilitator = () => (
  <Guard>
    <Impl />
  </Guard>
);