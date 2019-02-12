const fs = require('fs');
const path = require('path');

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

module.exports = {
    createRoute
};
