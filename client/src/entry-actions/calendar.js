/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const fetchGlobalCalendarCards = (data) => ({
  type: EntryActionTypes.GLOBAL_CALENDAR_CARDS_FETCH,
  payload: {
    data,
  },
});

export default {
  fetchGlobalCalendarCards,
};
