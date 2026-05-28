/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.boolean('is_archived').notNullable().defaultTo(false);
    table.timestamp('archived_at', true);
    table.bigInteger('archived_by_user_id');
  });

  await knex.schema.alterTable('board', (table) => {
    table.boolean('is_archived').notNullable().defaultTo(false);
    table.timestamp('archived_at', true);
    table.bigInteger('archived_by_user_id');
  });

  await knex.schema.alterTable('project', (table) => {
    table.boolean('is_archived').notNullable().alter();
  });

  return knex.schema.alterTable('board', (table) => {
    table.boolean('is_archived').notNullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('board', (table) => {
    table.dropColumn('archived_by_user_id');
    table.dropColumn('archived_at');
    table.dropColumn('is_archived');
  });

  return knex.schema.alterTable('project', (table) => {
    table.dropColumn('archived_by_user_id');
    table.dropColumn('archived_at');
    table.dropColumn('is_archived');
  });
};
