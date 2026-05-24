/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('google_drive_credential', (table) => {
    /* Columns */

    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

    table.bigInteger('user_id').notNullable().unique();
    table.text('refresh_token_encrypted').notNullable();
    table.text('scope');
    table.text('token_type');
    table.timestamp('expiry_date', true);

    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);
  });
};

exports.down = async (knex) => knex.schema.dropTable('google_drive_credential');
