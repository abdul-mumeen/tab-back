
exports.up = function(knex, Promise) {
    return knex.schema.createTable(('tessellation_connections'), function (table) {
        table.increments();
        table.json('connection').notNull();
        table.string('connection_id').unique().notNull();
        table.string('created_by').notNull();
        table.string('client').notNull();
        table.timestamps();
  });
};

exports.down = function(knex, Promise) {
    knex.schema.dropTable('tessellation_connections');
};
