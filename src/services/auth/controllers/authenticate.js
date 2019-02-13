const jwt = require('jsonwebtoken');
const check = require('body-checker');
const {createController, response} = require('../../../utils');


const checkBody = (req, res, callback) => {
    const data = {};
    return check(req.body, {
        uuid: {
            type: 'string',
            required: true
        }
    }, (err, body) => {
        if (err) {
          return callback(true);
        }
        data.fields = body;
        return callback(null, res, data);
    });
}

const generateToken = (res, data, callback) => {
    const token = jwt.sign({
        uuid: data.fields.uuid
    }, process.env.SECRET);

    return callback(null, res, { token });
}

const done = (error, res, data) => {
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
    generateToken,
    done
]);
