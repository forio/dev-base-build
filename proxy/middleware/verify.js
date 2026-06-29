const { Router, Fault, SCOPE_BOUNDARY } = require('epicenter-libs');

const getAuthorizationHeader = (req) => {
  const authorization = req.headers['authorization'];
  return typeof authorization === 'string' ? authorization : undefined;
};

const isEpisodeWorld = (world, episodeKey) =>
  world.orbitType?.toLowerCase() === SCOPE_BOUNDARY.EPISODE.toLowerCase() &&
  world.orbitKey === episodeKey;

const verify = (epicenter) => async (req, res, next) => {
  const authorization = getAuthorizationHeader(req);
  if (!authorization) {
    return res.status(401).json({ error: 'Unauthorized. Missing authorization.' });
  }

  try {
    const session = await new Router()
      .withAuthorization(authorization)
      .get('/verification')
      .then(({ body }) => body);

    const reject = (reason) =>
      res.status(401).json({ error: 'Unauthorized. ' + reason });

    if (session.accountShortName !== epicenter.proxyConfig().accountShortName)
      return reject('Account mismatch.');
    if (session.projectShortName !== epicenter.proxyConfig().projectShortName)
      return reject('Project mismatch.');

    req.session = session;
    return next();
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

const requireEpisodeWorldAccess = async (req, res, next) => {
  const authorization = getAuthorizationHeader(req);
  if (!authorization) {
    return res.status(401).json({ error: 'Unauthorized. Missing authorization.' });
  }

  if (!req.session?.userKey) {
    return res.status(403).json({ error: 'Forbidden. Participant session required.' });
  }

  const { episodeKey, worldKey } = req.params;

  try {
    const worlds = await new Router()
      .withAuthorization(authorization)
      .get(`/world/with/${SCOPE_BOUNDARY.EPISODE}/${encodeURIComponent(episodeKey)}`)
      .then(({ body }) => body);
    const world = worlds.find(
      (candidate) =>
        candidate.worldKey === worldKey && isEpisodeWorld(candidate, episodeKey)
    );
    const ownWorld = worlds.find(
      (candidate) =>
        isEpisodeWorld(candidate, episodeKey) &&
        candidate.assignments?.some(
          (assignment) => assignment.user?.userKey === req.session.userKey
        )
    );

    if (!world) {
      return res.status(404).json({ error: 'World not found in episode.' });
    }

    if (!ownWorld) {
      return res
        .status(403)
        .json({ error: 'Forbidden. No participant assignment in this episode.' });
    }

    req.world = world;
    return next();
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

module.exports = {
  verify,
  requireEpisodeWorldAccess,
};
