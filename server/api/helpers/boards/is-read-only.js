/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  inputs: {
    project: {
      type: 'ref',
      required: true,
    },
    record: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    return inputs.project.isArchived || inputs.record.isArchived;
  },
};
