const jwt = require('jsonwebtoken');
const check = require('body-checker');
const {createController, response} = require('../../../utils');
const {create} = require('../../../utils/controller');


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
          });
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

module.exports = create([
    checkBody,
    generateToken,
]);
