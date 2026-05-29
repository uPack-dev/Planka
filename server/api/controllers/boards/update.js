/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /boards/{id}:
 *   patch:
 *     summary: Update board
 *     description: Updates a board. Project managers can update all fields, board members can only subscribe/unsubscribe.
 *     tags:
 *       - Boards
 *     operationId: updateBoard
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the board to update
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: ID of the project to move the board to
 *                 example: "1357158568008091264"
 *               position:
 *                 type: number
 *                 minimum: 0
 *                 description: Position of the board within the project
 *                 example: 65536
 *               name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Name/title of the board
 *                 example: Development Board
 *               defaultView:
 *                 type: string
 *                 enum: [kanban, grid, list]
 *                 description: Default view for the board
 *                 example: kanban
 *               defaultCardType:
 *                 type: string
 *                 enum: [project, story]
 *                 description: Default card type for new cards
 *                 example: project
 *               limitCardTypesToDefaultOne:
 *                 type: boolean
 *                 description: Whether to limit card types to default one
 *                 example: false
 *               alwaysDisplayCardCreator:
 *                 type: boolean
 *                 description: Whether to always display card creators
 *                 example: false
 *               displayCardAges:
 *                 type: boolean
 *                 description: Whether to display card ages
 *                 example: false
 *               expandTaskListsByDefault:
 *                 type: boolean
 *                 description: Whether to expand task lists by default
 *                 example: false
 *               isSubscribed:
 *                 type: boolean
 *                 description: Whether the current user is subscribed to the board
 *                 example: true
 *     responses:
 *       200:
 *         description: Board updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Board'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    projectId: idInput,
    position: {
      type: 'number',
      min: 0,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 128,
    },
    defaultView: {
      type: 'string',
      isIn: Object.values(Board.Views),
    },
    defaultCardType: {
      type: 'string',
      isIn: Object.values(Card.Types),
    },
    limitCardTypesToDefaultOne: {
      type: 'boolean',
    },
    alwaysDisplayCardCreator: {
      type: 'boolean',
    },
    displayCardAges: {
      type: 'boolean',
    },
    expandTaskListsByDefault: {
      type: 'boolean',
    },
    isSubscribed: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    boardNotFound: {
      responseType: 'notFound',
    },
    projectNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const pathToProject = await sails.helpers.boards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    let { board } = pathToProject;
    const { project } = pathToProject;

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    const isBoardMember = await sails.helpers.users.isBoardMember(currentUser.id, board.id);

    if (!isProjectManager && !isBoardMember) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    if (sails.helpers.boards.isReadOnly(project, board)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let nextProject;
    if (!_.isUndefined(inputs.projectId)) {
      if (!isProjectManager) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }

      nextProject = await Project.qm.getOneById(inputs.projectId);

      if (!nextProject) {
        throw Errors.PROJECT_NOT_FOUND;
      }

      const isNextProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        nextProject.id,
      );

      if (!isNextProjectManager) {
        throw Errors.PROJECT_NOT_FOUND; // Forbidden
      }

      if (nextProject.isArchived) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }
    }

    const availableInputKeys = ['id'];
    if (isProjectManager) {
      availableInputKeys.push(
        'projectId',
        'position',
        'name',
        'defaultView',
        'defaultCardType',
        'limitCardTypesToDefaultOne',
        'alwaysDisplayCardCreator',
        'displayCardAges',
        'expandTaskListsByDefault',
      );
    }
    if (isBoardMember) {
      availableInputKeys.push('isSubscribed');
    }

    if (_.difference(Object.keys(inputs), availableInputKeys).length > 0) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
      'projectId',
      'position',
      'name',
      'defaultView',
      'defaultCardType',
      'limitCardTypesToDefaultOne',
      'alwaysDisplayCardCreator',
      'displayCardAges',
      'expandTaskListsByDefault',
      'isSubscribed',
    ]);

    const helperValues = nextProject
      ? {
          ...values,
          project: nextProject,
        }
      : values;

    board = await sails.helpers.boards.updateOne.with({
      values: helperValues,
      project,
      record: board,
      actorUser: currentUser,
      request: this.req,
    });

    if (!board) {
      throw Errors.BOARD_NOT_FOUND;
    }

    return {
      item: board,
    };
  },
};
