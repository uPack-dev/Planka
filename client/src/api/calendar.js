/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import socket from './socket';
import { transformCard } from './cards';

const normalizeData = ({ visibleStart, visibleEnd, ...data }) =>
  Object.entries({
    ...data,
    start: data.start || visibleStart,
    end: data.end || visibleEnd,
  }).reduce(
    (result, [key, value]) => ({
      ...result,
      ...(Array.isArray(value)
        ? {
            [key]: value.length > 0 ? value.join(',') : undefined,
          }
        : {
            [key]: value || undefined,
          }),
    }),
    {},
  );

const getCalendarCards = (data, headers) =>
  socket.get('/calendar/cards', normalizeData(data), headers).then((body) => ({
    ...body,
    items: body.items.map(transformCard),
  }));

export default {
  getCalendarCards,
};
