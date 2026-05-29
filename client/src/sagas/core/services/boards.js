/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, fork, put, select, take } from 'redux-saga/effects';

import { goToBoard, goToProject } from './router';
import { openModal } from './modals';
import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { createLocalId } from '../../../utils/local-id';
import ActionTypes from '../../../constants/ActionTypes';
import ModalTypes from '../../../constants/ModalTypes';

export function* createBoard(projectId, { import: boardImport, ...data }) {
  const localId = yield call(createLocalId);

  const nextData = {
    ...data,
    position: yield select(selectors.selectNextBoardPosition, projectId),
  };

  yield put(
    actions.createBoard({
      ...nextData,
      projectId,
      id: localId,
    }),
  );

  // TODO: use race instead
  const watchForCreateBoardActionTask = yield fork(function* watchForCreateBoardAction() {
    yield take(ActionTypes.BOARD_CREATE);
  });

  let board;
  let boardMemberships;

  try {
    ({
      item: board,
      included: { boardMemberships },
    } = yield boardImport
      ? call(
          request,
          api.createBoardWithImport,
          projectId,
          {
            ...nextData,
            importType: boardImport.type,
            importFile: boardImport.file,
          },
          localId,
        )
      : call(request, api.createBoard, projectId, nextData));
  } catch (error) {
    yield put(actions.createBoard.failure(localId, error));
    return;
  }

  yield put(actions.createBoard.success(localId, board, boardMemberships));

  if (watchForCreateBoardActionTask.isRunning()) {
    yield call(goToBoard, board.id);
    yield call(openModal, ModalTypes.BOARD_SETTINGS, {
      id: board.id,
      openPreferences: true,
    });
  }
}

export function* createBoardInCurrentProject(data) {
  const { projectId } = yield select(selectors.selectPath);

  yield call(createBoard, projectId, data);
}

export function* handleBoardCreate(board, boardMemberships, requestId) {
  const isExists = yield select(selectors.selectIsBoardWithIdExists, requestId);

  if (!isExists) {
    yield put(actions.handleBoardCreate(board, boardMemberships));
  }
}

export function* fetchBoard(id) {
  yield put(actions.fetchBoard(id));

  let board;
  let users;
  let projects;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;

  try {
    ({
      item: board,
      included: {
        users,
        projects,
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
      },
    } = yield call(request, api.getBoard, id, true));
  } catch (error) {
    yield put(actions.fetchBoard.failure(id, error));
    return;
  }

  yield put(
    actions.fetchBoard.success(
      board,
      users,
      projects,
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
    ),
  );
}

export function* updateBoard(id, data) {
  yield put(actions.updateBoard(id, data));

  let board;
  try {
    ({ item: board } = yield call(request, api.updateBoard, id, data));
  } catch (error) {
    yield put(actions.updateBoard.failure(id, error));
    return;
  }

  yield put(actions.updateBoard.success(board));
}

export function* updateCurrentBoard(data) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(updateBoard, boardId, data);
}

export function* handleBoardUpdate(board) {
  yield put(actions.handleBoardUpdate(board));
}

export function* archiveBoard(id) {
  yield put(actions.archiveBoard(id));

  let board;
  try {
    ({ item: board } = yield call(request, api.archiveBoard, id));
  } catch (error) {
    yield put(actions.archiveBoard.failure(id, error));
    return;
  }

  yield put(actions.archiveBoard.success(board));
}

export function* archiveCurrentBoard() {
  const { boardId } = yield select(selectors.selectPath);

  yield call(archiveBoard, boardId);
}

export function* handleBoardArchive(board) {
  const { boardId } = yield select(selectors.selectPath);

  const isAvailable = yield select(
    selectors.selectIsProjectWithIdExternalAccessibleForCurrentUser,
    board.projectId,
  );

  yield put(actions.handleBoardArchive(board, isAvailable));

  if (!isAvailable && board.id === boardId) {
    yield call(goToProject, board.projectId);
  }
}

export function* restoreBoard(id) {
  yield put(actions.restoreBoard(id));

  let board;
  try {
    ({ item: board } = yield call(request, api.restoreBoard, id));
  } catch (error) {
    yield put(actions.restoreBoard.failure(id, error));
    return;
  }

  yield put(actions.restoreBoard.success(board));
}

export function* restoreCurrentBoard() {
  const { boardId } = yield select(selectors.selectPath);

  yield call(restoreBoard, boardId);
}

export function* handleBoardRestore(board) {
  const isExists = yield select(selectors.selectIsBoardWithIdExists, board.id);

  if (isExists) {
    yield put(actions.handleBoardRestore(board));
    return;
  }

  let users;
  let projects;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;
  let restoredBoard;

  try {
    ({
      item: restoredBoard,
      included: {
        users,
        projects,
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
      },
    } = yield call(request, api.getBoard, board.id, true));
  } catch {
    return;
  }

  yield put(
    actions.fetchBoard.success(
      restoredBoard,
      users,
      projects,
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
    ),
  );
}

export function* duplicateBoard(id, data = {}) {
  yield put(actions.duplicateBoard(id, data));

  let board;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardMemberships;
  let cardLabels;
  let taskLists;
  let tasks;
  let attachments;
  let customFieldGroups;
  let customFields;
  let customFieldValues;

  try {
    ({
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
        attachments,
        customFieldGroups,
        customFields,
        customFieldValues,
      },
    } = yield call(request, api.duplicateBoard, id, data));
  } catch (error) {
    yield put(actions.duplicateBoard.failure(id, error));
    return;
  }

  yield put(
    actions.duplicateBoard.success(
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
    ),
  );

  yield call(goToBoard, board.id);
}

export function* duplicateCurrentBoard(data) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(duplicateBoard, boardId, data);
}

export function* moveBoard(id, index) {
  const { projectId } = yield select(selectors.selectBoardById, id);
  const position = yield select(selectors.selectNextBoardPosition, projectId, index, id);

  yield call(updateBoard, id, {
    position,
  });
}

export function* updateBoardContext(id, value) {
  yield put(actions.updateBoardContext(id, value));
}

export function* toggleArchivedBoards(isVisible) {
  yield put(actions.toggleArchivedBoards(isVisible));
}

export function* updateContextInCurrentBoard(value) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(updateBoardContext, boardId, value);
}

export function* updateBoardView(id, value) {
  yield put(
    actions.updateBoard(id, {
      view: value,
    }),
  );
}

export function* updateViewInCurrentBoard(value) {
  const { boardId } = yield select(selectors.selectPath);

  yield call(updateBoardView, boardId, value);
}

export function* searchInCurrentBoard(value) {
  const { boardId } = yield select(selectors.selectPath);
  const currentListId = yield select(selectors.selectCurrentListId);

  yield put(actions.searchInBoard(boardId, value, currentListId));
}

export function* deleteBoard(id) {
  const currentBoard = yield select(selectors.selectCurrentBoard);

  yield put(actions.deleteBoard(id));

  if (currentBoard && id === currentBoard.id) {
    yield call(goToProject, currentBoard.projectId);
  }

  let board;
  try {
    ({ item: board } = yield call(request, api.deleteBoard, id));
  } catch (error) {
    yield put(actions.deleteBoard.failure(id, error));
    return;
  }

  yield put(actions.deleteBoard.success(board));
}

export function* handleBoardDelete(board) {
  const { boardId } = yield select(selectors.selectPath);

  yield put(actions.handleBoardDelete(board));

  if (board.id === boardId) {
    yield call(goToProject, board.projectId);
  }
}

export default {
  createBoard,
  createBoardInCurrentProject,
  handleBoardCreate,
  fetchBoard,
  updateBoard,
  updateCurrentBoard,
  handleBoardUpdate,
  archiveBoard,
  archiveCurrentBoard,
  handleBoardArchive,
  restoreBoard,
  restoreCurrentBoard,
  handleBoardRestore,
  duplicateBoard,
  duplicateCurrentBoard,
  moveBoard,
  updateBoardContext,
  toggleArchivedBoards,
  updateContextInCurrentBoard,
  updateBoardView,
  updateViewInCurrentBoard,
  searchInCurrentBoard,
  deleteBoard,
  handleBoardDelete,
};
