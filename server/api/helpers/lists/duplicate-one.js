/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { POSITION_GAP } = require('../../../constants');

const getNextPosition = (positionables) => {
  const lastPositionable = _.last(positionables);
  return lastPositionable ? lastPositionable.position + POSITION_GAP : POSITION_GAP;
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
    board: {
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
  },

  exits: {
    boardInValuesMustBelongToProject: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    if (values.project && values.project.id === inputs.project.id) {
      delete values.project;
    }

    const project = values.project || inputs.project;

    if (values.board) {
      if (values.board.projectId !== project.id) {
        throw 'boardInValuesMustBelongToProject';
      }

      if (values.board.id === inputs.board.id) {
        delete values.board;
      }
    }

    const board = values.board || inputs.board;

    if (!values.name) {
      values.name = inputs.record.name;
    }

    if (_.isUndefined(values.position)) {
      if (board.id === inputs.board.id) {
        values.position = inputs.record.position + POSITION_GAP;
      } else {
        const lists = await sails.helpers.boards.getKanbanListsById(board.id);
        values.position = getNextPosition(lists);
      }
    }

    const list = await sails.helpers.lists.createOne.with({
      project,
      values: {
        ..._.pick(inputs.record, ['type', 'color']),
        ..._.pick(values, ['position', 'name']),
        board,
      },
      actorUser: inputs.actorUser,
      request: inputs.request,
    });

    const sourceCards = await Card.qm.getByListId(inputs.record.id);

    const cards = [];
    const cardMemberships = [];
    const cardLabels = [];
    const taskLists = [];
    const tasks = [];
    const attachments = [];
    const customFieldGroups = [];
    const customFields = [];
    const customFieldValues = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const [index, sourceCard] of sourceCards.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const duplicate = await sails.helpers.cards.duplicateOne.with({
        project: inputs.project,
        board: inputs.board,
        list: inputs.record,
        record: sourceCard,
        values: {
          project: values.project,
          board: values.board,
          list,
          position: sourceCard.position || POSITION_GAP * (index + 1),
          creatorUser: inputs.actorUser,
        },
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

    return {
      list,
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
