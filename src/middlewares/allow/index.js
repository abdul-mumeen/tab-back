function allow (role) {
    switch (role) {
        case 'auth':
            return require('./auth')
        case 'admin':
            return require('./admin')
        case 'connection_id':
            return require('./connection')
        default:
            return all;
        }
}
  
function all (req, res, next) {
    return next()
}
  
module.exports = allow
  