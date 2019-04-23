const async = require('async');
const firebase = require('firebase');
const constants = require('../../constants');
const {knex, response, systemdb} = require('./index');
const logger = require('./logger');


const {
    API_KEY,
    AUTH_DOMAIN,
    DATABASE_URL,
    PROJECT_ID,
    STORAGE_BUCKET,
    MESSANGING_SENDER_ID
} = process.env;

const config = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    databaseURL: DATABASE_URL,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSANGING_SENDER_ID
};

//TODO: Document this

function create (waterfall) {
    try {
        // Initialize firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }

    
        // Compose services
        return (req, res) => {
            const options = {constants, firebase, knex, systemdb};

            logger.info(`START: [${req.method}]`, {
                method: req.method,
                url: req.originalUrl,
                headers: req.header,
                body: req.body,
                queries: req.query,
            });

            function initWaterfall (callback) {
                if (process.env.NODE_ENV === 'development') {
                    options.sheetdb = knex;
                    return callback(null, options);
                } else if (req.sheetConnection) {
                    const sheetdb = require('knex')({
                        client: req.sheetConnection.client,
                        connection: req.sheetConnection.props,
                    });

                    return sheetdb.raw('select 1+1 as result')
                        .then((...args) => {
                            options.sheetdb = sheetdb;
                            callback(null, options);
                            return args;
                        })
                        .catch((error) => {
                            logger.err(error)
                            return callback({
                                code: 500,
                                message: 'could not establish connection to datasource',
                            }, res);
                        })
                } else {
                    return callback(null, options);
                }
            };

            function unfoldWaterfall (options, callback) {
                const waterfall2 = waterfall.map((fn, index) => {
                    const loggerOptions = {
                        method: req.method,
                        name: fn.name,
                        url: req.originalUrl,
                    };
    
                    return (...args) => {
                        logger.info(
                            index !== waterfall.length - 1 ? 'Running...' : 'Done!',
                            loggerOptions
                        );
    
                        try {
                            return fn(...args, Object.assign({}, options, {req, res}));
                        } catch (e) {
                            logger.error(constants.GENERIC_LEVEL_ERROR, e);
                            
                            return callback({
                                code: 500,
                                message: constants.GENERIC_ERROR,
                            });
                        }
                    }
                });

                return callback(null, options, waterfall2);
            }
            

            function createController (options, waterfall2, callback) {
                waterfall2[0] = async.apply(waterfall2[0], Object.assign({}, options, {req, res}));
    
                async.waterfall(waterfall2, (error, data) => {
                    return callback(error, data);
                });
            }

            function done (error, data) {
                logger.info(
                    'Done!',
                    {
                        method: req.method,
                        name: 'done',
                        url: req.originalUrl,
                    }
                );

                if (process.env.NODE_ENV !=='development') {
                    if (options.sheetdb) {
                        logger.info('destroying connection to data source');
                        options.sheetdb.destroy();
                    }
                }   

                if (error) {
                    if (response[error.code]) {
                        return response[error.code](res, error);
                    }
                    return response.error(res, error);
                } else {
                    return response.created(res, data);
                }
            }

            async.waterfall([
                async.apply(initWaterfall),
                unfoldWaterfall,
                createController,
            ], done);
        }
    } catch (e) {
        logger.error(e);

        process.exit(1);
    }
}

module.exports = {
    create,
};
