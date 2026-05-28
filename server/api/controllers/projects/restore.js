/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
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
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let project = await Project.qm.getOneById(inputs.id);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    const isAdminWithAccess =
      currentUser.role === User.Roles.ADMIN && !project.ownerProjectManagerId;

    if (!isProjectManager && !isAdminWithAccess) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    project = await sails.helpers.projects.restoreOne.with({
      record: project,
      actorUser: currentUser,
      request: this.req,
    });

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    return {
      item: project,
    };
  },
};
