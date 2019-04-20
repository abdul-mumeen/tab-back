function allow (role) {
    switch (role) {
      case 'auth':
        return require('./auth')
      case 'admin':
        return require('./admin')
      default:
        return all;
    }
}
  
function all (req, res, next) {
    return next()
}
  
module.exports = allow
  