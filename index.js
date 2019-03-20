// Library Import
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Controller Imports
// const basicController = require('./api/controllers/basic-controller');
const routes = require('./src/routes');

const corsOptions = {
    origin: '*',
};

const app = express();
const router = express.Router();

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, './tab-front/dist/ext')));
// basicController(app);
routes.routesV1(app, router);

const {PORT=9000} = process.env;

app.listen(PORT, () => {
    console.log('listening on port 8080');
});
