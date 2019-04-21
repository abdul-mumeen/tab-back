const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');


function findTable ({sheetdb, res}, callback) {
    const data = {};
    const query = `SHOW TABLES`;

    return sheetdb.raw(query)
        .then((result) => {
            data.result = result[0];
            callback(null, data);
            return result;
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Could not query tables at this time',
            }, res);
        });
}

function formatResult (data, callback) {
    data.tableNames = data.result.map((table) => {
        return Object.values(table)[0];
    });

    return callback(null, data);
}

function fetchTableInfo (data, callback, {res, sheetdb}) {
    data.tables = [];

    if (data.tableNames.length) {
        data.tableNames.forEach((tableName, index) => {
            const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${tableName}'`;
            return sheetdb.raw(query)
                .then((result) => {
                    data.tables.push(result[0]);
        
                    if (index === data.tableNames.length - 1) {
                        data.tables = data.tables.filter((table) => {
                            return table.filter((column) => column.COLUMN_NAME === 'tessellation_id').length;
                        });

                        return callback(null, data);
                    }
                })
                .catch((error) => {
                    logger.error(error);
                    return callback({
                        code: 501,
                        message: 'Cannot get all tables at this time'
                    }, res);
                });
        });
    } else {
        return callback(null, data);
    }
}

function parseTableInformation (data, callback, {res}) {
    data.tables = data.tables
        .map((table) => {
            return {
                name: table[0].TABLE_NAME,
                columns: table.map((column) => {
                    return {
                        name: column.COLUMN_NAME,
                        dataType: column.DATA_TYPE,
                        characterLength: column.CHARACTER_MAXIMUM_LENGTH,
                        isNullable: column.IS_NULLABLE,
                        extras: column.EXTRA
                    }
                })
            }
        });
    
    return callback(null, { tables: data.tables });
}


module.exports = create([
    findTable,
    formatResult,
    fetchTableInfo,
    parseTableInformation,
]);
