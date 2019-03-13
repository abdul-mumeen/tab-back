const jwt = require('jsonwebtoken');
const check = require('body-checker');
const {createController, response} = require('../../../utils');


const checkBody = (req, res, firebase, callback) => {
    const data = {};
    return check(req.body, {
        email: {
            type: 'string',
            required: true
        },
        password: {
            type: 'string',
            required: true
        }
    }, (err, body) => {
        if (err) {
          return callback(true);
        }
        data.fields = body;
        return callback(null, res, firebase, data);
    });
}

const authenticate = (res, firebase, data, callback) => {
    firebase
        .auth()
        .signInWithEmailAndPassword(data.fields.email, data.fields.password)
        .then(() => {
            return callback(null, res, data);
        })
        .catch(function(error) {
            if (error) {
                let {code, message} = error;
                const codes = ['auth/wrong-password', 'auth/user-not-found'];
                if (codes.includes(code)) {
                    code = 'unauthorized';
                    message = 'Invalid email and password combination';
                }
                return callback({code, message}, res);
            } else {
                return callback(null, res, data);
            }
        });
}

const generateToken = (res, data, callback) => {
    const token = jwt.sign({
        email: data.fields.email
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
    authenticate,
    generateToken,
    done
]);
