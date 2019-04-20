const check = require('body-checker');
const waterfall = require('async/waterfall');
const {createController, response} = require('../../../utils');
const {create} = require('../../../utils/controller');
const logger = require('../../../utils/logger');
const {getColumnType} = require('../../../utils/table');
const {mergeColumnOptions} = require('../../../utils/table');
const {columnHasId} = require('../../../utils/table');
const {removeKeyColumns} = require('../../../utils/table');
const {columnPrimaryKeys} = require('../../../utils/table');
const {columnUniqueKeys} = require('../../../utils/table');
const {superChain} = require('../../../utils/helper');



/*
    {
        name: STRING,
        type: STRING,
        options: {},
        isPrimary: BOOLEAN,
        isUnique: BOOLEAN,
        foreign: {
            references: STRING,
            in: STRING,
            onDelete: STRING,
        }
    }
*/
function checkBody ({req}, callback) {
    const data = {};
    return check(req.body, {
        name: {
            type: 'string',
            required: true
        },
        columns: {
            type: 'array',
            required: true
        },
        withId: {
            type: 'boolean',
            required: false,
            default: true,
        },
        useUUID: {
            type: 'boolean',
            required: false,
            default: false,
        },
        withTimeStamps: {
            type: 'boolean',
            required: false,
            default: false,
        }
    }, (err, body) => {
        if (err) {
          return callback(true);
        }
        data.fields = body;
        data.auth = req.auth;
        data.isAdmin = req.isAdmin;
        return callback(null, data);
    });
}

function validateTableName (data, callback) {
    if (data.fields.name.length > 50) {
        return callback({
            code: 400,
            message: 'Invalid table name'
        });
    }
    return callback(null, data);
}

function validateColumns (data, callback) {
    for (const column of data.fields.columns) {
        if (!column.name) {
            return callback({
                code: 400,
                message: 'Column names are required',
            });
        } else if (!column.type) {
            return callback({
                code: 400,
                message: 'Type of column is not specified',
            });
        }
    }

    return callback(null, data);
}

function formatColumn (data, callback) {
    const columns = removeKeyColumns(data.fields.columns);

    data.fields.columns = columns.map((column) => {
        const options = getColumnType(column.type.toLowerCase());
        const columnType = options ? column.type.toLowerCase() : 'string';
        return Object.assign(
            {},
            column,
            {
                options: mergeColumnOptions(columnType, column.options),
                type: columnType,
            },
        );
    });

    return callback(null, data);
}

function findTable (data, callback, {sheetdb}) {
    sheetdb.schema.hasTable(data.fields.name)
        .then((exists) => {
            if (!exists) {
                return callback(null, data);
            }

            return callback({
                code: 409,
                message: 'This table already exists',
            });
        })
        .catch((error) => {
            logger.err(error);
            return callback({
                code: 501,
                message: 'Table could not be created at this time'
            });
        });
}

function generateQuery (data, callback, {sheetdb}) {
    try {
        const query = sheetdb.schema.createTable(data.fields.name, function (table) {
            const primaryKeys = columnPrimaryKeys(data.fields.columns);
            const uniqueKeys = columnUniqueKeys(data.fields.columns);

            // If id column is not sent with request, and withId is true.
            // We don't want to make any assumptions with the column list
            if (!columnHasId(data.fields.columns)) {
                if (data.fields.withId) {
                    if (data.fields.useUUID) {
                        table.uuid('id').unique().defaultTo(sheetdb.raw('uuid_generate_v4()'))
                    } else {
                        table.increments();
                    }
                }
            }
    
            data.fields.columns.forEach((column) => {
                if (table[column.type] && table[column.type].constructor === Function) {
                    if (column.foreign) {
                        if (!column.foreign.references || !column.foreign.in) {
                            throw new Error('invalid relationship. Ensure the reference table and column are valid');
                        }
                        superChain(table[column.type](column.name), [
                            ['references', column.foreign.references],
                            ['inTable', column.foreign.in],
                            ['onDelete', column.foreign.onDelete || 'SET NULL'],
                        ]);
                    } else {
                        table[column.type](column.name);
                    }
                } else {
                    throw new Error(`${column.type} data type is not supported`);
                }
            });

            if (data.fields.withId) {
                table.bigInteger('tessellation_id');
            } else {
                table.bigincrements('tessellation_id');
            }

            table.string('tessellation_created_by');

            if (!data.fields.withId && primaryKeys.length) {
                table.primary(primaryKeys);
            }

            if (data.fields.withTimeStamps) {
                table.timestamps();
            }

            if (data.fields.useUUID) {
                uniqueKeys.push('id');
            }
            table.unique(uniqueKeys);

        }).toSQL();

        data.queries = query;
        return callback(null, data);
    } catch (error) {
        logger.err(error);
        return callback({
            code: 400,
            message: error.message,
        });
    }
}

function createTable (data, callback, {sheetdb}) {
    const ops = data.queries.map((query, index) => (callback) => {
        logger.info(`Running query`, query);
        return sheetdb
            .raw(...Object.values(query))
            .then((...args) => {
                console.log(...args);
                callback(null);
            })
            .catch((e) => {
                callback(e);
            });
    });

    waterfall(ops, function (error, result) {
        if (error) {
            dropTable(sheetdb, data.fields.name);
            logger.err(error);
            return callback({
                code: 500,
                message: error.message,
            });
        } else {
            return callback(null, result);
        }
    });
}

function dropTable (sheetdb, tableName) {
    const queries = sheetdb.schema.dropTableIfExists(tableName).toSQL();

    const ops = queries.map((query) => (callback) => {
        logger.info(`Running query`, query);
        return sheetdb
            .raw(...Object.values(query))
            .then(() => {
                callback(null);
            })
            .catch((e) => {
                callback(e);
            });
    });

    waterfall(ops, function (error) {
        if (error) {
            logger.err(error);
            // TODO: ADD TO FLUSH LIST
        } else {
            logger.info(`Dropped table "${tableName}" after unsuccessful creation`);
        }
    });
}

module.exports = create([
    checkBody,
    validateTableName,
    validateColumns,
    formatColumn,
    findTable,
    generateQuery,
    createTable,
    // done
]);
