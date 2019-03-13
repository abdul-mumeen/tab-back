const {createController, response} = require('../../../utils');


function findTable (req, res, {db}, callback) {
    const data = {};
    const query = `SHOW TABLES LIKE '${req.params.name}'`;

    return db.query(query, (err, result) => {
        if (err) {
            global.console.error(err);
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
        data.limit = req.params.limit || 10;
        data.tableName = Object.values(result[0])[0];
        return callback(null, res, db, data);
    });
}

function fetchTableInfo (res, db, data, callback) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='${data.tableName}'`;
    db.query(query, (err, result) => {
        if (err) {
            global.console.error(err);
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
            global.console.error(err);
            return callback({
                code: 501,
                message: 'Cannot get all tables at this time'
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
    let query = `SELECT * FROM ${data.tableName} LIMIT ${data.limit}`;
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

module.exports = createController([
    findTable,
    fetchTableInfo,
    fetchColumnInfo,
    parseTableColumn,
    fetchTableTows,
    done
]);
