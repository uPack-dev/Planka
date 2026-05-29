/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
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
    boardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, project } = await sails.helpers.boards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (currentUser.role !== User.Roles.ADMIN && !isProjectManager) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    if (sails.helpers.boards.isReadOnly(project, board)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const { board: templateBoard } = await sails.helpers.boards.duplicateOne.with({
      project,
      record: board,
      values: {
        project,
        name: board.name,
        isTemplate: true,
      },
      actorUser: currentUser,
      copyBoardMemberships: false,
      copyCardMemberships: false,
      copyAttachments: false,
      skipCardEvents: true,
      skipEvents: true,
      detachBaseCustomFieldGroups: true,
      request: this.req,
    });

    const boardTemplate = await BoardTemplate.qm.createOne({
      name: board.name,
      boardId: templateBoard.id,
      creatorUserId: currentUser.id,
    });

    return {
      item: boardTemplate,
    };
  },
};
