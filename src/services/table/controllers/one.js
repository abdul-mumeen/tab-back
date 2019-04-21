const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');

function findTable ({req, sheetdb}, callback) {
    const data = {};
    const query = `SHOW TABLES LIKE '${req.params.name}'`;

    return sheetdb
        .raw(query)
        .then((result) => {
            console.log(result);
            if (!result[0].length) {
                return callback({
                    code: 404,
                    message: 'Table does not exist on database'
                }, res);
            }
            data.limit = req.query.limit || 10;
            data.offset = +req.query.page * data.limit || 0;
            data.tableName = Object.values(result[0][0])[0];
            data.auth = req.auth;
            data.isAdmin = req.isAdmin;
            return callback(null, data);
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: error.message,
            });
        });
}

function fetchTableInfo (data, callback, {sheetdb}) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='${data.tableName}'`;
    return sheetdb
        .raw(query)
        .then((result) => {
            data.rawInfo = result[0][0];

            return callback(null, data);
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Cannot get all tables at this time'
            });
        });
}

function fetchColumnInfo (data, callback, {sheetdb}) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${data.tableName}'`;

    return sheetdb
        .raw(query)
        .then((result) => {
            const tessTable = result[0].filter((col) => {
                return col.COLUMN_NAME === 'tessellation_id';
            });
    
            if (tessTable.length === 0) {
                return callback({
                    code: 404,
                    message: 'Table not found'
                });
            }
    
            data.columns = result[0];
    
            return callback(null, data);
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Cannot get all tables at this time'
            });
        });
}

function parseTableColumn (data, callback) {
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
    return callback(null, data);
}

function fetchTableTows (data, callback, {sheetdb}) {
    let query = `SELECT * FROM ${data.tableName} WHERE tessellation_created_by='${data.auth.uuid}' LIMIT ${data.offset},${data.limit}`;
    if (data.isAdmin) {
        query = `SELECT * FROM ${data.tableName} LIMIT ${data.offset},${data.limit}`;
    }
    let query2 = `SELECT COUNT(*) AS total FROM ${data.tableName}`
    return Promise.all([sheetdb.raw(query), sheetdb.raw(query2)])
        .then((results) => {
            data.table.name = data.tableName;
            data.table.rows = results[0][0];
            data.table.total = results[1][0][0].total;
            data.table.metadata = {
                limit: data.limit,
                createdAt: data.rawInfo.CREATE_TIME
            };

            return callback(null, { table: data.table });
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 500,
                message: error.message
            });
        })
}

module.exports = create([
    findTable,
    fetchTableInfo,
    fetchColumnInfo,
    parseTableColumn,
    fetchTableTows,
]);
