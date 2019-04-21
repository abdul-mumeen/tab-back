const async = require('async')
const util = require('./util')
const logger = require('../../utils/logger');
const {systemdb} = require('../../utils');


const connection = (req, res, next) => {
  async.waterfall([
    async.apply(check, req, res),
    getConnection
  ], (error, result) => error
    ? res.status(error.code || 403).json({
        status: {
            code: error.code || 403,
            message: 'failed'
        },
        error: {
            message: error.message || 'Unauthorized! You cannot access this resource'
        }
    })
    : next()
  )
}

const check = (req, res, callback) => {
    if (process.env.NODE_ENV === 'development') {
        return callback(null, req, res);
    }
    if (!util.isRole(req, 'connection_id')) return callback(new Error())
    return callback(null, req, res);
}

const getConnection = (req, res, callback) => {
    if (process.env.NODE_ENV === 'development') {
        return callback(null);
    }

    return systemdb('tessellation_connections')
        .select(['connection', 'client'])
        .where({
            connection_id: req.headers.connection_id,
        })
        .then((result) => {
            if (!result.length) {
                throw new Error(`No connection found for id ${req.headers.connection_id}`);
            }
            req.sheetConnection = {
                props: result[0].connection,
                client: result[0].client,
            };
            callback(null);
            return result;
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 500,
                message: 'Could not establish connection with datasource',
            });
        });
}

module.exports = connection
