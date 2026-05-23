/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { all, takeLatest } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* calendarWatchers() {
  yield all([
    takeLatest(EntryActionTypes.GLOBAL_CALENDAR_CARDS_FETCH, ({ payload: { data } }) =>
      services.fetchGlobalCalendarCards(data),
    ),
  ]);
}
