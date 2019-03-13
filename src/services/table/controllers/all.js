const {createController, response} = require('../../../utils');


function findTable (req, res, {db}, callback) {
    const data = {};
    const query = `SHOW TABLES`;

    return db.query(query, (err, result) => {
        if (err) {
            global.console.error(err);
            return callback({
                code: 501,
                message: 'Table could not be created at this time'
            }, res);
        }

        data.result = result;

        return callback(null, res, db, data);
    });
}

function formatResult (res, db, data, callback) {
    data.tableNames = data.result.map((table) => {
        return Object.values(table)[0];
    });

    return callback(null, res, db, data);
}

function fetchTableInfo (res, db, data, callback) {
    data.tables = [];

    data.tableNames.forEach((tableName, index) => {
        const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${tableName}'`;
        db.query(query, (err, result) => {
            if (err) {
                global.console.error(err);
                return callback({
                    code: 501,
                    message: 'Cannot get all tables at this time'
                }, res);
            }
            data.tables.push(result);
    
            if (index === data.tableNames.length - 1) {
                return callback(null, res, data);
            }
        });
    });
}

function parseTableInformation (res, data, callback) {
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
    
    return callback(null, res, { tables: data.tables });
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
    formatResult,
    fetchTableInfo,
    parseTableInformation,
    done
]);
