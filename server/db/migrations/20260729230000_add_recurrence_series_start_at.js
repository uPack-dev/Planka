/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('card', 'recurrence_series_start_at'))) {
    await knex.schema.alterTable('card', (table) => {
      table.timestamp('recurrence_series_start_at', true);
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('card', 'recurrence_series_start_at')) {
    await knex.schema.alterTable('card', (table) => {
      table.dropColumn('recurrence_series_start_at');
    });
  }
};
