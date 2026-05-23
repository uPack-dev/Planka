/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = (knex) =>
  knex.schema.alterTable('card', (table) => {
    /* Columns */

    table.timestamp('start_date', true);
    table.timestamp('end_date', true);
    table.boolean('is_all_day').notNullable().defaultTo(true);
    table.text('recurrence_rule');
    table.timestamp('recurrence_until', true);
    table.text('recurrence_timezone');

    /* Indexes */

    table.index(['board_id', 'start_date'], 'card_board_id_start_date_index');
    table.index(['board_id', 'end_date'], 'card_board_id_end_date_index');
    table.index(['board_id', 'recurrence_until'], 'card_board_id_recurrence_until_index');
  });

exports.down = (knex) =>
  knex.schema.alterTable('card', (table) => {
    table.dropIndex(['board_id', 'recurrence_until'], 'card_board_id_recurrence_until_index');
    table.dropIndex(['board_id', 'end_date'], 'card_board_id_end_date_index');
    table.dropIndex(['board_id', 'start_date'], 'card_board_id_start_date_index');

    table.dropColumn('recurrence_timezone');
    table.dropColumn('recurrence_until');
    table.dropColumn('recurrence_rule');
    table.dropColumn('is_all_day');
    table.dropColumn('end_date');
    table.dropColumn('start_date');
  });
