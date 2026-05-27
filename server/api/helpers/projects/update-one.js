/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const normalizeHexColor = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const color = value.trim();

  if (!HEX_COLOR_REGEX.test(color)) {
    return null;
  }

  const hex = color.slice(1);

  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
      .toUpperCase()}`;
  }

  return color.toUpperCase();
};

const BACKGROUND_FIELD_SETS = [
  {
    type: 'backgroundType',
    gradient: 'backgroundGradient',
    image: 'backgroundImage',
    imageId: 'backgroundImageId',
    color: 'backgroundColor',
  },
  {
    type: 'coverBackgroundType',
    gradient: 'coverBackgroundGradient',
    image: 'coverBackgroundImage',
    imageId: 'coverBackgroundImageId',
    color: 'coverBackgroundColor',
  },
];

const normalizeBackgroundValues = (record, values, fields) => {
  if (values[fields.image]) {
    values[fields.imageId] = values[fields.image].id; // eslint-disable-line no-param-reassign
  }

  const backgroundType = _.isUndefined(values[fields.type])
    ? record[fields.type]
    : values[fields.type];

  if (_.isNull(backgroundType)) {
    Object.assign(values, {
      [fields.imageId]: null,
      [fields.gradient]: null,
      [fields.color]: null,
    });

    return;
  }

  if (backgroundType === Project.BackgroundTypes.GRADIENT) {
    const backgroundGradient = _.isUndefined(values[fields.gradient])
      ? record[fields.gradient]
      : values[fields.gradient];

    if (!backgroundGradient) {
      throw 'backgroundGradientInValuesMustBePresent';
    }

    Object.assign(values, {
      [fields.imageId]: null,
      [fields.color]: null,
    });

    return;
  }

  if (backgroundType === Project.BackgroundTypes.IMAGE) {
    const backgroundImageId = _.isUndefined(values[fields.imageId])
      ? record[fields.imageId]
      : values[fields.imageId];

    if (!backgroundImageId) {
      throw 'backgroundImageInValuesMustBePresent';
    }

    Object.assign(values, {
      [fields.gradient]: null,
      [fields.color]: null,
    });

    return;
  }

  if (backgroundType === Project.BackgroundTypes.COLOR) {
    const backgroundColor = _.isUndefined(values[fields.color])
      ? record[fields.color]
      : values[fields.color];

    if (!backgroundColor) {
      throw 'backgroundColorInValuesMustBePresent';
    }

    const normalizedBackgroundColor = normalizeHexColor(backgroundColor);

    if (!normalizedBackgroundColor) {
      throw 'backgroundColorInValuesMustBeValid';
    }

    Object.assign(values, {
      [fields.imageId]: null,
      [fields.gradient]: null,
      [fields.color]: normalizedBackgroundColor,
    });
  }
};

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    values: {
      type: 'json',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    scoper: {
      type: 'ref',
    },
    webhooks: {
      type: 'ref',
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    ownerProjectManagerInValuesMustBeLastManager: {},
    backgroundImageInValuesMustBePresent: {},
    backgroundGradientInValuesMustBePresent: {},
    backgroundColorInValuesMustBePresent: {},
    backgroundColorInValuesMustBeValid: {},
    alreadyHasOwnerProjectManager: {},
  },

  // TODO: use normalizeValues
  async fn(inputs) {
    const { isFavorite, ...values } = inputs.values;

    if (values.ownerProjectManager) {
      if (inputs.record.ownerProjectManagerId) {
        if (values.ownerProjectManager.id === inputs.record.ownerProjectManagerId) {
          delete values.ownerProjectManager;
        } else {
          throw 'alreadyHasOwnerProjectManager';
        }
      } else {
        const projectManagersLeft = await sails.helpers.projects.getProjectManagersTotalById(
          inputs.record.id,
          values.ownerProjectManager.id,
        );

        if (projectManagersLeft > 0) {
          throw 'ownerProjectManagerInValuesMustBeLastManager';
        }

        values.ownerProjectManagerId = values.ownerProjectManager.id;
      }
    }

    BACKGROUND_FIELD_SETS.forEach((fields) => {
      normalizeBackgroundValues(inputs.record, values, fields);
    });

    let project;
    if (_.isEmpty(values)) {
      project = inputs.record;
    } else {
      project = await Project.qm.updateOne(inputs.record.id, values);

      if (!project) {
        return project;
      }

      const {
        scoper = sails.helpers.projects.makeScoper.with({
          record: project,
        }),
      } = inputs;

      const projectRelatedUserIds = await scoper.getProjectRelatedUserIds();

      if (values.ownerProjectManager) {
        const boardIds = await sails.helpers.projects.getBoardIdsById(project.id);

        const prevScoper = scoper.cloneForProject(inputs.record);
        const adminUserIds = await prevScoper.getAdminUserIds();
        const projectManagerUserIds = await prevScoper.getProjectManagerUserIds();
        const boardMemberships = await prevScoper.getBoardMembershipsForWholeProject();

        const nonProjectManagerAdminUserIds = _.difference(adminUserIds, projectManagerUserIds);

        const boardMemberUserIdsByBoardId = boardMemberships.reduce(
          (result, boardMembership) => ({
            ...result,
            [boardMembership.boardId]: [
              ...(result[boardMembership.boardId] || []),
              boardMembership.userId,
            ],
          }),
          {},
        );

        boardIds.forEach((boardId) => {
          const missingUserIds = _.difference(
            nonProjectManagerAdminUserIds,
            boardMemberUserIdsByBoardId[boardId] || [],
          );

          missingUserIds.forEach((userId) => {
            sails.sockets.removeRoomMembersFromRooms(`@user:${userId}`, `board:${boardId}`);
          });
        });

        const projectRelatedUserIdsSet = new Set(projectRelatedUserIds);
        const prevProjectRelatedUserIds = await prevScoper.getProjectRelatedUserIds();

        const missingProjectRelatedUserIds = prevProjectRelatedUserIds.filter(
          (userId) => !projectRelatedUserIdsSet.has(userId),
        );

        missingProjectRelatedUserIds.forEach((userId) => {
          sails.sockets.broadcast(
            `user:${userId}`,
            'projectUpdate',
            {
              item: _.pick(project, ['id', 'ownerProjectManagerId']),
            },
            inputs.request,
          );
        });
      }

      projectRelatedUserIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'projectUpdate',
          {
            item: project,
          },
          inputs.request,
        );
      });

      const { webhooks = await Webhook.qm.getAll() } = inputs;

      sails.helpers.utils.sendWebhooks.with({
        webhooks,
        event: Webhook.Events.PROJECT_UPDATE,
        buildData: () => ({
          item: project,
        }),
        buildPrevData: () => ({
          item: inputs.record,
        }),
        user: inputs.actorUser,
      });
    }

    if (!_.isUndefined(isFavorite)) {
      const wasFavorite = await sails.helpers.users.isProjectFavorite(
        inputs.actorUser.id,
        project.id,
      );

      if (isFavorite !== wasFavorite) {
        if (isFavorite) {
          try {
            await ProjectFavorite.qm.createOne({
              projectId: project.id,
              userId: inputs.actorUser.id,
            });
          } catch (error) {
            if (error.code !== 'E_UNIQUE') {
              throw error;
            }
          }
        } else {
          await ProjectFavorite.qm.deleteOne({
            projectId: project.id,
            userId: inputs.actorUser.id,
          });
        }

        sails.sockets.broadcast(
          `user:${inputs.actorUser.id}`,
          'projectUpdate',
          {
            item: {
              isFavorite,
              id: project.id,
            },
          },
          inputs.request,
        );

        // TODO: send webhooks
      }
    }

    return project;
  },
};
