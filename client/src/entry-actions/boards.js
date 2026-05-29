/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const createBoardInCurrentProject = (data) => ({
  type: EntryActionTypes.BOARD_IN_CURRENT_PROJECT_CREATE,
  payload: {
    data,
  },
});

const handleBoardCreate = (board, boardMemberships, requestId) => ({
  type: EntryActionTypes.BOARD_CREATE_HANDLE,
  payload: {
    board,
    boardMemberships,
    requestId,
  },
});

const fetchBoard = (id) => ({
  type: EntryActionTypes.BOARD_FETCH,
  payload: {
    id,
  },
});

const updateBoard = (id, data) => ({
  type: EntryActionTypes.BOARD_UPDATE,
  payload: {
    id,
    data,
  },
});

const updateCurrentBoard = (data) => ({
  type: EntryActionTypes.CURRENT_BOARD_UPDATE,
  payload: {
    data,
  },
});

const handleBoardUpdate = (board) => ({
  type: EntryActionTypes.BOARD_UPDATE_HANDLE,
  payload: {
    board,
  },
});

const archiveBoard = (id) => ({
  type: EntryActionTypes.BOARD_ARCHIVE,
  payload: {
    id,
  },
});

const archiveCurrentBoard = () => ({
  type: EntryActionTypes.CURRENT_BOARD_ARCHIVE,
  payload: {},
});

const handleBoardArchive = (board) => ({
  type: EntryActionTypes.BOARD_ARCHIVE_HANDLE,
  payload: {
    board,
  },
});

const restoreBoard = (id) => ({
  type: EntryActionTypes.BOARD_RESTORE,
  payload: {
    id,
  },
});

const restoreCurrentBoard = () => ({
  type: EntryActionTypes.CURRENT_BOARD_RESTORE,
  payload: {},
});

const handleBoardRestore = (board) => ({
  type: EntryActionTypes.BOARD_RESTORE_HANDLE,
  payload: {
    board,
  },
});

const duplicateBoard = (id, data) => ({
  type: EntryActionTypes.BOARD_DUPLICATE,
  payload: {
    id,
    data,
  },
});

const duplicateCurrentBoard = (data = {}) => ({
  type: EntryActionTypes.CURRENT_BOARD_DUPLICATE,
  payload: {
    data,
  },
});

const createTemplateFromCurrentBoard = () => ({
  type: EntryActionTypes.CURRENT_BOARD_TO_TEMPLATE_CREATE,
  payload: {},
});

const moveBoard = (id, index) => ({
  type: EntryActionTypes.BOARD_MOVE,
  payload: {
    id,
    index,
  },
});

const updateContextInCurrentBoard = (value) => ({
  type: EntryActionTypes.CONTEXT_IN_CURRENT_BOARD_UPDATE,
  payload: {
    value,
  },
});

const toggleArchivedBoards = (isVisible) => ({
  type: EntryActionTypes.ARCHIVED_BOARDS_TOGGLE,
  payload: {
    isVisible,
  },
});

const updateViewInCurrentBoard = (value) => ({
  type: EntryActionTypes.VIEW_IN_CURRENT_BOARD_UPDATE,
  payload: {
    value,
  },
});

const searchInCurrentBoard = (value) => ({
  type: EntryActionTypes.IN_CURRENT_BOARD_SEARCH,
  payload: {
    value,
  },
});

const deleteBoard = (id) => ({
  type: EntryActionTypes.BOARD_DELETE,
  payload: {
    id,
  },
});

const handleBoardDelete = (board) => ({
  type: EntryActionTypes.BOARD_DELETE_HANDLE,
  payload: {
    board,
  },
});

export default {
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
  createTemplateFromCurrentBoard,
  moveBoard,
  updateContextInCurrentBoard,
  toggleArchivedBoards,
  updateViewInCurrentBoard,
  searchInCurrentBoard,
  deleteBoard,
  handleBoardDelete,
};
