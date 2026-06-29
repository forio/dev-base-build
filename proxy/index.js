const express = require('express');
const cors = require('cors');
const epicenterLibs = require('epicenter-libs');
const { Fault, config, runAdapter } = epicenterLibs;
const { verify, requireEpisodeWorldAccess } = require('./middleware/verify');
const { empowerWithProjectToken } = require('./middleware/empowerWithProjectToken');

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
        apiSharedSecret: env.API_SHARED_SECRET,
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

const privateEnv = () => {
  try {
    return require('./env.json');
  } catch (_error) {
    return process.env;
  }
};

const completion = async (req, res) => {
  const { prompt } = req.body;
  const env = privateEnv();
  const hasOpenAIKey = Boolean(env.OPENAI_API_KEY);

  return res.status(200).json({
    data: prompt,
    hasOpenAIKey,
  });
};

/**
 * The variables from a team's world run that same-episode peers may read.
 * Widening the carveout is a deliberate, reviewable edit to this one array;
 * `private_note` is absent here by construction.
 */
const PUBLIC_WORLD_VARIABLES = ['signal', 'pitch'];

const readPublicWorldVariables = async (req, res) => {
  const { world } = req;
  const { variableNames } = req.params;

  try {
    const requestedVariables = variableNames.split(';').filter(Boolean);

    if (!requestedVariables.length) {
      return res.status(400).json({ error: 'No public variables requested.' });
    }

    if (
      requestedVariables.some(
        (variableName) => !PUBLIC_WORLD_VARIABLES.includes(variableName)
      )
    ) {
      return res.status(404).json({ error: 'Public variable not found.' });
    }

    if (!world.runKey) {
      return res.status(404).json({ error: 'World has no associated run.' });
    }

    const variables = await runAdapter.getVariables(world.runKey, requestedVariables, {
      authorization: req.projectAuthorization,
    });

    return res.status(200).json(variables);
  } catch (error) {
    if (error instanceof Fault) {
      const { status, message, information } = error;
      return res.status(status ?? 500).json({ message, information });
    }
    return res
      .status(500)
      .json({ error: 'Internal Server Error', message: String(error) });
  }
};

app.get(
  '/world/:episodeKey/:worldKey/public/:variableNames',
  verify(epicenter),
  requireEpisodeWorldAccess,
  empowerWithProjectToken(epicenter),
  readPublicWorldVariables
);

app.post('/completion', verify(epicenter), completion);

function main() {
  const port = epicenter.proxyConfig().externalPort;
  app.listen(port, () => epicenter.log('INFO', `Listening on port ${port}`));
}

main();
