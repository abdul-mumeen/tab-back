const {createRoute} = require('../../../utils');

module.exports = createRoute(
  [
    ['post', '/', 'create'],
    ['get', '/', 'all'],
    ['get', '/:id', 'one'],
    ['delete', '/:id', 'drop']
  ],
  'table'
);
