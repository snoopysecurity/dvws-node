const jwt = require('jsonwebtoken');

module.exports = {
  validateToken: (req, res, next) => {
    const authorizationHeaader = req.headers.authorization;
    let result;
    if (authorizationHeaader) {
      const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
      const options = {
        expiresIn: '2d',
        issuer: 'https://github.com/snoopysecurity',
        algorithms: ["HS256", "none"],
        ignoreExpiration: true
      };
      try {
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        req.decoded = result;
        next();
      } catch (err) {
        // Return 401 instead of throwing 500 to handle malformed/expired tokens gracefully
        res.status(401).send({ error: 'Authentication error. Invalid token.', details: err.message });
      }
    } else {
      result = {
        error: `Authentication error. Token required.`,
        status: 401
      };
      res.status(401).send(result);
    }
  }
};
