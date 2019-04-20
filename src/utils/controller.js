const async = require('async');
const firebase = require('firebase');
const constants = require('../../constants');
const {db, knex, response} = require('./index');
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

function create (waterfall) {
    try {
        // Initialize firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }

        const options = {constants, firebase, db, knex};
    
        // Compose services
        return (req, res) => {
            logger.info(`START: [${req.method}]`, {
                method: req.method,
                url: req.originalUrl,
            });
            const unfoldWaterfall = waterfall.map((fn, index) => {
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
                        return fn(...args, options);
                    } catch (e) {
                        logger.error(constants.GENERIC_LEVEL_ERROR, e);

                        return response.error(res, {
                            message: constants.GENERIC_ERROR,
                        });
                    }
                }
            });
    
            unfoldWaterfall[0] = async.apply(unfoldWaterfall[0], req, res, options);
    
            // Do Async Op
            async.waterfall(
                unfoldWaterfall.slice(0, -1),
                unfoldWaterfall.slice(-1)[0]
            );
        }
    } catch (e) {
        logger.error(e);

        process.exit(1);
    }
}

module.exports = {
    create,
};
