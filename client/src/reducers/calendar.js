/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  global: {
    isFetching: false,
    error: null,
    visibleStart: null,
    visibleEnd: null,
    projectIds: [],
    boardIds: [],
    userIds: [],
    labelIds: [],
    search: '',
    onlyMyCards: false,
    cardIds: [],
  },
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.GLOBAL_CALENDAR_CARDS_FETCH:
      return {
        ...state,
        global: {
          ...state.global,
          ...payload.data,
          isFetching: true,
          error: null,
        },
      };
    case ActionTypes.GLOBAL_CALENDAR_CARDS_FETCH__SUCCESS:
      return {
        ...state,
        global: {
          ...state.global,
          ...payload.data,
          isFetching: false,
          error: null,
          cardIds: payload.cards.map((card) => card.id),
        },
      };
    case ActionTypes.GLOBAL_CALENDAR_CARDS_FETCH__FAILURE:
      return {
        ...state,
        global: {
          ...state.global,
          ...payload.data,
          isFetching: false,
          error: payload.error,
        },
      };
    default:
      return state;
  }
};
