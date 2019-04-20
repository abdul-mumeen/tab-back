const path = require('path');
const winston = require('winston');

const errorStackTracerFormat = winston.format(info => {
    if (info.meta && info.meta instanceof Error) {
        info.message = `${info.message} ${info.meta.stack}`;
    }
    return info;
});

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.splat(), // Necessary to produce the 'meta' attribute
        errorStackTracerFormat(),
        winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ssss'}),
        winston.format.json({ space: 4 }),
    ),
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({filename: path.resolve(__dirname, '../logs/controller.log')}),
    ],
});

logger.err = (error, ...args) => {
    const errorObj = {
        code: error.code,
        trace: error.trace,
    };

    args.push(error.message);
    return logger.error(...args, errorObj);
}

module.exports = logger;
