const check = require('body-checker');
const waterfall = require('async/waterfall');
const apply = require('async/apply');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');
const {formatKnexError} = require('../../../utils/error');


function checkBody ({req}, callback) {
    const data = {};

    check(req.body, {
        rows: {
            type: 'array',
            required: true,
        },
        truncate: {
            type: 'boolean',
            required: false,
            default: false,
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
        }
        data.rows = body.rows;
        data.tableName = req.params.name;
        data.truncate = body.truncate;
        data.auth = req.auth;
        data.isAdmin = req.isAdmin;
        return callback(null, data);
    });
}

function findTable (data, callback, {sheetdb}) {
    return sheetdb.schema.hasTable(data.tableName)
        .then((exists) => {
            if (!exists) {
                return ({
                    code: 404,
                    message: `Table ${data.tableName} not found in database`
                });
            }

            data.table = data.tableName;
            callback(null, data);
            return exists;
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Cannot get table at this time'
            });
        });
}

function getColumnInfo (data, callback, {sheetdb}) {
    return sheetdb(data.tableName)
        .columnInfo()
        .then((info) => {
            data.columns = info;
            callback(null, data);
            return info; 
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Cannot get table at this time'
            });
        });
}


function removeRecords (data, callback, {sheetdb}) {
    if (data.truncate) {
        return sheetdb(data.tableName) 
            .delete()
            .where({tessellation_created_by: data.isAdmin ? 'admin' : data.auth.uuid})
            .then(() => {
                callback(null, data);
                return true;
            })
            .catch((error) => {
                logger.err(error);
                callback({
                    code: 500,
                    message: 'could not remove older records',
                });
                return error;
            });
    }

    return callback(null, data);
}

function createRecords(data, callback, {sheetdb}) {
    const ops = data.rows.map((row) => (result, callback2) => {

        return sheetdb(data.tableName)
            .returning(['id'])
            .insert(Object.assign({}, row, {
                tessellation_created_by: data.isAdmin
                    ? 'admin'
                    : data.auth.uuid
            }))
            .then(([id]) => {
                // TODO: Cache this
                return sheetdb(data.tableName)
                    .select('*')
                    .where({id})
                    .then(([values]) => {
                        if (!values.tessellation_id) {
                            if (values.id) {
                                if (data.columns.id.type === 'int') {
                                    const tessellationData = {tessellation_id: values.id};
                                    return sheetdb(data.tableName)
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
            });
        }

        return callback(null, { rows: result });
    });
}

module.exports = create([
    checkBody,
    findTable,
    getColumnInfo,
    removeRecords,
    createRecords,
]);
