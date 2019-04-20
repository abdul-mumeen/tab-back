const check = require('body-checker');
const waterfall = require('async/waterfall');
const apply = require('async/apply');
const {createController, response} = require('../../../utils');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');
const {formatKnexError} = require('../../../utils/error');


function checkBody (req, res, {db}, callback) {
    const data = {};

    check(req.body, {
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
        }
        data.rows = body.rows;
        data.tableName = req.params.name;
        data.auth = req.auth;
        data.isAdmin = req.isAdmin;
        return callback(null, res, data);
    });
}

function findTable (res, data, callback, {knex}) {
    knex.schema.hasTable(data.tableName)
        .then((exists) => {
            if (!exists) {
                return ({
                    code: 404,
                    message: `Table ${data.tableName} not found in database`
                }, res);
            }

            data.table = data.tableName;
            return callback(null, res, data);
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Cannot get table at this time'
            }, res);
        });
}

function getColumnInfo (res, data, callback, {knex}) {
    return knex(data.tableName)
        .columnInfo()
        .then((info) => {
            data.columns = info;
            return callback(null, res, data); 
        });
}

function createRecords(res, data, callback, {knex}) {
    const ops = data.rows.map((row) => (result, callback2) => {

        return knex(data.tableName)
            .returning(['id'])
            .insert(Object.assign({}, row, {
                tessellation_created_by: data.isAdmin
                    ? 'admin'
                    : data.auth.uuid
            }))
            .then(([id]) => {
                // TODO: Cache this
                return knex(data.tableName)
                    .select('*')
                    .where({id})
                    .then(([values]) => {
                        if (!values.tessellation_id) {
                            if (values.id) {
                                if (data.columns.id.type === 'int') {
                                    const tessellationData = {tessellation_id: values.id};
                                    return knex(data.tableName)
                                        .update(tessellationData)
                                        .where({id})
                                        .then(() => {
                                            result.push({...values, ...tessellationData});
                                            callback2(null, result)
                                        })
                                        .catch((error) => {
                                            logger.err(error);
                                            return callback2(error);
                                        });
                                }
                            }
                        } else {
                            result.push(values);
                            return callback2(null, result)
                        }
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
                    'Records could not be added to table at this time'
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
    getColumnInfo,
    // validateFields,
    createRecords,
    done
]);
