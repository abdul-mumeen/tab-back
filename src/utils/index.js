const fs = require('fs');
const path = require('path');
const async = require('async');
const firebase = require('firebase');

const constants = require('../../constants');
const systemdbOptions = require('../../knexfile');
require('dotenv').config();


let knex = {};

if (process.env.NODE_ENV === 'development') {
    const mysqlOpts = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
    };

    knex = require('knex')({
        client: 'mysql',
        connection: mysqlOpts
    });
}

const systemdb = require('knex')(systemdbOptions[process.env.NODE_ENV]);

const createRoute = (routes, serviceName) => {
    const controllerPath = path.join(__dirname, `../services/${serviceName}/controllers`);
    const files = fs.readdirSync(controllerPath);

    const controller = files.reduce((acc, file) => {
        if (file.slice(-3) === '.js' && !file.match('index')) {
            acc[file.slice(0, -3)] = require(`${controllerPath}/${file}`);
        }
        return acc;
    }, {});

    return routes.map(route => {
        route[route.length - 1] = controller[route[route.length - 1]];
        return route;
    });
}

const response = {
    error: (res, data, code=500, message='An unexpected error occured and your requesat could not be completed') => {
        return res.status(code).json({
            status: {
                error: true,
            },
            data
        });
    },
    conflict: (res, data) => {
        return res.status(409).json({
            status: {
                error: true,
            },
            data
        });
    },
    created: (res, data) => {
        return res.status(201).json({
            status: {
                success: true
            },
            data
        });
    },
    ok: (res, data, metadata) => {
        return res.status(200).json({
            status: {
                success: true
            },
            data,
            metadata
        });
    },
    unauthorized: (res, data) => {
        return res.status(401).json({
            status: {
                error: true,
                message: 'You are not authorized to access this resource'
            },
            data
        });
    },
    forbidden: (res, data) => {
        return res.status(403).json({
            status: {
                error: true,
                message: 'You do not have necessary permissions to access this resource'
            },
            data
        });
    }
}

module.exports = {
    createRoute,
    response,
    createController,
    knex,
    systemdb,
};
