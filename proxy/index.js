const express = require('express');
const cors = require('cors');
const epicenterLibs = require('epicenter-libs');
const { Fault, SCOPE_BOUNDARY, config, vaultAdapter } = epicenterLibs;
const { verifyTaskRunner } = require('./middleware/verifyTaskRunner');

const app = express();

app.use(
  cors({
    origin: /https?:\/\/localhost:8888/,
  })
);

app.use(express.json());

try {
  const proxyConfig = epicenter.proxyConfig();
  config.setContext({
    apiProtocol: proxyConfig.apiScheme.toLowerCase(),
    apiHost: proxyConfig.apiHost,
    accountShortName: proxyConfig.accountShortName,
    projectShortName: proxyConfig.projectShortName,
  });
} catch (e) {
  // No injected epicenter === local dev
  if (e instanceof ReferenceError) {
    const envJson = require('./env.json');
    const env = Object.assign({}, envJson, process.env);

    config.setContext({
      apiProtocol: 'https',
      apiHost: env.API_HOST,
      accountShortName: env.ACCOUNT_SHORT_NAME,
      projectShortName: env.PROJECT_SHORT_NAME,
    });
    epicenter = {
      proxyConfig: () => ({
        externalPort: 80,
        apiHost: config.apiHost,
        accountShortName: config.accountShortName,
        projectShortName: config.projectShortName,
      }),
      log: console.log,
    };
    /**
     * The epicenter-libs on client are configured to route proxy requests to
     * `/proxy/${accountShortName}/${projectShortName}`. From the perspective of the production
     * proxy server, this is where the root path starts, which means the string
     * `/proxy/${accountShortName}/${projectShortName}` isn't part of any wildcard route matches.
     *
     * On the local server, whose root path actually is '/', we remove this prefix from the request url
     * so that wildcards match the same paths as in production.
     *
     * For general sim development, use the production proxy server. Use a local server only when the
     * proxy itself is the focus of development.
     */
    app.use((req, res, next) => {
      const proxyPrefix = new RegExp(
        `^/proxy/${config.accountShortName}/${config.projectShortName}`
      );
      req.url = req.url.replace(proxyPrefix, '');
      next();
    });
  }
}

app.get('/', (req, res) => res.send('Server is running :)'));

/**
 * The group vault the scheduled task writes into. Deliberately fixed-size — a count and
 * a timestamp, atomically updated on every fire. A scheduled task that appends to an ever-growing
 * collection is an anti-pattern: nothing ever prunes it, and every consumer pays for the
 * whole history to answer "is it still running?". Store the current state; if history
 * matters, the platform already keeps it (task successes/failures and run history).
 */
const TICK_VAULT = 'task-tick';

const recordTick = async (req, res) => {
  const scopeKey = req.body?.scopeKey;
  if (!scopeKey) return res.status(400).json({ message: 'scopeKey required.' });

  const scope = { scopeBoundary: SCOPE_BOUNDARY.GROUP, scopeKey };
  const authorization = req.taskAuthorization;

  try {
    const vault = await vaultAdapter.define(TICK_VAULT, scope, {
      items: {
        set: { lastTickAt: new Date().toISOString() },
        inc: { tickCount: 1 },
      },
      readLock: 'PARTICIPANT',
      writeLock: 'FACILITATOR',
      mutationStrategy: 'ALLOW',
      authorization,
    });

    return res.status(200).json({ tickCount: vault?.items?.tickCount });
  } catch (error) {
    if (error instanceof Fault) {
      /**
       * The status returned here is task control flow: any 4xx permanently cancels
       * the calling task, while a 5xx lets it keep firing on schedule. Faults pass
       * through by default — add a case to translate a 4xx that is genuinely
       * recoverable for this operation into a 5xx.
       */
      const { status, message, information } = error;
      switch (status) {
        /**
         * case 404:
         *   return res.status(503).json({ message, information });
         */
        default:
          return res.status(status ?? 500).json({ message, information });
      }
    }
    return res
      .status(500)
      .json({ error: 'Internal Server Error', message: String(error) });
  }
};

/**
 * The target of the recurring task the facilitator client schedules (see
 * `src/query/task.ts` — the payload's `target: 'PROXY'` routes the fire to this proxy).
 * The caller is Epicenter's task runner, which signs each fire with a platform-issued
 * ACCOUNT session token; `verifyTaskRunner` verifies that token and requires the
 * account-typed principal for this account before any privileged work happens.
 */
app.post('/tick', verifyTaskRunner(epicenter), recordTick);

function main() {
  const port = epicenter.proxyConfig().externalPort;
  app.listen(port, () => epicenter.log('INFO', `Listening on port ${port}`));
}

main();
