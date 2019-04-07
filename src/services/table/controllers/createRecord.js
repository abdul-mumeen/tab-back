const check = require('body-checker');
const {createController, response} = require('../../../utils');

const parseValue = (value, dataType, isNullable) => {
    if (!value && isNullable === 'YES') {
        return null;
    }

    const numberDataTypes = {
        float: parseFloat,
        int: parseInt
    };

    if (numberDataTypes[dataType]) {
        const parsedValue = numberDataTypes[dataType](value);

        if (isNaN(parsedValue)) {
            if (!value && isNullable === 'YES') {
                return null;
            }
            throw new Error(
                `Invalid '${typeof value}' type for column of type '${dataType}'`
            );
        }
        return parsedValue;
    }

    return `'${String(value)}'`;
}

function checkBody (req, res, {db}, callback) {
    const data = {};

    check(req.body, {
        rows: {
            type: 'array',
            required: true,
        },
        truncate: {
          type: 'boolean',
          required: false,
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
        } else if (!Array.isArray(body.rows[0])) {
            return callback({ code: 400, message: 'Invalid row input' }, res);
        };
        data.rows = body.rows;
        data.tableName = req.params.name;
        data.truncate = body.truncate || false;
        return callback(null, res, db, data);
    });
}

function findTable (res, db, data, callback) {
    const query =`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${data.tableName}'`;
    return db.query(query, (err, result) => {
        if (err) {
            global.console.error(err);
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
        return callback(null, res, db, data);
    });
}

function parseColumn (res, db, data, callback) {
    data.table = data.table.reduce((acc, column) => {
        acc[column.COLUMN_NAME] = {
            dataType: column.DATA_TYPE,
            characterLength: column.CHARACTER_MAXIMUM_LENGTH,
            isNullable: column.IS_NULLABLE,
        }
        return acc;
    }, {});

    return callback(null, res, db, data);
}

function validateFields (res, db, data, callback) {
    const rows = [];
    for (const row of data.rows) {
        const columns = [];
        for (column of row) {
            if (!data.table[column.columnName]) {
                return callback({
                    code: 400,
                    message: `Column ${column.columnName} does not exist on table '${data.tableName}'`
                }, res);
            }
    
            if (data.table[column.columnName].isNullable !== 'YES' && !column.value) {
                return callback({
                    code: 400,
                    message: `Column ${column.columnName} cannot have a null value`
                }, res);
            }
    
            if (column.value &&  data.table[column.columnName].characterLength) {
                if (column.value.length >  data.table[column.columnName].characterLength) {
                    return callback({
                        code: 400,
                        message: `Maximum length of '${data.table[column.columnName].characterLength}' for column ${column.columnName}`
                    }, res);
                }
            }
    
            try {
                const value = parseValue(
                    column.value,
                    data.table[column.columnName].dataType,
                    data.table[column.columnName].isNullable
                );
        
                columns.push(Object.assign({}, column, {
                    value
                }));
            } catch (e) {
                return callback({
                    code: 400,
                    message: e.message
                }, res);
            }   
        }
        rows.push(columns);
    }

    data.rows = rows

    return callback(null, res, db, data);
}

function truncateTable(res, db, data, callback) {
  if (data.truncate){
    return new Promise((resolve, reject) => {
      const query = `TRUNCATE TABLE ${data.tableName};`;
      return db.query(query, (err, result) => {
          if (err) {
              return reject(err);
          }

          return resolve(result);
      })
    }).then((results) => {
        return callback(null, res, db, data);
    }).catch((err) => {
        global.console.error(err.message);
        return callback({
            code: 500,
            message: err.message
        }, res);
    });
  }else {
    return callback(null, res, db, data);
  }
}

function createRecords(res, db, data, callback) {
    return Promise.all(data.rows.map((row) => {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO ${data.tableName} (${row.map(col => col.columnName).join(', ')}) values (
                ${row.map(col => col.value).join(', ')
            })`;
    
            return db.query(query, (err, result) => {
                if (err) {
                    return reject(err);
                }

                return resolve(result);
            });
        });
    }))
    .then((results) => {
        console.log(results);
        return callback(null, res, { rows: data.rows });
    })
    .catch((err) => {
        global.console.error(err.message);
        return callback({
            code: 500,
            message: err.message
        }, res);
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
    checkBody,
    findTable,
    parseColumn,
    validateFields,
    truncateTable,
    createRecords,
    done
]);
