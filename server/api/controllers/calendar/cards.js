/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { isCalendarDate, isCalendarEndDate } = require('../../../utils/validators');
const { idsInput } = require('../../../utils/inputs');

const Errors = {
  INVALID_RANGE: {
    invalidRange: 'Invalid range',
  },
};

const parseIds = (value) => (value ? value.split(',') : null);

const filterByIds = (records, ids) => {
  if (!ids) {
    return records;
  }

  return records.filter((record) => ids.includes(record.id));
};

module.exports = {
  inputs: {
    start: {
      type: 'string',
      custom: isCalendarDate,
      required: true,
    },
    end: {
      type: 'string',
      custom: isCalendarDate,
      required: true,
    },
    projectIds: idsInput,
    boardIds: idsInput,
    userIds: idsInput,
    labelIds: idsInput,
    search: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 256,
    },
    onlyMyCards: {
      type: 'boolean',
    },
  },

  exits: {
    invalidRange: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!isCalendarEndDate(inputs.end, inputs.start)) {
      throw Errors.INVALID_RANGE;
    }

    const projectFilterIds = parseIds(inputs.projectIds);
    const boardFilterIds = parseIds(inputs.boardIds);
    const userFilterIds = parseIds(inputs.userIds);
    const labelFilterIds = parseIds(inputs.labelIds);

    let projects;
    let boards;

    if (currentUser.role === User.Roles.ADMIN) {
      projects = await Project.qm.getAll();
      const projectIds = sails.helpers.utils.mapRecords(projects);

      boards = projectIds.length > 0 ? await Board.qm.getByProjectIds(projectIds) : [];
    } else {
      const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);

      const fullyVisibleBoards =
        managerProjectIds.length > 0 ? await Board.qm.getByProjectIds(managerProjectIds) : [];

      const boardMemberships = await BoardMembership.qm.getByUserId(currentUser.id, {
        exceptProjectIdOrIds: managerProjectIds,
      });

      const membershipBoardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');
      const membershipBoards =
        membershipBoardIds.length > 0
          ? await Board.qm.getByIds(membershipBoardIds, {
              exceptProjectIdOrIds: managerProjectIds,
            })
          : [];

      boards = [...fullyVisibleBoards, ...membershipBoards];

      const projectIds = _.union(
        managerProjectIds,
        sails.helpers.utils.mapRecords(membershipBoards, 'projectId', true),
      );

      projects = projectIds.length > 0 ? await Project.qm.getByIds(projectIds) : [];
    }

    const visibleProjects = filterByIds(projects, projectFilterIds);
    const visibleProjectIdsSet = new Set(sails.helpers.utils.mapRecords(visibleProjects));

    let visibleBoards = boards.filter((board) => visibleProjectIdsSet.has(board.projectId));
    visibleBoards = filterByIds(visibleBoards, boardFilterIds);

    const visibleBoardIds = sails.helpers.utils.mapRecords(visibleBoards);

    const cards = await Card.qm.getByCalendarRange({
      start: inputs.start,
      end: inputs.end,
      boardIds: visibleBoardIds,
      userIds: userFilterIds,
      labelIds: labelFilterIds,
      search: inputs.search && inputs.search.trim(),
      onlyMyCardsUserId: inputs.onlyMyCards ? currentUser.id : null,
    });

    const cardIds = sails.helpers.utils.mapRecords(cards);

    const [lists, labels, boardMemberships, cardMemberships, cardLabels, taskLists] =
      visibleBoardIds.length > 0
        ? await Promise.all([
            List.qm.getByBoardIds(visibleBoardIds, {
              typeOrTypes: [List.Types.ACTIVE, List.Types.CLOSED],
            }),
            Label.qm.getByBoardIds(visibleBoardIds),
            BoardMembership.qm.getByBoardIds(visibleBoardIds),
            cardIds.length > 0 ? CardMembership.qm.getByCardIds(cardIds) : [],
            cardIds.length > 0 ? CardLabel.qm.getByCardIds(cardIds) : [],
            cardIds.length > 0 ? TaskList.qm.getByCardIds(cardIds) : [],
          ])
        : [[], [], [], [], [], []];

    const taskListIds = sails.helpers.utils.mapRecords(taskLists);
    const tasks = taskListIds.length > 0 ? await Task.qm.getByTaskListIds(taskListIds) : [];
    const cardIdByTaskListId = _.keyBy(taskLists, 'id');
    const taskAssigneeUserIdsByCardId = tasks.reduce((result, task) => {
      if (!task.assigneeUserId) {
        return result;
      }

      const taskList = cardIdByTaskListId[task.taskListId];

      if (!taskList) {
        return result;
      }

      return {
        ...result,
        [taskList.cardId]: _.uniq([...(result[taskList.cardId] || []), task.assigneeUserId]),
      };
    }, {});

    const userIds = _.union(
      sails.helpers.utils.mapRecords(boardMemberships, 'userId'),
      sails.helpers.utils.mapRecords(cards, 'creatorUserId', true, true),
      sails.helpers.utils.mapRecords(cardMemberships, 'userId'),
      sails.helpers.utils.mapRecords(tasks, 'assigneeUserId', true, true),
    );

    const users = userIds.length > 0 ? await User.qm.getByIds(userIds) : [];

    return {
      items: cards.map((card) => ({
        ...card,
        taskAssigneeUserIds: taskAssigneeUserIdsByCardId[card.id] || [],
      })),
      included: {
        projects: visibleProjects,
        boards: visibleBoards,
        lists,
        labels,
        boardMemberships,
        cardLabels,
        cardMemberships,
        users: sails.helpers.users.presentMany(users, currentUser),
      },
    };
  },
};
