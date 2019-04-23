const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const express = require('express');

const routes = require('./routes');
const constants = require('../constants');


module.exports = (app, router, callback) => {
    // CORS Setup
    const corsOptions = {
        origin: '*',
    };
    app.use(cors(corsOptions));

    // body parser
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    // Serve frontend
    if (process.env.NODE_ENV.toUpperCase() === constants.PRODUCTION) {
        app.use(express.static(path.resolve(__dirname, '../tab-front/dist/ext')));
    }

    // Routes config
    routes.routesV1(app, router);

    return callback(app);
}
