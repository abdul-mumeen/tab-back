// NOTE: Order matters
const columnTypes = {
    tinyint: {},
    smallint: {},
    mediumint: {},
    int: {},
    bigint: {},
    decimal: {precision: 2},
    float: {precision: 2},
    double: {},
    real: {},
    bit: {},
    boolean: {},
    serial: {},
    date: {},
    datetime: {},
    timestamp: {standard: true},
    time: {},
    year: {},
    char: {},
    varchar: {},
    tinytext: {},
    tinyText: {},
    text: {textType: ''},
    mediumtext: {},
    mediumText: {},
    longtext: {},
    longText: {},
    binary: {},
    varbinary: {},
    tinyblob: {},
    tinyBlob: {},
    mediumblob: {},
    mediumBlob: {},
    blob: {},
    longblob: {},
    longBlob: {},
    enum: {},
    set: {},
    bool: {},
    dateTime: {},
    increments: {},
    bigincrements: {},
    bigIncrements: {},
    integer: {},
    biginteger: {},
    bigInteger: {},
    string: {length: 255},
    json: {},
    jsonb: {},
    uuid: {},
    enu: {values: []},
    specificType: {},
};

const keyColumns = [
    'tessellation_id',
    'tessellation_created_by',
];

const getColumnType = (type) => {
    return columnTypes[type] || null;
}

 const mergeColumnOptions = (type, options) => {
    const column = columnTypes[type];

    if (column) {
        Object.keys(column).forEach((col) => {
            if (options && options[col]) {
                column[col] = options[col];
            }
        });
        return column;
    }

    return {};
}

const removeKeyColumns = (columns) => {
    return columns.filter((col) => {
        return keyColumns.indexOf(col.name) === -1;
    });
}

const columnHasId = (columns) => {
    return !columns.every((col) => {
        return col.name !== 'id';
    });
}

const columnPrimaryKeys = (columns) => {
    return columns
        .filter((col) => {
            return col.isPrimary;
        })
        .map((col) => col.name);
}

const columnUniqueKeys = (columns) => {
    return columns
        .filter((col) => {
            return col.isUnique;
        })
        .map((col) => col.name);
}

function listTables() {
    let query =  '';
    let bindings = [];

    switch(knex.client.constructor.name) {
        case 'Client_MSSQL':
            query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_catalog = ?',
            bindings = [ knex.client.database() ];
            break;
        case 'Client_MySQL':
        case 'Client_MySQL2':
            query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ?';
            bindings = [ knex.client.database() ];
            break;
        case 'Client_Oracle':
        case 'Client_Oracledb':
            query = 'SELECT table_name FROM user_tables';
            break;
        case 'Client_PG':
            query =  'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_catalog = ?';
            bindings = [ knex.client.database() ];
            break;
        case 'Client_SQLite3':
            query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
            break;
    }

    return knex.raw(query, bindings).then(function(results) {
        return results.rows.map((row) => row.table_name);
    });
}

module.exports = {
    columnHasId,
    columnPrimaryKeys,
    columnUniqueKeys,
    columnTypes,
    getColumnType,
    mergeColumnOptions,
    removeKeyColumns,
    listTables,
}
