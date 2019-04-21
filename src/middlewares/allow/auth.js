const async = require('async')
const jwt = require('jsonwebtoken')
const util = require('./util')

const auth = (req, res, next) => {
  async.waterfall([
    async.apply(check, req, res),
    decodeToken,
    saveUser
  ], error => error
    ? res.status(403).json(util.response)
    : next()
  )
}

const check = (req, res, callback) => {
  if (!util.isAuth(req)) return callback(new Error({ message: 'unauthorized' }))
  return callback(null, req, res)
}

const decodeToken = (req, res, callback) => {
    const user = jwt.decode(
        req.headers.authorization,
        process.env.SECRET,
    );

    return callback(null, req, res, user);
}

const saveUser = (req, res, user, callback) => {
    req.auth = user;
    if(util.isRole('admin')) {
        req.isAdmin = true;
    } 
    return callback(null);
}

module.exports = auth
