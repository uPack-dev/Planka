/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('config', (table) => {
    /* Columns */
    table.boolean('google_drive_enabled').notNullable().defaultTo(false);
    table.text('google_drive_client_id');
    table.text('google_drive_client_secret_encrypted');
    table.text('google_drive_picker_api_key');
    table.text('google_drive_picker_app_id');
    table.text('google_drive_scopes');
  });

  return knex.schema.alterTable('config', (table) => {
    table.boolean('google_drive_enabled').notNullable().alter();
  });
};

exports.down = (knex) =>
  knex.schema.alterTable('config', (table) => {
    table.dropColumn('google_drive_enabled');
    table.dropColumn('google_drive_client_id');
    table.dropColumn('google_drive_client_secret_encrypted');
    table.dropColumn('google_drive_picker_api_key');
    table.dropColumn('google_drive_picker_app_id');
    table.dropColumn('google_drive_scopes');
  });
