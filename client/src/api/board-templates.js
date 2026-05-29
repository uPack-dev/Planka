/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';

/* Actions */

const getBoardTemplates = (headers) => socket.get('/board-templates', undefined, headers);

const createBoardTemplate = (boardId, headers) =>
  socket.post(`/boards/${boardId}/board-templates`, undefined, headers);

const deleteBoardTemplate = (id, headers) =>
  socket.delete(`/board-templates/${id}`, undefined, headers);

export default {
  getBoardTemplates,
  createBoardTemplate,
  deleteBoardTemplate,
};
