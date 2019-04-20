const check = require('body-checker');
const {createController, response} = require('../../../utils');

const isValidColumnType = (type) => {
    const types = {
        'VARCHAR': true,
        'INT': true,
        'DATE': true,
        // 'STRING':  true,
        'TEXT':  true,
        'FLOAT': true
    };

    return types[type] || false;
}

function checkBody (req, res, {db}, callback) {
    const data = {};
    return check(req.body, {
        name: {
            type: 'string',
            required: true
        },
        columns: {
            type: 'array',
            required: true
        }
    }, (err, body) => {
        if (err) {
          return callback(true);
        }
        data.fields = body;
        return callback(null, res, db, data);
    });
}

function validateTableName (res, db, data, callback) {
    if (data.fields.name.length > 50) {
        return callback({
            code: 400,
            message: 'Invalid table name'
        }, res);
    }
    return callback(null, res, db, data);
}

function validateColumns (res, db, data, callback) {
    for (const column of data.fields.columns) {
        if (!column.name) {
            return callback({
                code: 400,
                message: 'Column names are required'
            }, res);
        } else if (!column.type) {
            return callback({
                code: 400,
                message: 'Type of column is not specified'
            }, res);
        }
    }

    return callback(null, res, db, data);
}

function formatColumn (res, db, data, callback) {
    data.fields.columns = data.fields.columns.map((column) => {
        return Object.assign(
            {},
            column,
            { type: isValidColumnType(column.type)
                ? column.type === 'VARCHAR'
                    ? `${column.type}(${column.limit || '255'})`
                    : column.type
                : 'VARCHAR(255)'
            }
        );
    });

    return callback(null, res, db, data);
}

function findTable (res, db, data, callback) {
    const query = `SHOW TABLES LIKE '${data.fields.name}'`;

    return db.query(query, (err, result) => {
        if (err) {
            global.console.error(err);
            return callback({
                code: 501,
                message: 'Table could not be created at this time'
            }, res);
        }
        if (result.length) {
            return callback({
                code: 409,
                message: 'This table already exists'
            }, res);
        }
        return callback(null, res, db, data);
    });
}

function generateQuery (res, db, data, callback) {
    data.query = `
        CREATE TABLE ${data.fields.name}
        (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            ${data.fields.columns.map((column) => {
                return `${column.name} ${column.type}`;
            }).join(',\n')}
        )
    `;

    return callback(null, res, db, data);
}

function createTable (res, db, data, callback) {
    return db.query(data.query, (err, result) => {
        if (err) {
            global.console.error(err);
        }
        return callback(null, res, result);
    })
}

function done(error, res, data) {
    if (error) {
        if (response[error.code]) {
            return response[error.code](res, error);
        }
        return response.error(res, error);
    } else {
        return response.created(res, data);
    }
}

module.exports = createController([
    checkBody,
    validateTableName,
    validateColumns,
    formatColumn,
    findTable,
    generateQuery,
    createTable,
    done
]);
