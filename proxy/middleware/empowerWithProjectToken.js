const { Router, Fault } = require('epicenter-libs');

const empowerWithProjectToken = (epicenter) => async (req, res, next) => {
  try {
    const session = await new Router()
      .post('/authentication', {
        inert: true,
        includeAuthorization: false,
        body: {
          objectType: 'account',
          secretKey: epicenter.proxyConfig().apiSharedSecret,
        },
      })
      .then(({ body }) => body);

    if (!session?.token) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Project authentication response did not include a token.',
      });
    }

    req.projectAuthorization = `Bearer ${session.token}`;
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
  empowerWithProjectToken,
};
