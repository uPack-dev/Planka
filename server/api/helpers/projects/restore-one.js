/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    if (!inputs.record.isArchived) {
      return inputs.record;
    }

    const project = await Project.qm.updateOne(inputs.record.id, {
      isArchived: false,
      archivedAt: null,
      archivedByUserId: null,
    });

    if (!project) {
      return project;
    }

    const scoper = sails.helpers.projects.makeScoper.with({
      record: project,
    });

    const projectRelatedUserIds = await scoper.getProjectRelatedUserIds();

    projectRelatedUserIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'projectRestore',
        {
          item: project,
        },
        inputs.request,
      );
    });

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.PROJECT_RESTORE,
      buildData: () => ({
        item: project,
      }),
      buildPrevData: () => ({
        item: inputs.record,
      }),
      user: inputs.actorUser,
    });

    return project;
  },
};
