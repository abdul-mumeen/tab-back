
const {createRoute} = require('../../../utils');

module.exports = createRoute(
  [
    ['get', '/signin', 'signIn'],
    ['get', '/signup', 'signUp']
  ],
);
