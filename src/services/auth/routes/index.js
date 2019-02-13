
const {createRoute} = require('../../../utils');

module.exports = createRoute(
  [
    ['post', '/signin', 'signIn'],
    ['post', '/signup', 'signUp'],
    ['post', '/authenticate', 'authenticate']
  ],
);
