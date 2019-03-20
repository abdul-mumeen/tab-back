const fs = require('fs');
const path = require('path');
const async = require('async');
const firebase = require('firebase');
require('dotenv').config();

const mysqlOpts = {
    user : 'tess',
    password : 'tess3035',
    database : 'tessallation2',
    host: 'tessallation2.co3ttfh6yi8j.us-east-2.rds.amazonaws.com',
    // port: '3306',
};

const db = require('mysql').createConnection(mysqlOpts);

db.connect(err => {
    if (err) console.error(err);
});

// const knex = require('knex')({
//     client: 'mysql',
//     version: '8',
//     connection: {
//         host : '127.0.0.1',
//         user : 'root',
//         password : '0987654321',
//         database : 'tabby'
//     }
// });

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

const createController = (waterfall) => {
    const errorMessage = 'Some error occured and your request cannot be processed at this time';
    try {
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

                    try {
                        fn(...args);
                    } catch (e) {
                        global.console.error('CODE ERROR', e);
                        return response.error(res, {
                            message: errorMessage
                        });
                    }
                }
            });
    
            unfoldWaterfall[0] = async.apply(unfoldWaterfall[0], req, res, {firebase, db });
    
            // Do Async Op
            async.waterfall(
                unfoldWaterfall.slice(0, -1),
                unfoldWaterfall.slice(-1)[0]
            );
        }
    } catch (e) {
        global.console.error('CODE ERROR', e);
        return response.error(res, {
            message: errorMessage
        });
    }
}

function listTables() {
    let query =  '';
    let bindings = [];

    switch(knex.client.constructor.name) {
        case 'Client_MSSQL':
            query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_catalog = ?',
            bindings = [ knex.client.database() ];
            break;
        case 'Client_MySQL':
        case 'Client_MySQL2':
            query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ?';
            bindings = [ knex.client.database() ];
            break;
        case 'Client_Oracle':
        case 'Client_Oracledb':
            query = 'SELECT table_name FROM user_tables';
            break;
        case 'Client_PG':
            query =  'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_catalog = ?';
            bindings = [ knex.client.database() ];
            break;
        case 'Client_SQLite3':
            query = "SELECT name AS table_name FROM sqlite_master WHERE type='table'";
            break;
    }

    return knex.raw(query, bindings).then(function(results) {
        return results.rows.map((row) => row.table_name);
    });
}

module.exports = {
    createRoute,
    response,
    createController,
    listTables
};
