const {createController, response} = require('../../../utils');


function findTable (res, db, data, callback) {
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

        return callback(null, res, data);
    });
}

function formatResult (res, data, callback) {
    const tables = data.result.map((table) => {
        return Object.values(table)[0];
    });

    return callback(null, res, { tables });
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
    done
]);
