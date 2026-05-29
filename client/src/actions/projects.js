/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const searchProjects = (value) => ({
  type: ActionTypes.PROJECTS_SEARCH,
  payload: {
    value,
  },
});

const updateProjectsOrder = (value) => ({
  type: ActionTypes.PROJECTS_ORDER_UPDATE,
  payload: {
    value,
  },
});

const toggleHiddenProjects = (isVisible) => ({
  type: ActionTypes.HIDDEN_PROJECTS_TOGGLE,
  payload: {
    isVisible,
  },
});

const toggleArchivedProjects = (isVisible) => ({
  type: ActionTypes.ARCHIVED_PROJECTS_TOGGLE,
  payload: {
    isVisible,
  },
});

const createProject = (data) => ({
  type: ActionTypes.PROJECT_CREATE,
  payload: {
    data,
  },
});

createProject.success = (project, projectManagers) => ({
  type: ActionTypes.PROJECT_CREATE__SUCCESS,
  payload: {
    project,
    projectManagers,
  },
});

createProject.failure = (error) => ({
  type: ActionTypes.PROJECT_CREATE__FAILURE,
  payload: {
    error,
  },
});

const handleProjectCreate = (
  project,
  users,
  projectManagers,
  backgroundImages,
  baseCustomFieldGroups,
  boards,
  boardMemberships,
  customFields,
  notificationServices,
) => ({
  type: ActionTypes.PROJECT_CREATE_HANDLE,
  payload: {
    project,
    users,
    projectManagers,
    backgroundImages,
    baseCustomFieldGroups,
    boards,
    boardMemberships,
    customFields,
    notificationServices,
  },
});

const updateProject = (id, data) => ({
  type: ActionTypes.PROJECT_UPDATE,
  payload: {
    id,
    data,
  },
});

updateProject.success = (project) => ({
  type: ActionTypes.PROJECT_UPDATE__SUCCESS,
  payload: {
    project,
  },
});

updateProject.failure = (id, error) => ({
  type: ActionTypes.PROJECT_UPDATE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleProjectUpdate = (
  project,
  boardIds,
  isAvailable,
  board,
  users,
  projectManagers,
  backgroundImages,
  baseCustomFieldGroups,
  boards,
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
  notificationsToDelete,
  notificationServices,
) => ({
  type: ActionTypes.PROJECT_UPDATE_HANDLE,
  payload: {
    project,
    boardIds,
    isAvailable,
    board,
    users,
    projectManagers,
    backgroundImages,
    baseCustomFieldGroups,
    boards,
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
    notificationsToDelete,
    notificationServices,
  },
});

const archiveProject = (id) => ({
  type: ActionTypes.PROJECT_ARCHIVE,
  payload: {
    id,
  },
});

archiveProject.success = (project) => ({
  type: ActionTypes.PROJECT_ARCHIVE__SUCCESS,
  payload: {
    project,
  },
});

archiveProject.failure = (id, error) => ({
  type: ActionTypes.PROJECT_ARCHIVE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleProjectArchive = (project, boardIds, isAvailable) => ({
  type: ActionTypes.PROJECT_ARCHIVE_HANDLE,
  payload: {
    project,
    boardIds,
    isAvailable,
  },
});

const restoreProject = (id) => ({
  type: ActionTypes.PROJECT_RESTORE,
  payload: {
    id,
  },
});

restoreProject.success = (project) => ({
  type: ActionTypes.PROJECT_RESTORE__SUCCESS,
  payload: {
    project,
  },
});

restoreProject.failure = (id, error) => ({
  type: ActionTypes.PROJECT_RESTORE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleProjectRestore = (
  project,
  users,
  projectManagers,
  backgroundImages,
  baseCustomFieldGroups,
  boards,
  boardMemberships,
  customFields,
  notificationServices,
) => ({
  type: ActionTypes.PROJECT_RESTORE_HANDLE,
  payload: {
    project,
    users,
    projectManagers,
    backgroundImages,
    baseCustomFieldGroups,
    boards,
    boardMemberships,
    customFields,
    notificationServices,
  },
});

const deleteProject = (id) => ({
  type: ActionTypes.PROJECT_DELETE,
  payload: {
    id,
  },
});

deleteProject.success = (project) => ({
  type: ActionTypes.PROJECT_DELETE__SUCCESS,
  payload: {
    project,
  },
});

deleteProject.failure = (id, error) => ({
  type: ActionTypes.PROJECT_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleProjectDelete = (project) => ({
  type: ActionTypes.PROJECT_DELETE_HANDLE,
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
  handleProjectUpdate,
  archiveProject,
  handleProjectArchive,
  restoreProject,
  handleProjectRestore,
  deleteProject,
  handleProjectDelete,
};
