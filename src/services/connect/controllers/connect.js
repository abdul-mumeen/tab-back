const check = require('body-checker');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');
const {formatKnexError} = require('../../../utils/error');


function checkBody ({req, res}, callback) {
    const data = {};
    return check(req.body, {
        database: {
            type: 'string',
            required: true
        },
        user: {
            type: 'string',
            required: true
        },
        password: {
            type: 'string',
            required: true,
        },
        port: {
            type: 'number',
            required: true,
        },
        host: {
            type: 'string',
            required: true,
        },
        client: {
            type: 'string',
            required: true,
        }
    }, (err, body) => {
        if (err) {
          return callback({
                code: 400,
                message: err.message,
            });
        }

        if (!req.headers['connection-id']) {
            return callback({
                code: 400,
                message: 'connection id is required',
            });
        }

        data.fields = body;
        data.auth = req.auth;
        data.isAdmin = req.isAdmin;
        data.connectionId = req.headers['connection-id'];
        return callback(null, data);
    });
}

function createConnection (data, callback, {systemdb}) {

    // Test connection
    const newKnex = require('knex')({
        client: data.fields.client,
        connection: {
            host: data.fields.host,
            password: data.fields.password,
            user: data.fields.user,
            database: data.fields.database,
            port: data.fields.port,
        }
    });

    // Test connection before saving connection details
    return newKnex.raw('select 1+1 as result')
        .then((...args) => {
            // there is a valid connection in the pool
            return systemdb('tessellation_connections')
                .select('*')
                .where({connection_id: data.connectionId})
                .then((result) => {
                    if (result.length) {
                        return systemdb('tessellation_connections')
                            .where({id: result[0].id})
                            .update({
                                connection: {
                                    host: data.fields.host,
                                    password: data.fields.password,
                                    user: data.fields.user,
                                    database: data.fields.database,
                                    port: data.fields.port,
                                },
                                created_by: data.auth.uuid,
                                client: data.fields.client,
                            })
                            .then(() => {
                                return callback(null, {
                                    database: data.fields.database,
                                    connection_id: data.connectionId,
                                });
                            })
                            .catch((error) => {
                                logger.err(error);
                                return callback({
                                    code: 500,
                                    message: formatKnexError(
                                        error,
                                        'Could not establish a connection with this database. Please ensure the credentials are accurate',
                                    ),
                                });
                            });
                    }

                    return systemdb('tessellation_connections')
                        .insert({
                            connection: {
                                host: data.fields.host,
                                password: data.fields.password,
                                user: data.fields.user,
                                database: data.fields.database,
                                port: data.fields.port,
                            },
                            connection_id: data.connectionId,
                            created_by: data.auth.uuid,
                            client: data.fields.client,
                        })
                        .then(() => {
                            return callback(null, {
                                database: data.fields.database,
                                connection_id: data.connectionId,
                            }); 
                        })
                        .catch((error) => {
                            logger.err(error);
                            return callback({
                                code: 500,
                                message: formatKnexError(
                                    error,
                                    'Could not establish a connection with this database. Please ensure the credentials are accurate',
                                ),
                            });
                        });
                })
                .catch((error) => {
                    logger.err(error);
                    return callback({
                        code: 500,
                        message: formatKnexError(
                            error,
                            'Could not establish a connection with this database. Please ensure the credentials are accurate',
                        ),
                    });
                });
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 500,
                message: error.message,
            });
        });
}

module.exports = create([
    checkBody,
    createConnection,
]);
