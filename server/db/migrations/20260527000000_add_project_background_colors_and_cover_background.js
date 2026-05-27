/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = (knex) =>
  knex.schema.alterTable('project', (table) => {
    /* Columns */

    table.text('background_color');
    table.text('cover_background_type');
    table.text('cover_background_gradient');
    table.bigInteger('cover_background_image_id');
    table.text('cover_background_color');
  });

exports.down = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.dropColumn('background_color');
    table.dropColumn('cover_background_type');
    table.dropColumn('cover_background_gradient');
    table.dropColumn('cover_background_image_id');
    table.dropColumn('cover_background_color');
  });
