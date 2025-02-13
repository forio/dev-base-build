import { Fault, errorManager } from 'epicenter-libs';
import { Fragment, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Modal } from '~/components/react-aria-components/modal';
import { useLogout, useRegenerateSession } from '~/query/auth';

const shouldAttemptRegenerate = (() => {
  const status = 401;
  const codes = ['AUTHENTICATION_EXPIRED', 'AUTHENTICATION_INVALIDATED'];
  return (error: Fault) =>
    Boolean(
      error.status === status && error.code && codes.includes(error.code)
    );
})();

export const TryRegenerate = () => {
  const [awaitUserLogout, setAwaitUserLogout] = useState(false);
  const { mutateAsync: regenerate } = useRegenerateSession();
  const { mutateAsync: logout } = useLogout();

  useEffect(() => {
    const { unregister } = errorManager.registerHandler(
      shouldAttemptRegenerate,
      async (error, retry) => {
        if (awaitUserLogout) throw error;
        return regenerate()
          .catch((error) => {
            setAwaitUserLogout(true);
            throw error;
          })
          .then(retry);
      }
    );
    return unregister;
  }, [awaitUserLogout, regenerate]);

  return (
    <Fragment>
      <Outlet />
      <Modal isOpen={awaitUserLogout} isDismissable={false}>
        <div>
          <p>
            Your session has expired and could not be automatically renewed.
            Please return to the login page to log in again.
          </p>
          <button className="" onClick={() => logout()}>
            Back to login
          </button>
        </div>
      </Modal>
    </Fragment>
  );
};