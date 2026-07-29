/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = (knex) =>
  knex.schema.alterTable('card', (table) => {
    table.bigInteger('recurrence_series_id');
    table.timestamp('recurrence_occurrence_at', true);
    table.timestamp('recurrence_next_at', true);

    table.index(['recurrence_next_at'], 'card_recurrence_next_at_index');
    table.unique(
      ['recurrence_series_id', 'recurrence_occurrence_at'],
      'card_recurrence_series_id_occurrence_at_unique',
    );
  });

exports.down = (knex) =>
  knex.schema.alterTable('card', (table) => {
    table.dropUnique(
      ['recurrence_series_id', 'recurrence_occurrence_at'],
      'card_recurrence_series_id_occurrence_at_unique',
    );
    table.dropIndex(['recurrence_next_at'], 'card_recurrence_next_at_index');

    table.dropColumn('recurrence_next_at');
    table.dropColumn('recurrence_occurrence_at');
    table.dropColumn('recurrence_series_id');
  });
