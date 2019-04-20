const check = require('body-checker');
const apply = require('async/apply');
const waterfall = require('async/waterfall');
const {createController, response} = require('../../../utils');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');
const {formatKnexError} = require('../../../utils/error');


function checkBody (req, res, {db}, callback) {
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
            }, res);
        }

        if (!Array.isArray(body.rows)) {
            return callback({ code: 400, message: 'Invalid row input' }, res);
        } else {
            const invalidTessellationId = !body.rows.every((row) => {
                return !!row.tessellation_id;
            });

            if (invalidTessellationId) {
                return callback({
                    code: 400,
                    message: 'tessellation_id is required in field',
                }, res);
            }
        }
        data.rows = body.rows;
        data.tableName = req.params.name;
        return callback(null, res, db, data);
    });
}

function findTable (res, db, data, callback) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${data.tableName}'`;
    return db.query(query, (err, result) => {
        if (err) {
            logger.err(err);
            return callback({
                code: 501,
                message: 'Cannot get all tables at this time'
            }, res);
        }

        if (!result.length) {
            return ({
                code: 404,
                message: `Table ${data.tableName} not found in database`
            }, res);
        }
        data.table = result;
        return callback(null, res, data);
    });
}

function updateRecords(res, data, callback, {knex}) {
    const ops = data.rows.map((row) => (result, callback2) => {
        const {tessellation_id, ...rest} = row;
        return knex(data.tableName)
            .where({tessellation_id, tessellation_created_by: data.isAdmin ? undefined : data.auth.uuid})
            .update(rest)
            .then(() => {
                // TODO: Cache this
                return knex(data.tableName)
                    .select('*')
                    .where({tessellation_id})
                    .then(([values]) => {
                        result.push(values);
                        return callback2(null, result);
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
            }, res);
        }

        return callback(null, res, { rows: result });
    });
}

function done(error, res, data) {
    if (error) {
        if (response[error.code]) {
            return response[error.code](res, error);
        }
        return response.error(res, error);
    } else {
        return response.ok(res, data);
    }
}

module.exports = create([
    checkBody,
    findTable,
    // parseColumn,
    // validateFields,
    // findDuplicates,
    updateRecords,
    done,
]);
