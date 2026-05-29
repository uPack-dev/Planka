/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_TEMPLATE_NOT_FOUND: {
    boardTemplateNotFound: 'Board template not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    boardTemplateNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (currentUser.role !== User.Roles.ADMIN) {
      const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);

      if (managerProjectIds.length === 0) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }
    }

    const boardTemplate = await BoardTemplate.qm.getOneById(inputs.id);

    if (!boardTemplate) {
      throw Errors.BOARD_TEMPLATE_NOT_FOUND;
    }

    const templateBoard = await Board.qm.getOneById(boardTemplate.boardId, {
      withTemplate: true,
    });

    await BoardTemplate.qm.deleteOne(inputs.id);

    if (templateBoard && templateBoard.isTemplate) {
      await sails.helpers.boards.deleteRelated(templateBoard);
      await Board.qm.deleteOne(templateBoard.id);
    }

    return {
      item: boardTemplate,
    };
  },
};
