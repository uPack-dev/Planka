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
    project: {
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

    const board = await Board.qm.updateOne(inputs.record.id, {
      isArchived: false,
      archivedAt: null,
      archivedByUserId: null,
    });

    if (!board) {
      return board;
    }

    const scoper = sails.helpers.projects.makeScoper.with({
      record: inputs.project,
      board,
    });

    const boardRelatedUserIds = await scoper.getBoardRelatedUserIds();

    boardRelatedUserIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'boardRestore',
        {
          item: board,
        },
        inputs.request,
      );
    });

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.BOARD_RESTORE,
      buildData: () => ({
        item: board,
        included: {
          projects: [inputs.project],
        },
      }),
      buildPrevData: () => ({
        item: inputs.record,
      }),
      user: inputs.actorUser,
    });

    return board;
  },
};
