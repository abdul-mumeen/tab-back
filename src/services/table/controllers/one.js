const {createController, response} = require('../../../utils');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');

function findTable (req, res, {db}, callback) {
    const data = {};
    const query = `SHOW TABLES LIKE '${req.params.name}'`;

    return db.query(query, (err, result) => {
        if (err) {
            logger.err(err);
            return callback({
                code: 501,
                message: err.message
            }, res);
        }
        if (!result.length) {
            return callback({
                code: 404,
                message: 'Table does not exist on database'
            }, res);
        }
        data.limit = req.query.limit || 10;
        data.tableName = Object.values(result[0])[0];
        data.auth = req.auth;
        data.isAdmin = req.isAdmin;
        return callback(null, res, db, data);
    });
}

function fetchTableInfo (res, db, data, callback) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='${data.tableName}'`;
    db.query(query, (err, result) => {
        if (err) {
            logger.err(err);
            return callback({
                code: 501,
                message: 'Cannot get all tables at this time'
            }, res);
        }

        data.rawInfo = result[0];

        return callback(null, res, db, data);
    });
}

function fetchColumnInfo (res, db, data, callback) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${data.tableName}'`;
    db.query(query, (err, result) => {
        if (err) {
            logger.err(err);
            return callback({
                code: 501,
                message: 'Cannot get all tables at this time'
            }, res);
        }

        const tessTable = result.filter((col) => {
            return col.COLUMN_NAME === 'tessellation_id';
        });

        if (tessTable.length === 0) {
            return callback({
                code: 404,
                message: 'Table not found'
            }, res);
        }

        data.columns = result;

        return callback(null, res, db, data);
    });
}

function parseTableColumn (res, db, data, callback) {
    data.table = data.columns
        .reduce((acc, column) => {
            acc.columns.push({
                name: column.COLUMN_NAME,
                dataType: column.DATA_TYPE,
                characterLength: column.CHARACTER_MAXIMUM_LENGTH,
                isNullable: column.IS_NULLABLE,
                extras: column.EXTRA
            });
            return acc;
        }, { columns: [], rows: [] });
    return callback(null, res, db, data);
}

function fetchTableTows (res, db, data, callback) {
    let query = `SELECT * FROM ${data.tableName} WHERE tessellation_created_by='${data.auth.uuid}' LIMIT ${data.limit}`;
    if (data.isAdmin) {
        query = `SELECT * FROM ${data.tableName} LIMIT ${data.limit}`;
    }

    return db.query(query, (err, result) => {
        if (err) {
            return callback({
                code: 500,
                message: err.message
            }, res);
        }

        data.table.name = data.tableName;
        data.table.rows = result;
        data.table.metadata = {
            limit: data.limit,
            createdAt: data.rawInfo.CREATE_TIME
        };

        return callback(null, res, { table: data.table });
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
    findTable,
    fetchTableInfo,
    fetchColumnInfo,
    parseTableColumn,
    fetchTableTows,
    done
]);
