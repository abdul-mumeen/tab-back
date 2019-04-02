const check = require('body-checker');
const {createController, response} = require('../../../utils');

const toString = (obj) => {
    const sorted = Object.keys(obj).sort((a, b) => a > b);
    return sorted.reduce((acc, field) => acc += obj[field], '');
} 

const parseSQLValues = (values, separator, includeNull=true) => {
    return Object
        .keys(values)
        .filter(col => includeNull ? true : !!values[col])
        .map(col => `${col} = ${typeof values[col] === 'string' ? `'${values[col]}'` : values[col]}`)
        .join(separator);
}

const runQuery = (db, query) => {
    return new Promise((resolve, reject) => {
        db.query(query, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
}

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

    return String(value);
}

const mergeOldAndNew = (data) => {
    return Object.assign({}, data.old, data.new);
}

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
            let message = null;
            body.rows.forEach((row) => {
                if (!row.old) {
                    message = 'Row must contain old data';
                } else if (!row.new) {
                    message = 'Row must contain data to update';
                }
            });

            if (message) {
                return callback({ code: 400, message }, res);
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
        const newRow = {};

        for (column of Object.keys(row.new)) {
            if (!data.table[column]) {
                return callback({
                    code: 400,
                    message: `Column ${column} does not exist on table '${data.tableName}'`
                }, res);
            }
    
            if (data.table[column].isNullable !== 'YES' && !row.new[column]) {
                return callback({
                    code: 400,
                    message: `Column ${column} cannot have a null value`
                }, res);
            }
    
            if (row.new[column] &&  data.table[column].characterLength) {
                if (row.new[column].length >  data.table[column].characterLength) {
                    return callback({
                        code: 400,
                        message: `Maximum length of '${data.table[column].characterLength}' for column ${column}`
                    }, res);
                }
            }
    
            try {
                const value = parseValue(
                    row.new[column],
                    data.table[column].dataType,
                    data.table[column].isNullable
                );
        
                newRow[column] = value;
                
            } catch (e) {
                return callback({
                    code: 400,
                    message: e.message
                }, res);
            }   
        }
        rows.push({
            old: row.old,
            new: newRow,
        });
    }

    data.rows = rows;

    return callback(null, res, db, data);
}

function findDuplicates (res, db, data, callback) {
    const duplicates = {};
    
    data.rows.forEach((row) => {
        const oldString = toString(row.old);
        if (duplicates[oldString]) {
            duplicates[oldString].push(row.old);
        } else {
            duplicates[oldString] = [row];
        }
    });

    data.rowDuplicates = Object.values(duplicates);

    return callback(null, res, db, data);
}

function createRecords(res, db, data, callback) {
    return Promise.all(data.rowDuplicates.map((row) => {
        return new Promise((resolve, reject) => {
            let queries = [];
            if (row.length === 1) {
                console.log(row[0]);
                const newValues = parseSQLValues(row[0].new, ', ');
                const oldValues = parseSQLValues(row[0].old, ' AND ', false);

                queries.push(`UPDATE ${data.tableName} SET ${newValues} WHERE ${oldValues}`);
            } else {
                queries =  row.map((duplicate) => {
                    const newValues = parseSQLValues(duplicate.new, ', ');
                    const oldValues = parseSQLValues(duplicate.old, ' AND ', false);

                    return `
                        UPDATE ${data.tableName} 
                        SET ${newValues}
                        WHERE ${oldValues}
                        LIMIT 1
                    `;
                });
            }
            const results = [];

            return queries.reduce((p, query, index) => {
                return p.then(() => runQuery(db, query)
                    .then((result) => {
                        results.push(result);
                        if (index === queries.length - 1) {
                            return resolve(results);
                        } 
                    }))
             }, Promise.resolve());
        });
    }))
    .then((results) => {
        return callback(null, res, {
            rows: data.rows.map((row) => mergeOldAndNew(row)),
            meta: results
        });
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
    findDuplicates,
    createRecords,
    done,
]);
