const check = require('body-checker');
const apply = require('async/apply');
const waterfall = require('async/waterfall');
const {createController, response} = require('../../../utils');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');
const {formatKnexError} = require('../../../utils/error');


function checkBody ({req}, callback) {
    const data = {};

    check(req.body, {
        tableName: {
            type: 'string',
        },
        rows: {
            type: 'array',
            required: true,
        }
    }, (err, body) => {
        if (err) {
            return callback({
                code: 400,
                message: err.message
            });
        }

        if (!Array.isArray(body.rows)) {
            return callback({ code: 400, message: 'Invalid row input' });
        } else {
            const invalidTessellationId = !body.rows.every((row) => {
                return !!row.tessellation_id;
            });

            if (invalidTessellationId) {
                return callback({
                    code: 400,
                    message: 'tessellation_id is required in field',
                });
            }
        }

        data.auth = req.auth;
        data.isAdmin = req.isAdmin;
        data.rows = body.rows;
        data.tableName = req.params.name;
        return callback(null, data);
    });
}

function findTable (data, callback, {sheetdb}) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${data.tableName}'`;

    return sheetdb
        .raw(query)
        .then((result) => {
            if (!result[0].length) {
                return ({
                    code: 404,
                    message: `Table ${data.tableName} not found in database`
                }, res);
            }
            data.table = result[0];
            callback(null, data);
            return result;
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Cannot get table information at this time',
            });
        });
}

function updateRecords(data, callback, {sheetdb}) {
    const ops = data.rows.map((row) => (result, callback2) => {
        const {tessellation_id, ...rest} = row;
        return sheetdb(data.tableName)
            .where({tessellation_id, tessellation_created_by: data.isAdmin ? undefined : data.auth.uuid})
            .update(rest)
            .then(() => {
                // TODO: Cache this
                return sheetdb(data.tableName)
                    .select('*')
                    .where({tessellation_id})
                    .then(([values]) => {
                        result.push(values);
                        callback2(null, result);
                        return result;
                    })
                    .catch((error) => {
                        logger.err(error);
                        return callback2(error);
                    });
            })
            .catch((error) => {
                logger.err(error);
                return callback2(error);
            });
    });

    ops[0] = apply(ops[0], []);

    waterfall(ops, function(error, result) {
        if (error) {
            return callback({
                code: 500,
                message: formatKnexError(
                    error,
                    'Records could not be updated at this time'
                ),
            });
        }

        return callback(null, { rows: result });
    });
}


module.exports = create([
    checkBody,
    findTable,
    updateRecords,
]);
