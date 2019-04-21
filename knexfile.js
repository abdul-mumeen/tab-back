require('dotenv').config()

module.exports = {
  [process.env.NODE_ENV]: {
    client: 'pg',
    connection: {
      database: process.env.TESSELLATION_DB_NAME,
      user: process.env.TESSELLATION_DB_USER,
      password: process.env.TESSELLATION_DB_PASSWORD,
      host: process.env.TESSELLATION_DB_HOST
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
}
