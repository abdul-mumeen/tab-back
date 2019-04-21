const jwt = require('jsonwebtoken');
const check = require('body-checker');
const {create} = require('../../../utils/controller');


const checkBody = ({req}, callback) => {
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

const authenticate = (data, callback, {firebase}) => {
    return firebase
        .auth()
        .signInWithEmailAndPassword(data.fields.email, data.fields.password)
        .then(() => {
            return callback(null, data);
        })
        .catch(function(error) {
            if (error) {
                let {code, message} = error;
                const codes = ['auth/wrong-password', 'auth/user-not-found'];
                if (codes.includes(code)) {
                    code = 'unauthorized';
                    message = 'Invalid email and password combination';
                }
                return callback({code, message});
            } else {
                return callback(null, data);
            }
        });
}

const generateToken = (data, callback) => {
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
