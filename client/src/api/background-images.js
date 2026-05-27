/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import http from './http';
import socket from './socket';

/* Actions */

const createBackgroundImage = (projectId, { file, ...data }, requestId, headers) =>
  http.post(
    `/projects/${projectId}/background-images?requestId=${requestId}`,
    {
      ...data,
      file,
    },
    headers,
  );

const searchBackgroundImages = (projectId, params, headers) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  return http.get(
    `/projects/${projectId}/background-images/search?${searchParams}`,
    undefined,
    headers,
  );
};

const importBackgroundImage = (projectId, data, headers) =>
  http.post(`/projects/${projectId}/background-images/import`, data, headers);

const deleteBackgroundImage = (id, headers) =>
  socket.delete(`/background-images/${id}`, undefined, headers);

export default {
  createBackgroundImage,
  importBackgroundImage,
  searchBackgroundImages,
  deleteBackgroundImage,
};
