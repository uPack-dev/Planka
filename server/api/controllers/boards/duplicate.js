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
      allowNull: true,
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

    const { board, project } = await sails.helpers.boards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    if (sails.helpers.boards.isReadOnly(project, board)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let nextProject = project;

    if (!_.isUndefined(inputs.projectId)) {
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
    }

    if (nextProject.isArchived) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, ['position', 'name']);

    const {
      board: nextBoard,
      boardMemberships,
      labels,
      lists,
      cards,
      cardMemberships,
      cardLabels,
      taskLists,
      tasks,
      attachments,
      customFieldGroups,
      customFields,
      customFieldValues,
    } = await sails.helpers.boards.duplicateOne.with({
      project,
      record: board,
      values: {
        ...values,
        project: nextProject,
      },
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: nextBoard,
      included: {
        boardMemberships,
        labels,
        lists,
        cards,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        customFieldGroups,
        customFields,
        customFieldValues,
        attachments: sails.helpers.attachments.presentMany(attachments),
      },
    };
  },
};
