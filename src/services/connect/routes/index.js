const {createRoute} = require('../../../utils');
const allow = require('../../../middlewares/allow');

module.exports = createRoute(
  [
    ['post', '/', allow('auth'), allow('admin'), 'connect'],
  ],
  'connect'
);
