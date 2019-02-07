const mysql = require('mysql');


const mysqlOpts = {
    user: 'joshua',
    password: 'password',
    database: 'tabby',
    host: 'localhost',
    port: '3306',
};

const db = mysql.createConnection(mysqlOpts);

db.connect(err => {
    if (err) console.error(err);
});


module.exports = function (app) {
    app.post('/record', (req, res) => {
        let query = `INSERT INTO users (name , age, favorite_animal) values ('${req.body.name}', ${req.body.age}, '${req.body.favoriteAnimal}')`;

        console.log('post record');

        db.query(query, (err, result) =>{
            if(err) {
                res.status(500).send(err);
            } else {
                res.json(result);
            }
        })
    });

    app.post('/table', (req, res) => {
        const body = req.body;
        const generateFields = (fields) => {
            return fields.map((field) => {
                let type = ((type)=>{
                    switch (type) {
                        case 'VARCHAR':
                            return 'VARCHAR(255)';
                        default:
                            return type;
                    }
                })(field.type);
                return `${field.name} ${type}`
            }).join(',\n');
        };

        let query = `CREATE TABLE ${body.tableName} (\nid INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n${generateFields(body.fields)}\n)`;
        console.log('Post table');

        db.query(query, (err, result) => {
            if(err) return res.status(500).send(err);

            return res.json(result);
        })

    })
};
