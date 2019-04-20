const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

exports.isAuth = function (req) {
  const authorization = req.headers.authorization
  if (authorization) {
    try {
      return !!jwt.decode(authorization, process.env.TOKEN_SECRET)
    } catch (e) {
      logger.err(e)
      return false
    }
  }
  return false
}

exports.isRole = function (req, role) {
    if (!req.auth) return false;
    
    if (req.headers[role]) {
        return true;
    } else {
        return false;
    }
}

exports.response = {
  status: {
    code: 403,
    message: 'failed'
  },
  error: {
    message: 'Unauthorized! You cannot access this resource'
  }
}
