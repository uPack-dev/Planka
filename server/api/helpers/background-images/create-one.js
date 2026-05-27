/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    requestId: {
      type: 'string',
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const backgroundImage = await BackgroundImage.qm.createOne({
      ...values,
      projectId: values.project.id,
    });

    const scoper = sails.helpers.projects.makeScoper.with({
      record: values.project,
    });

    const projectRelatedUserIds = await scoper.getProjectRelatedUserIds();

    projectRelatedUserIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'backgroundImageCreate',
        {
          item: sails.helpers.backgroundImages.presentOne(backgroundImage),
          requestId: inputs.requestId,
        },
        inputs.request,
      );
    });

    const webhooks = await Webhook.qm.getAll();

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.BACKGROUND_IMAGE_CREATE,
      buildData: () => ({
        item: sails.helpers.backgroundImages.presentOne(backgroundImage),
        included: {
          projects: [values.project],
        },
      }),
      user: inputs.actorUser,
    });

    const target = values.target || 'background';
    const projectValues = {};

    if (target === 'background' || target === 'both') {
      Object.assign(projectValues, {
        backgroundImage,
        backgroundType: Project.BackgroundTypes.IMAGE,
      });
    }

    if (target === 'cover' || target === 'both') {
      Object.assign(projectValues, {
        coverBackgroundImage: backgroundImage,
        coverBackgroundType: Project.BackgroundTypes.IMAGE,
      });
    }

    await sails.helpers.projects.updateOne.with({
      scoper,
      webhooks,
      record: values.project,
      values: projectValues,
      actorUser: inputs.actorUser,
    });

    return backgroundImage;
  },
};
