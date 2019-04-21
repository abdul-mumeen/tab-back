const {createRoute} = require('../../../utils');
const allow = require('../../../middlewares/allow');

module.exports = createRoute(
  [
    ['post', '/', allow('auth'), allow('admin'), allow('connection_id'), 'create'],
    ['get', '/', allow('auth'), allow('connection_id'), 'all'],
    ['get', '/:name', allow('auth'), allow('connection_id'), 'one'],
    ['delete', '/:name', allow('auth'), allow('connection_id'), 'drop'],
    ['post', '/:name/records', allow('auth'), allow('connection_id'), 'createRecord'],
    ['put', '/:name/records',allow('auth'), allow('connection_id'), 'updateRecord'],
  ],
  'table'
);
