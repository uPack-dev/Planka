/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMED_DURATION_IN_MS = 60 * 60 * 1000;

const RRULE_KEY_BY_FULLCALENDAR_KEY = {
  FREQ: 'freq',
  INTERVAL: 'interval',
  COUNT: 'count',
  UNTIL: 'until',
  BYDAY: 'byweekday',
  BYMONTHDAY: 'bymonthday',
  BYMONTH: 'bymonth',
};

const cloneDate = (date) => (date ? new Date(date.getTime()) : null);

const addMilliseconds = (date, milliseconds) =>
  date ? new Date(date.getTime() + milliseconds) : null;

const addDays = (date, days) => addMilliseconds(date, days * DAY_IN_MS);

const toDateOnly = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDefaultEndDate = (startDate, isAllDay) =>
  addMilliseconds(startDate, isAllDay ? DAY_IN_MS : DEFAULT_TIMED_DURATION_IN_MS);

const getDuration = (startDate, endDate, isAllDay) => {
  if (!startDate) {
    return null;
  }

  const normalizedEndDate = endDate || getDefaultEndDate(startDate, isAllDay);
  const durationInMs = normalizedEndDate.getTime() - startDate.getTime();

  if (isAllDay) {
    return {
      days: Math.max(Math.round(durationInMs / DAY_IN_MS), 1),
    };
  }

  return {
    milliseconds: Math.max(durationInMs, DEFAULT_TIMED_DURATION_IN_MS),
  };
};

const getAllDayDueDate = (startDate, endDate) => {
  if (!startDate) {
    return null;
  }

  if (!endDate || endDate.getTime() <= startDate.getTime()) {
    return cloneDate(startDate);
  }

  return addDays(endDate, -1);
};

export const getDueDateForSchedule = (startDate, endDate, isAllDay) => {
  if (!startDate) {
    return null;
  }

  if (isAllDay) {
    return getAllDayDueDate(startDate, endDate);
  }

  return endDate || startDate;
};

export const normalizeFullCalendarEnd = (startDate, endDate, isAllDay) => {
  if (endDate) {
    return endDate;
  }

  if (!startDate) {
    return null;
  }

  return getDefaultEndDate(startDate, isAllDay);
};

export const parseRecurrenceRule = (recurrenceRule, startDate, isAllDay) => {
  if (!recurrenceRule || !startDate) {
    return null;
  }

  const normalizedRule = recurrenceRule.startsWith('RRULE:')
    ? recurrenceRule.substring('RRULE:'.length)
    : recurrenceRule;

  return normalizedRule.split(';').reduce(
    (result, field) => {
      const [key, value] = field.split('=');
      const fullCalendarKey = RRULE_KEY_BY_FULLCALENDAR_KEY[key];

      if (!fullCalendarKey || !value) {
        return result;
      }

      switch (key) {
        case 'FREQ':
          return {
            ...result,
            [fullCalendarKey]: value.toLowerCase(),
          };
        case 'INTERVAL':
        case 'COUNT':
          return {
            ...result,
            [fullCalendarKey]: Number(value),
          };
        case 'BYDAY':
          return {
            ...result,
            [fullCalendarKey]: value.split(',').map((day) => day.toLowerCase()),
          };
        case 'BYMONTHDAY':
        case 'BYMONTH':
          return {
            ...result,
            [fullCalendarKey]: value.split(',').map(Number),
          };
        default:
          return {
            ...result,
            [fullCalendarKey]: value,
          };
      }
    },
    {
      dtstart: isAllDay ? toDateOnly(startDate) : startDate,
    },
  );
};

export const cardToCalendarEvent = (card) => {
  const startDate = card.startDate || card.dueDate;
  const isDueDateOnly = !card.startDate && !!card.dueDate;
  const isAllDay = card.isAllDay ?? isDueDateOnly;
  const endDate = isDueDateOnly ? addDays(startDate, 1) : card.endDate;

  if (!startDate && !card.recurrenceRule) {
    return null;
  }

  const baseEvent = {
    id: card.id,
    title: card.name,
    allDay: isAllDay,
    extendedProps: {
      cardId: card.id,
      listId: card.listId,
      boardId: card.boardId,
      isDueCompleted: card.isDueCompleted,
      isClosed: card.isClosed,
      dueDate: card.dueDate,
      startDate: card.startDate,
      endDate: card.endDate,
      recurrenceRule: card.recurrenceRule,
      labels: card.labels || [],
      users: card.users || [],
      list: card.list,
    },
  };

  if (card.recurrenceRule) {
    const rrule = parseRecurrenceRule(card.recurrenceRule, startDate, isAllDay);

    if (!rrule) {
      return null;
    }

    return {
      ...baseEvent,
      rrule,
      duration: getDuration(startDate, card.endDate, isAllDay),
    };
  }

  return {
    ...baseEvent,
    start: startDate,
    end: normalizeFullCalendarEnd(startDate, endDate, isAllDay),
  };
};

export const eventDropToCardData = ({ event, oldEvent }) => {
  const isAllDay = event.allDay;
  const baseStartDate = event.extendedProps.startDate || oldEvent.start;
  const baseEndDate =
    event.extendedProps.endDate ||
    oldEvent.end ||
    normalizeFullCalendarEnd(oldEvent.start, null, oldEvent.allDay);

  const deltaInMs = event.start.getTime() - oldEvent.start.getTime();
  const startDate = addMilliseconds(baseStartDate, deltaInMs);
  const endDate = addMilliseconds(baseEndDate, deltaInMs);

  return {
    startDate,
    endDate,
    isAllDay,
    dueDate: getDueDateForSchedule(startDate, endDate, isAllDay),
  };
};

export const eventResizeToCardData = ({ event }) => {
  const isAllDay = event.allDay;
  const durationInMs =
    (event.end || normalizeFullCalendarEnd(event.start, null, isAllDay)).getTime() -
    event.start.getTime();

  const startDate = event.extendedProps.startDate || event.start;
  const endDate = addMilliseconds(startDate, durationInMs);

  return {
    endDate,
    isAllDay,
    dueDate: getDueDateForSchedule(startDate, endDate, isAllDay),
  };
};

export const selectionToCardDefaults = ({ start, end, allDay }) => {
  const startDate = cloneDate(start);
  const endDate = cloneDate(end) || normalizeFullCalendarEnd(startDate, null, allDay);

  return {
    startDate,
    endDate,
    isAllDay: allDay,
    dueDate: getDueDateForSchedule(startDate, endDate, allDay),
  };
};

export const dateClickToCardDefaults = ({ date, allDay }) => {
  const startDate = cloneDate(date);
  const endDate = normalizeFullCalendarEnd(startDate, null, allDay);

  return {
    startDate,
    endDate,
    isAllDay: allDay,
    dueDate: getDueDateForSchedule(startDate, endDate, allDay),
  };
};

export const buildRecurrenceRule = ({ frequency, interval, weekdays, endType, until, count }) => {
  if (!frequency) {
    return null;
  }

  const fields = [`FREQ=${frequency}`, `INTERVAL=${interval || 1}`];

  if (frequency === 'WEEKLY' && weekdays && weekdays.length > 0) {
    fields.push(`BYDAY=${weekdays.join(',')}`);
  }

  if (endType === 'onDate' && until) {
    const year = until.getUTCFullYear();
    const month = `${until.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${until.getUTCDate()}`.padStart(2, '0');
    fields.push(`UNTIL=${year}${month}${day}T235959Z`);
  } else if (endType === 'after' && count) {
    fields.push(`COUNT=${count}`);
  }

  return fields.join(';');
};
