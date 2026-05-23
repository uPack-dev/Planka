/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put } from 'redux-saga/effects';

import request from '../request';
import actions from '../../../actions';
import api from '../../../api';

export function* fetchGlobalCalendarCards(data) {
  yield put(actions.fetchGlobalCalendarCards(data));

  let body;
  try {
    body = yield call(request, api.getCalendarCards, data);
  } catch (error) {
    yield put(actions.fetchGlobalCalendarCards.failure(data, error));
    return;
  }

  const {
    items: cards,
    included: {
      projects,
      boards,
      lists,
      labels,
      boardMemberships,
      cardLabels,
      cardMemberships,
      users,
    },
  } = body;

  yield put(
    actions.fetchGlobalCalendarCards.success(
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
    ),
  );
}

export default {
  fetchGlobalCalendarCards,
};
