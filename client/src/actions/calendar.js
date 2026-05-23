/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const fetchGlobalCalendarCards = (data) => ({
  type: ActionTypes.GLOBAL_CALENDAR_CARDS_FETCH,
  payload: {
    data,
  },
});

fetchGlobalCalendarCards.success = (
  data,
  cards,
  projects,
  boards,
  lists,
  labels,
  boardMemberships,
  cardLabels,
  cardMemberships,
  users,
) => ({
  type: ActionTypes.GLOBAL_CALENDAR_CARDS_FETCH__SUCCESS,
  payload: {
    data,
    cards,
    projects,
    boards,
    lists,
    labels,
    boardMemberships,
    cardLabels,
    cardMemberships,
    users,
  },
});

fetchGlobalCalendarCards.failure = (data, error) => ({
  type: ActionTypes.GLOBAL_CALENDAR_CARDS_FETCH__FAILURE,
  payload: {
    data,
    error,
  },
});

export default {
  fetchGlobalCalendarCards,
};
