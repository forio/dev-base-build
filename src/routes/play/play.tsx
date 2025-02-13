import { useAtomValue } from 'jotai';
import { FC, PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { sessionAtom } from '~/query/auth';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';

const Guard: FC<PropsWithChildren> = ({ children }) => {
  const session = useAtomValue(sessionAtom);

  if (!session)
    throw new Error('Reached play page without user session');

  const { groupRole } = session;

  if (groupRole === 'FACILITATOR') return <Navigate to="/facilitator" />;
  return children;
};

const routes = [{
  path: '/logout',
  title: 'logout',
  className: 'logout',
}];

const Impl = () => {
  return (
    <div>
      <Header routes={routes} />
      <div>
        <main>
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export const Play = () => {
  return (
    <Guard>
      <Impl />
    </Guard>
  );
};