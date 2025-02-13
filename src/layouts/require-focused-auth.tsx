import { useAtomValue } from 'jotai';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { sessionAtom } from '~/query/auth';

export const RequireFocusedAuth = () => {
  const location = useLocation();
  const session = useAtomValue(sessionAtom);

  if (!session?.groupKey)
    return <Navigate to="/login" state={{ from: location }} />;

  return <Outlet />;
};