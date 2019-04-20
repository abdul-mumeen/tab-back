const fs = require('fs');
const path = require('path');
const constants = require('../../constants');

const routeHandler = (routes, service, router) => {
    const routeIterator = routes.entries();
    for (let route of routeIterator) {
      router[route[1][0]](`/${service}${route[1][1]}`, ...route[1].slice(2));
    }
}
  
const servicePath = path.resolve(__dirname, '../services');

// Version 1 routes
const routesV1 = (app, router) => {
    const BASE = '/api/v1';
    const services = fs.readdirSync(servicePath);
    services.forEach((service) => {
        routeHandler(require(`../services/${service}/routes/index.js`), service, router);
        
    });
    app.use(BASE, router);

    if (process.env.NODE_ENV === constants.PRODUCTION) {
        app.use('*', (req, res) => {
            return res.sendFile(path.resolve(__dirname, '../../tab-front/dist/ext/index.html'));
        });
    }
}
    

module.exports = {
    routesV1
};
