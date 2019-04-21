const {create} = require('../../../utils/controller');

function checkBody (opts, callback) {
    const data = {};
    return callback(null, data);
}

module.exports = create([
    checkBody,
]);
