const fs = require('fs');
const path = require('path');
const async = require('async');
const firebase = require('firebase');

require('dotenv').config();


const createRoute = (routes) => {
    const controllerPath = path.join(path.dirname(module.parent.filename), '../controllers');
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

const createController = (waterfall) => {
    const {
        API_KEY,
        AUTH_DOMAIN,
        DATABASE_URL,
        PROJECT_ID,
        STORAGE_BUCKET,
        MESSANGING_SENDER_ID
    } = process.env;

    const config = {
        apiKey: API_KEY,
        authDomain: AUTH_DOMAIN,
        databaseURL: DATABASE_URL,
        projectId: PROJECT_ID,
        storageBucket: STORAGE_BUCKET,
        messagingSenderId: MESSANGING_SENDER_ID
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(config);
    }

    return (req, res) => {
        console.log(`START: [${req.method}]`, req.originalUrl);
        const unfoldWaterfall = waterfall.map((fn, index) => {
            return (...args) => {
                console.log(index !== waterfall.length - 1 
                    ? `\tRunning block: ${fn.name}`
                    : `DONE: [${req.method}]  ${req.originalUrl}`, 
                );
                fn(...args);
            }
        });

        unfoldWaterfall[0] = async.apply(unfoldWaterfall[0], req, res, firebase);

        // Do Async Op
        async.waterfall(
            unfoldWaterfall.slice(0, -1),
            unfoldWaterfall.slice(-1)[0]
        );
    }
}


module.exports = {
    createRoute,
    response,
    createController
};
