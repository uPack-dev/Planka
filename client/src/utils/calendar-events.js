/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { rrulestr } from 'rrule';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMED_DURATION_IN_MS = 60 * 60 * 1000;
const RECURRENCE_KEYS = new Set([
  'FREQ',
  'INTERVAL',
  'COUNT',
  'UNTIL',
  'BYDAY',
  'BYMONTHDAY',
  'BYMONTH',
]);
const RECURRENCE_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const RECURRENCE_WEEKDAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

const isIntegerListInRange = (value, min, max) =>
  value.split(',').every((part) => {
    if (!/^-?[0-9]+$/.test(part)) {
      return false;
    }

    const number = Number(part);
    return number >= min && number <= max && number !== 0;
  });

const isWeekdayList = (value) =>
  value.split(',').every((part) => {
    const match = part.match(/^([+-]?\d{1,2})?([A-Z]{2})$/);
    if (!match || !RECURRENCE_WEEKDAYS.has(match[2])) {
      return false;
    }

    if (!match[1]) {
      return true;
    }

    const ordinal = Number(match[1]);
    return ordinal >= -53 && ordinal <= 53 && ordinal !== 0;
  });

const cloneDate = (date) => (date ? new Date(date.getTime()) : null);

const addMilliseconds = (date, milliseconds) =>
  date ? new Date(date.getTime() + milliseconds) : null;

const addDays = (date, days) => {
  if (!date) {
    return null;
  }

  const result = cloneDate(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addCalendarDuration = (date, duration, fallbackMilliseconds = 0) => {
  if (!date) {
    return null;
  }

  if (!duration) {
    return addMilliseconds(date, fallbackMilliseconds);
  }

  const result = cloneDate(date);
  result.setFullYear(result.getFullYear() + (duration.years || 0));
  result.setMonth(result.getMonth() + (duration.months || 0));
  result.setDate(result.getDate() + (duration.days || 0));
  result.setTime(result.getTime() + (duration.milliseconds || 0));
  return result;
};

const getDateParts = (date, timeZone) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );

const buildDtStart = (date, isAllDay, timeZone) => {
  const parts = getDateParts(date, timeZone);
  const dateValue = `${parts.year}${parts.month}${parts.day}`;
  const timeValue = isAllDay ? '000000' : `${parts.hour}${parts.minute}${parts.second}`;
  return timeZone === 'UTC'
    ? `DTSTART:${dateValue}T${timeValue}Z`
    : `DTSTART;TZID=${timeZone}:${dateValue}T${timeValue}`;
};

const getDefaultEndDate = (startDate, isAllDay) =>
  isAllDay ? addDays(startDate, 1) : addMilliseconds(startDate, DEFAULT_TIMED_DURATION_IN_MS);

const getDuration = (startDate, endDate, isAllDay) => {
  if (!startDate) {
    return null;
  }

  const normalizedEndDate = endDate || getDefaultEndDate(startDate, isAllDay);
  const durationInMs = normalizedEndDate.getTime() - startDate.getTime();

  if (isAllDay) {
    const startDay = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = Date.UTC(
      normalizedEndDate.getFullYear(),
      normalizedEndDate.getMonth(),
      normalizedEndDate.getDate(),
    );

    return {
      days: Math.max(Math.round((endDay - startDay) / DAY_IN_MS), 1),
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

const normalizeRecurrenceRule = (recurrenceRule) =>
  recurrenceRule
    .trim()
    .replace(/^RRULE:/i, '')
    .toUpperCase();

export const parseRecurrenceFields = (recurrenceRule) =>
  normalizeRecurrenceRule(recurrenceRule)
    .split(';')
    .reduce((result, field) => {
      const [key, value, ...rest] = field.split('=');

      if (!key || !value || rest.length > 0 || result[key]) {
        throw new Error('Invalid recurrence rule');
      }

      return {
        ...result,
        [key]: value,
      };
    }, {});

export const parseRecurrenceRule = (
  recurrenceRule,
  startDate,
  isAllDay,
  recurrenceTimezone = 'UTC',
) => {
  if (!recurrenceRule || !startDate) {
    return null;
  }

  const normalizedRule = normalizeRecurrenceRule(recurrenceRule);
  return `${buildDtStart(startDate, isAllDay, recurrenceTimezone)}\nRRULE:${normalizedRule}`;
};

export const validateRecurrenceRule = (recurrenceRule, startDate, isAllDay, recurrenceTimezone) => {
  const fields = parseRecurrenceFields(recurrenceRule);
  const interval = fields.INTERVAL ? Number(fields.INTERVAL) : 1;
  const count = fields.COUNT ? Number(fields.COUNT) : null;

  if (
    !RECURRENCE_FREQUENCIES.has(fields.FREQ) ||
    Object.keys(fields).some((key) => !RECURRENCE_KEYS.has(key)) ||
    (fields.COUNT && fields.UNTIL) ||
    (fields.INTERVAL && !/^[1-9][0-9]*$/.test(fields.INTERVAL)) ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    interval > 365 ||
    (count !== null &&
      (!/^[1-9][0-9]*$/.test(fields.COUNT) ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 1000)) ||
    (fields.BYDAY && !isWeekdayList(fields.BYDAY)) ||
    (fields.BYMONTHDAY && !isIntegerListInRange(fields.BYMONTHDAY, -31, 31)) ||
    (fields.BYMONTH && !isIntegerListInRange(fields.BYMONTH, 1, 12)) ||
    (!isAllDay && fields.UNTIL && !/^\d{8}T\d{6}Z$/.test(fields.UNTIL))
  ) {
    throw new Error('Invalid recurrence rule');
  }

  rrulestr(parseRecurrenceRule(recurrenceRule, startDate, isAllDay, recurrenceTimezone));
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
      recurrenceTimezone: card.recurrenceTimezone,
      labels: card.labels || [],
      users: card.users || [],
      list: card.list,
    },
  };

  if (card.recurrenceRule) {
    const rrule = parseRecurrenceRule(
      card.recurrenceRule,
      startDate,
      isAllDay,
      card.recurrenceTimezone || 'UTC',
    );

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

export const eventDropToCardData = ({ event, oldEvent, delta }) => {
  const isAllDay = event.allDay;
  const baseStartDate = event.extendedProps.startDate || oldEvent.start;
  const baseEndDate =
    event.extendedProps.endDate ||
    oldEvent.end ||
    normalizeFullCalendarEnd(oldEvent.start, null, oldEvent.allDay);

  const deltaInMs = event.start.getTime() - oldEvent.start.getTime();
  const startDate = addCalendarDuration(baseStartDate, delta, deltaInMs);
  const endDate = addCalendarDuration(baseEndDate, delta, deltaInMs);

  return {
    startDate,
    endDate,
    isAllDay,
    dueDate: getDueDateForSchedule(startDate, endDate, isAllDay),
  };
};

export const eventResizeToCardData = ({ event, endDelta }) => {
  const isAllDay = event.allDay;
  const startDate = event.extendedProps.startDate || event.start;
  const baseEndDate =
    event.extendedProps.endDate || normalizeFullCalendarEnd(startDate, null, isAllDay);
  const fallbackDeltaInMs =
    (event.end || normalizeFullCalendarEnd(event.start, null, isAllDay)).getTime() -
    event.start.getTime() -
    (baseEndDate.getTime() - startDate.getTime());
  const endDate = addCalendarDuration(baseEndDate, endDelta, fallbackDeltaInMs);

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
    const endOfDay = new Date(until.getFullYear(), until.getMonth(), until.getDate(), 23, 59, 59);
    const untilValue = endOfDay.toISOString().replace(/[-:]/g, '').replace('.000', '');
    fields.push(`UNTIL=${untilValue}`);
  } else if (endType === 'after' && count) {
    fields.push(`COUNT=${count}`);
  }

  return fields.join(';');
};
