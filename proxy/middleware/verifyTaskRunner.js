const { Router } = require('epicenter-libs');

/**
 * Verifies that the caller holds the account-level credential Epicenter's task runner
 * uses. The runner signs each fire with a platform-issued ACCOUNT session token
 * (HttpTaskPayloadHandler attaches
 * `Authorization: Bearer <AccountSession>`), so the check is: the token verifies,
 * the principal is account-typed (not a user session), and the account matches.
 * The verification response for an account session exposes only the account — no
 * project field — so the account match is the strongest check available here.
 * The token has no task-specific claim, so this proves platform account authority rather
 * than unique scheduler provenance. Keep every route behind this guard narrowly scoped;
 * never turn it into a general project-authority endpoint.
 *
 * Rejection status codes are chosen around one platform rule: any 4xx response to a
 * task fire PERMANENTLY cancels the calling task. That makes 401/403 intentionally loud:
 * if Epicenter's own runner can no longer authenticate or is no longer authorized, the
 * system-to-system contract is broken and the task must not look healthy. This route must
 * therefore remain protected and narrowly capable; callers must not be able to turn an
 * arbitrary account credential into general project authority.
 */
const verifyTaskRunner = (epicenter) => async (req, res, next) => {
  const authorization = req.headers['authorization'];
  if (typeof authorization !== 'string' || !authorization.trim()) {
    return res.status(401).json({ error: 'Unauthorized. Missing authorization.' });
  }

  try {
    const session = await new Router()
      .withAuthorization(authorization)
      .get('/verification')
      .then(({ body }) => body);

    const reject = (reason) => {
      epicenter.log('WARN', `task-runner verification rejected: ${reason}`);
      return res.status(403).json({ error: 'Forbidden. ' + reason });
    };

    if (session?.objectType !== 'account') return reject('Not an account session.');
    if (session?.accountShortName !== epicenter.proxyConfig().accountShortName) {
      return reject('Account mismatch.');
    }

    // Preserve the verified caller credential for the one downstream capability. The
    // account session already has author authority; minting another token adds latency
    // inside the shared HTTP client's five-second socket interval.
    req.taskAuthorization = authorization;
    return next();
  } catch (error) {
    epicenter.log('WARN', `task-runner verification failed: ${String(error?.message ?? error)}`);
    const status = error?.status;
    return res
      .status(status === 401 || status === 403 ? status : 503)
      .json({ error: 'Task-runner verification failed.' });
  }
};

module.exports = {
  verifyTaskRunner,
};
