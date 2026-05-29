/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('board', (table) => {
    table.boolean('is_template').notNullable().defaultTo(false);
  });

  await knex.schema.createTable('board_template', (table) => {
    /* Columns */

    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

    table.bigInteger('board_id').notNullable().unique();
    table.bigInteger('creator_user_id').notNullable();

    table.text('name').notNullable();

    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    /* Indexes */

    table.index('creator_user_id');
  });

  return knex.schema.alterTable('board', (table) => {
    table.boolean('is_template').notNullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('board_template');

  return knex.schema.alterTable('board', (table) => {
    table.dropColumn('is_template');
  });
};
