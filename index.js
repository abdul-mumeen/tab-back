// Library Import
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Controller Imports
const basicController = require('./api/controllers/basic-controller');
const routes = require('./src/routes');

const corsOptions = {
    origin: '*',
};

const app = express();
const router = express.Router();

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// basicController(app);
routes.routesV1(app, router);

app.listen(7000, () => {
    console.log('listening on port 8080');
});
