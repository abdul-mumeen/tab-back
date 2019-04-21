const jwt = require('jsonwebtoken');
const check = require('body-checker');
const {create} = require('../../../utils/controller');


function checkBody({req}, callback) {
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
            return callback({
                code: 400,
                message: err.message,
            });
        }
        data.fields = body;
        return callback(null, data);
    });
}

function authenticate(data, callback, {firebase}) {
    return firebase
        .auth()
        .createUserWithEmailAndPassword(data.fields.email, data.fields.password)
        .then(() => {
            return callback(null, data);
        })
        .catch(function(error) {
            if (error) {
                let {code, message} = error;
                if (code === 'auth/email-already-in-use') {
                    code = 'conflict';
                }
                return callback({code, message});
            }
        });
}

function generateToken(res, data, callback) {
    const token = jwt.sign({
        email: data.fields.email
    }, process.env.SECRET);

    return callback(null, res, { token });
}


module.exports = create([
    checkBody,
    authenticate,
    generateToken,
]);
