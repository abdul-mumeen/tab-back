require('dotenv').config();

module.exports = {
    GENERIC_ERROR: 'Some error occured and your request cannot be processed at this time',
    GENERIC_LEVEL_ERROR: 'Controller Level error',
    PRODUCTION: 'PRODUCTION',
    PORT: process.env.PORT || 9000,
}