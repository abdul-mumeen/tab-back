const {createRoute} = require('../../../utils');
const allow = require('../../../middlewares/allow');

module.exports = createRoute(
  [
    ['post', '/', allow('auth'), allow('admin'), 'create'],
    ['get', '/', allow('auth'), 'all'],
    ['get', '/:name', allow('auth'), 'one'],
    ['delete', '/:name', allow('auth'), 'drop'],
    ['post', '/:name/records', allow('auth'), 'createRecord'],
    ['put', '/:name/records',allow('auth'), 'updateRecord'],
  ],
  'table'
);
