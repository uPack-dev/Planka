/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const searchProjects = (value) => ({
  type: EntryActionTypes.PROJECTS_SEARCH,
  payload: {
    value,
  },
});

const updateProjectsOrder = (value) => ({
  type: EntryActionTypes.PROJECTS_ORDER_UPDATE,
  payload: {
    value,
  },
});

const toggleHiddenProjects = (isVisible) => ({
  type: EntryActionTypes.HIDDEN_PROJECTS_TOGGLE,
  payload: {
    isVisible,
  },
});

const toggleArchivedProjects = (isVisible) => ({
  type: EntryActionTypes.ARCHIVED_PROJECTS_TOGGLE,
  payload: {
    isVisible,
  },
});

const createProject = (data) => ({
  type: EntryActionTypes.PROJECT_CREATE,
  payload: {
    data,
  },
});

const handleProjectCreate = (project) => ({
  type: EntryActionTypes.PROJECT_CREATE_HANDLE,
  payload: {
    project,
  },
});

const updateProject = (id, data) => ({
  type: EntryActionTypes.PROJECT_UPDATE,
  payload: {
    id,
    data,
  },
});

const updateCurrentProject = (data) => ({
  type: EntryActionTypes.CURRENT_PROJECT_UPDATE,
  payload: {
    data,
  },
});

const handleProjectUpdate = (project) => ({
  type: EntryActionTypes.PROJECT_UPDATE_HANDLE,
  payload: {
    project,
  },
});

const archiveCurrentProject = () => ({
  type: EntryActionTypes.CURRENT_PROJECT_ARCHIVE,
  payload: {},
});

const handleProjectArchive = (project) => ({
  type: EntryActionTypes.PROJECT_ARCHIVE_HANDLE,
  payload: {
    project,
  },
});

const restoreCurrentProject = () => ({
  type: EntryActionTypes.CURRENT_PROJECT_RESTORE,
  payload: {},
});

const handleProjectRestore = (project) => ({
  type: EntryActionTypes.PROJECT_RESTORE_HANDLE,
  payload: {
    project,
  },
});

const deleteCurrentProject = () => ({
  type: EntryActionTypes.CURRENT_PROJECT_DELETE,
  payload: {},
});

const handleProjectDelete = (project) => ({
  type: EntryActionTypes.PROJECT_DELETE_HANDLE,
  payload: {
    project,
  },
});

export default {
  searchProjects,
  updateProjectsOrder,
  toggleHiddenProjects,
  toggleArchivedProjects,
  createProject,
  handleProjectCreate,
  updateProject,
  updateCurrentProject,
  handleProjectUpdate,
  archiveCurrentProject,
  handleProjectArchive,
  restoreCurrentProject,
  handleProjectRestore,
  deleteCurrentProject,
  handleProjectDelete,
};
