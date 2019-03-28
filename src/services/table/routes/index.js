const {createRoute} = require('../../../utils');

module.exports = createRoute(
  [
    ['post', '/', 'create'],
    ['get', '/', 'all'],
    ['get', '/:name', 'one'],
    ['delete', '/:name', 'drop'],
    ['post', '/:name/records', 'createRecord'],
    ['put', '/:name/records', 'updateRecord'],
  ],
  'table'
);
