/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  BOARD_TEMPLATE_NOT_FOUND: {
    boardTemplateNotFound: 'Board template not found',
  },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    templateId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    projectNotFound: {
      responseType: 'notFound',
    },
    boardTemplateNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    const isAdminWithAccess =
      currentUser.role === User.Roles.ADMIN && !project.ownerProjectManagerId;

    if (!isProjectManager && !isAdminWithAccess) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    if (project.isArchived) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const boardTemplate = await BoardTemplate.qm.getOneById(inputs.templateId);

    if (!boardTemplate) {
      throw Errors.BOARD_TEMPLATE_NOT_FOUND;
    }

    const templateBoard = await Board.qm.getOneById(boardTemplate.boardId, {
      withTemplate: true,
    });

    if (!templateBoard || !templateBoard.isTemplate) {
      throw Errors.BOARD_TEMPLATE_NOT_FOUND;
    }

    const templateProject = await Project.qm.getOneById(templateBoard.projectId);

    if (!templateProject) {
      throw Errors.BOARD_TEMPLATE_NOT_FOUND;
    }

    const {
      board,
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
      project: templateProject,
      record: templateBoard,
      values: {
        project,
        position: inputs.position,
        name: inputs.name,
      },
      actorUser: currentUser,
      copyBoardMemberships: false,
      copyCardMemberships: false,
      copyAttachments: false,
      skipCardEvents: true,
      detachBaseCustomFieldGroups: true,
      request: this.req,
    });

    return {
      item: board,
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
