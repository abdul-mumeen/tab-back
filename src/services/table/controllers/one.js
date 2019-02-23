const {createController, response} = require('../../../utils');

function checkBody (req, res, callback, {db}) {
    const data = {};
    return callback(null, res, data);
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
    done
]);
