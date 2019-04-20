const jwt = require('jsonwebtoken');
const check = require('body-checker');
const {createController, response} = require('../../../utils');


const checkBody = ({req}, callback) => {
    const data = {};
    return check(req.body, {
        uuid: {
            type: 'string',
            required: true
        }
    }, (err, body) => {
        if (err) {
          return callback({
              code: 400,
              message: err.message
          }, res);
        }
        data.fields = body;
        return callback(null, data);
    });
}

const generateToken = (data, callback) => {
    const token = jwt.sign({
        uuid: data.fields.uuid
    }, process.env.SECRET);

    return callback(null, { token });
}

const done = (error, data, {res}) => {
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
