/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectCurrentUserId } from './users';
import { isListFinite } from '../utils/record-helpers';
import { UserRoles } from '../constants/Enums';

export const selectGlobalCalendar = ({ calendar: { global } }) => global;

const getProjectModelsForUser = ({ Project, User }, currentUserId) => {
  const currentUserModel = User.withId(currentUserId);

  if (!currentUserModel) {
    return [];
  }

  if (currentUserModel.role === UserRoles.ADMIN) {
    return Project.all().orderBy(['id.length', 'id']).toModelArray();
  }

  return currentUserModel.getProjectsModelArray();
};

const getBoardModelsForUser = (session, currentUserId) => {
  const { User } = session;
  const currentUserModel = User.withId(currentUserId);

  if (!currentUserModel) {
    return [];
  }

  const boardIds = new Set();

  return getProjectModelsForUser(session, currentUserId).flatMap((projectModel) => {
    const boardModels =
      currentUserModel.role === UserRoles.ADMIN
        ? projectModel.getBoardsQuerySet().toModelArray()
        : projectModel.getBoardsModelArrayAvailableForUser(currentUserModel);

    return boardModels.flatMap((boardModel) => {
      if (boardIds.has(boardModel.id)) {
        return [];
      }

      boardIds.add(boardModel.id);
      return boardModel;
    });
  });
};

export const selectGlobalCalendarProjects = createSelector(
  orm,
  (state) => selectCurrentUserId(state),
  (session, currentUserId) =>
    getProjectModelsForUser(session, currentUserId).map((projectModel) => projectModel.ref),
);

export const selectGlobalCalendarBoards = createSelector(
  orm,
  (state) => selectCurrentUserId(state),
  (session, currentUserId) =>
    getBoardModelsForUser(session, currentUserId).map((boardModel) => {
      const membershipModel = boardModel.getMembershipModelByUserId(currentUserId);

      return {
        ...boardModel.ref,
        project: boardModel.project && boardModel.project.ref,
        membership: membershipModel && membershipModel.ref,
      };
    }),
);

export const selectGlobalCalendarLists = createSelector(
  orm,
  (state) => selectCurrentUserId(state),
  (session, currentUserId) =>
    getBoardModelsForUser(session, currentUserId).flatMap((boardModel) =>
      boardModel
        .getListsQuerySet()
        .toRefArray()
        .filter(isListFinite)
        .map((list) => ({
          ...list,
          board: boardModel.ref,
          project: boardModel.project && boardModel.project.ref,
        })),
    ),
);

export const selectGlobalCalendarLabels = createSelector(
  orm,
  (state) => selectCurrentUserId(state),
  (session, currentUserId) =>
    getBoardModelsForUser(session, currentUserId).flatMap((boardModel) =>
      boardModel.getLabelsQuerySet().toRefArray(),
    ),
);

export const selectGlobalCalendarUsers = createSelector(
  orm,
  (state) => selectCurrentUserId(state),
  (session, currentUserId) => {
    const userIds = new Set();

    return getBoardModelsForUser(session, currentUserId).flatMap((boardModel) =>
      boardModel
        .getMembershipsQuerySet()
        .toModelArray()
        .flatMap((boardMembershipModel) => {
          if (!boardMembershipModel.user || userIds.has(boardMembershipModel.userId)) {
            return [];
          }

          userIds.add(boardMembershipModel.userId);
          return boardMembershipModel.user.ref;
        }),
    );
  },
);

export const selectGlobalCalendarCards = createSelector(
  orm,
  (state) => selectGlobalCalendar(state).cardIds,
  ({ Card }, cardIds) =>
    cardIds.flatMap((cardId) => {
      const cardModel = Card.withId(cardId);

      if (!cardModel || !cardModel.board || !cardModel.list) {
        return [];
      }

      return {
        ...cardModel.ref,
        project: cardModel.board.project && cardModel.board.project.ref,
        board: cardModel.board.ref,
        list: cardModel.list.ref,
        labels: cardModel.labels.toRefArray(),
        users: cardModel.users.toRefArray(),
      };
    }),
);

export default {
  selectGlobalCalendar,
  selectGlobalCalendarProjects,
  selectGlobalCalendarBoards,
  selectGlobalCalendarLists,
  selectGlobalCalendarLabels,
  selectGlobalCalendarUsers,
  selectGlobalCalendarCards,
};
