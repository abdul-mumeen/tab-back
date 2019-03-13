// Library Import
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Controller Imports
const basicController = require('./api/controllers/basic-controller');

const corsOptions = {
    origin: '*',
};

const app = express();

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

basicController(app);

const {PORT=7000} = process.env.PORT;

app.listen(PORT, () => {
    console.log('listening on port 8080');
});
