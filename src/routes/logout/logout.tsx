import "./logout.scss";
import { useEffect } from 'react';
import { Lang } from '~/components/lang';
import { useLogout } from '~/query/auth';

export const Logout = () => {
  const { mutate: logout } = useLogout();
  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div id="logout">
      <Lang>logging_out</Lang>
    </div>
  );
};