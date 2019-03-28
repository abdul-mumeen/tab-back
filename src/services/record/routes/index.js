const {createRoute} = require('../../../utils');

module.exports = createRoute(
  [
    ['put', '/', 'update'],
  ],
  'record'
);
