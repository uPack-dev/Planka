/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { POSITION_GAP } = require('../../../constants');

const getNextPosition = (positionables) => {
  const lastPositionable = _.last(positionables);
  return lastPositionable ? lastPositionable.position + POSITION_GAP : POSITION_GAP;
};

const copyBoardCustomFields = async (
  fromBoard,
  toBoard,
  fromProject,
  toProject,
  detachBaseCustomFieldGroups,
) => {
  const customFieldGroups = await CustomFieldGroup.qm.getByBoardId(fromBoard.id);

  if (customFieldGroups.length === 0) {
    return {
      customFieldGroups: [],
      customFields: [],
      customFieldGroupIdByCustomFieldGroupId: {},
      customFieldIdByCustomFieldId: {},
    };
  }

  const customFieldGroupIds = sails.helpers.utils.mapRecords(customFieldGroups);
  const customFields = await CustomField.qm.getByCustomFieldGroupIds(customFieldGroupIds);

  const baseCustomFieldGroupIds = sails.helpers.utils.mapRecords(
    customFieldGroups,
    'baseCustomFieldGroupId',
    true,
    true,
  );

  const preserveBaseCustomFieldGroups =
    fromProject.id === toProject.id && !detachBaseCustomFieldGroups;

  const baseCustomFieldGroupsById =
    preserveBaseCustomFieldGroups || baseCustomFieldGroupIds.length === 0
      ? {}
      : _.keyBy(await BaseCustomFieldGroup.qm.getByIds(baseCustomFieldGroupIds), 'id');

  const baseCustomFields =
    preserveBaseCustomFieldGroups || baseCustomFieldGroupIds.length === 0
      ? []
      : await CustomField.qm.getByBaseCustomFieldGroupIds(Object.keys(baseCustomFieldGroupsById));

  const baseCustomFieldsByBaseCustomFieldGroupId = _.groupBy(
    baseCustomFields,
    'baseCustomFieldGroupId',
  );

  const nextBaseCustomFieldsTotal = preserveBaseCustomFieldGroups
    ? 0
    : customFieldGroups.reduce((result, customFieldGroup) => {
        const baseCustomFieldsItem =
          baseCustomFieldsByBaseCustomFieldGroupId[customFieldGroup.baseCustomFieldGroupId];

        return result + (baseCustomFieldsItem ? baseCustomFieldsItem.length : 0);
      }, 0);

  const ids = await sails.helpers.utils.generateIds(
    customFieldGroups.length + customFields.length + nextBaseCustomFieldsTotal,
  );

  const customFieldGroupIdByCustomFieldGroupId = {};
  const nextCustomFieldGroupsValues = customFieldGroups.map((customFieldGroup) => {
    const id = ids.shift();
    customFieldGroupIdByCustomFieldGroupId[customFieldGroup.id] = id;

    const values = {
      ..._.pick(customFieldGroup, ['position', 'name']),
      id,
      boardId: toBoard.id,
    };

    if (preserveBaseCustomFieldGroups) {
      values.baseCustomFieldGroupId = customFieldGroup.baseCustomFieldGroupId;
    } else if (customFieldGroup.baseCustomFieldGroupId && !values.name) {
      const baseCustomFieldGroup =
        baseCustomFieldGroupsById[customFieldGroup.baseCustomFieldGroupId];

      if (baseCustomFieldGroup) {
        values.name = baseCustomFieldGroup.name;
      }
    }

    return values;
  });

  const nextCustomFieldGroups = await CustomFieldGroup.qm.create(nextCustomFieldGroupsValues);

  const customFieldIdByCustomFieldId = {};
  const nextCustomFieldsValues = customFields.map((customField) => {
    const id = ids.shift();
    customFieldIdByCustomFieldId[customField.id] = id;

    return {
      ..._.pick(customField, ['position', 'name', 'showOnFrontOfCard']),
      id,
      customFieldGroupId: customFieldGroupIdByCustomFieldGroupId[customField.customFieldGroupId],
    };
  });

  if (!preserveBaseCustomFieldGroups) {
    customFieldGroups.forEach((customFieldGroup) => {
      const baseCustomFieldsItem =
        baseCustomFieldsByBaseCustomFieldGroupId[customFieldGroup.baseCustomFieldGroupId];

      if (!baseCustomFieldsItem) {
        return;
      }

      baseCustomFieldsItem.forEach((customField) => {
        const id = ids.shift();
        customFieldIdByCustomFieldId[`${customFieldGroup.id}:${customField.id}`] = id;

        nextCustomFieldsValues.push({
          ..._.pick(customField, ['position', 'name', 'showOnFrontOfCard']),
          id,
          customFieldGroupId: customFieldGroupIdByCustomFieldGroupId[customFieldGroup.id],
        });
      });
    });
  }

  const nextCustomFields =
    nextCustomFieldsValues.length > 0 ? await CustomField.qm.create(nextCustomFieldsValues) : [];

  return {
    customFieldGroups: nextCustomFieldGroups,
    customFields: nextCustomFields,
    customFieldGroupIdByCustomFieldGroupId,
    customFieldIdByCustomFieldId,
  };
};

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
    values: {
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
    copyBoardMemberships: {
      type: 'boolean',
      defaultsTo: true,
    },
    copyCardMemberships: {
      type: 'boolean',
      defaultsTo: true,
    },
    copyAttachments: {
      type: 'boolean',
      defaultsTo: true,
    },
    skipCardEvents: {
      type: 'boolean',
      defaultsTo: false,
    },
    skipEvents: {
      type: 'boolean',
      defaultsTo: false,
    },
    detachBaseCustomFieldGroups: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  async fn(inputs) {
    const { values } = inputs;
    const project = values.project || inputs.project;

    if (!values.name) {
      values.name = inputs.record.name;
    }

    if (_.isUndefined(values.position)) {
      const boards = await Board.qm.getByProjectId(project.id);
      values.position = getNextPosition(boards);
    }

    const boards = await Board.qm.getByProjectId(project.id);
    const { position, repositions } = sails.helpers.utils.insertToPositionables(
      values.position,
      boards,
    );

    values.position = position;

    if (repositions.length > 0) {
      const scoper = sails.helpers.projects.makeScoper.with({
        record: project,
      });

      await scoper.getUserIdsWithFullProjectVisibility();
      const clonedScoper = scoper.clone();

      // eslint-disable-next-line no-restricted-syntax
      for (const reposition of repositions) {
        // eslint-disable-next-line no-await-in-loop
        await Board.qm.updateOne(
          {
            id: reposition.record.id,
            projectId: reposition.record.projectId,
          },
          {
            position: reposition.position,
          },
        );

        clonedScoper.replaceBoard(reposition.record);
        // eslint-disable-next-line no-await-in-loop
        const boardRelatedUserIds = await clonedScoper.getBoardRelatedUserIds();

        boardRelatedUserIds.forEach((userId) => {
          sails.sockets.broadcast(`user:${userId}`, 'boardUpdate', {
            item: {
              id: reposition.record.id,
              position: reposition.position,
            },
          });
        });
      }
    }

    const {
      board,
      boardMembership,
      lists: defaultLists,
    } = await Board.qm.createOne(
      {
        ..._.pick(inputs.record, [
          'defaultView',
          'defaultCardType',
          'limitCardTypesToDefaultOne',
          'alwaysDisplayCardCreator',
          'displayCardAges',
          'expandTaskListsByDefault',
        ]),
        ..._.pick(values, ['position', 'name', 'isTemplate']),
        projectId: project.id,
      },
      {
        user: inputs.actorUser,
        withMembership: !values.isTemplate,
      },
    );

    const defaultListByType = _.keyBy(defaultLists, 'type');

    const sourceBoardMemberships = inputs.copyBoardMemberships
      ? await BoardMembership.qm.getByBoardId(inputs.record.id)
      : [];

    const boardMembershipsValues = sourceBoardMemberships.flatMap((sourceBoardMembership) => {
      if (sourceBoardMembership.userId === inputs.actorUser.id) {
        return [];
      }

      return {
        ..._.pick(sourceBoardMembership, ['userId', 'role', 'canComment']),
        projectId: project.id,
        boardId: board.id,
      };
    });

    const copiedBoardMemberships =
      boardMembershipsValues.length > 0
        ? await BoardMembership.qm.create(boardMembershipsValues)
        : [];
    const boardMemberships = [
      ...(boardMembership ? [boardMembership] : []),
      ...copiedBoardMemberships,
    ];

    const sourceLabels = await Label.qm.getByBoardId(inputs.record.id);
    const labelsValues = sourceLabels.map((label) => ({
      ..._.pick(label, ['position', 'name', 'color']),
      boardId: board.id,
    }));

    const labels = labelsValues.length > 0 ? await Label.qm.create(labelsValues) : [];

    const {
      customFieldGroups: boardCustomFieldGroups,
      customFields: boardCustomFields,
      customFieldGroupIdByCustomFieldGroupId,
      customFieldIdByCustomFieldId,
    } = await copyBoardCustomFields(
      inputs.record,
      board,
      inputs.project,
      project,
      inputs.detachBaseCustomFieldGroups,
    );

    const sourceLists = await List.qm.getByBoardId(inputs.record.id);

    const lists = [];
    const cards = [];
    const cardMemberships = [];
    const cardLabels = [];
    const taskLists = [];
    const tasks = [];
    const attachments = [];
    const customFieldGroups = [...boardCustomFieldGroups];
    const customFields = [...boardCustomFields];
    const customFieldValues = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const sourceList of sourceLists) {
      let list;
      if (sourceList.type === List.Types.ARCHIVE || sourceList.type === List.Types.TRASH) {
        list = defaultListByType[sourceList.type];
      } else {
        // eslint-disable-next-line no-await-in-loop
        list = await List.qm.createOne({
          ..._.pick(sourceList, ['type', 'position', 'name', 'color']),
          boardId: board.id,
        });
      }

      lists.push(list);

      // eslint-disable-next-line no-await-in-loop
      const sourceCards = await Card.qm.getByListId(sourceList.id);

      // eslint-disable-next-line no-restricted-syntax
      for (const [index, sourceCard] of sourceCards.entries()) {
        // eslint-disable-next-line no-await-in-loop
        const duplicate = await sails.helpers.cards.duplicateOne.with({
          project: inputs.project,
          board: inputs.record,
          list: sourceList,
          record: sourceCard,
          values: {
            project,
            board,
            list,
            position: sails.helpers.lists.isFinite(list)
              ? sourceCard.position || POSITION_GAP * (index + 1)
              : undefined,
            creatorUser: inputs.actorUser,
            customFieldGroupIdByCustomFieldGroupId,
            customFieldIdByCustomFieldId,
          },
          copyCardMemberships: inputs.copyCardMemberships,
          copyAttachments: inputs.copyAttachments,
          skipEvents: inputs.skipCardEvents,
          detachBaseCustomFieldGroups: inputs.detachBaseCustomFieldGroups,
          request: inputs.request,
        });

        cards.push(duplicate.card);
        cardMemberships.push(...duplicate.cardMemberships);
        cardLabels.push(...duplicate.cardLabels);
        taskLists.push(...duplicate.taskLists);
        tasks.push(...duplicate.tasks);
        attachments.push(...duplicate.attachments);
        customFieldGroups.push(...duplicate.customFieldGroups);
        customFields.push(...duplicate.customFields);
        customFieldValues.push(...duplicate.customFieldValues);
      }
    }

    if (!inputs.skipEvents) {
      const scoper = sails.helpers.projects.makeScoper.with({
        record: project,
        board,
      });

      scoper.boardMemberships = boardMemberships;
      const boardRelatedUserIds = await scoper.getBoardRelatedUserIds();

      boardRelatedUserIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'boardCreate',
          {
            item: board,
            included: {
              boardMemberships: boardMemberships.filter(
                (membership) => membership.userId === userId,
              ),
            },
          },
          inputs.request,
        );
      });

      const webhooks = await Webhook.qm.getAll();

      sails.helpers.utils.sendWebhooks.with({
        webhooks,
        event: Webhook.Events.BOARD_CREATE,
        buildData: () => ({
          item: board,
          included: {
            projects: [project],
            boardMemberships,
          },
        }),
        user: inputs.actorUser,
      });
    }

    return {
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
    };
  },
};
