const express = require('express');

const constants = require('./constants');
const config = require('./src/config');
const logger = require('./src/utils/logger');


function start() {
    config(express(), express.Router(), (app) => {
        app.listen(constants.PORT, (err) => {
            if (err) {
                process.exit(1);
            } else {
                logger.info('Server started', {
                    PORT: constants.PORT,
                });
            }
        });
    });
}

start();
