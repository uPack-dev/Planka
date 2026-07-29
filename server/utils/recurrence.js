/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { rrulestr } = require('rrule');

const ALLOWED_KEYS = ['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'BYMONTHDAY', 'BYMONTH'];
const ALLOWED_KEY_SET = new Set(ALLOWED_KEYS);

const ALLOWED_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const WEEKDAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

const MAX_INTERVAL = 365;
const MAX_COUNT = 1000;

const GREGORIAN_CYCLE_IN_YEARS = 400;

const RecurrenceErrorCodes = {
  INVALID: 'invalidRecurrence',
  START_DATE_REQUIRED: 'recurrenceStartDateRequired',
  NEVER_REPEATS: 'recurrenceNeverRepeats',
};

class RecurrenceError extends Error {
  constructor(message, code = RecurrenceErrorCodes.INVALID) {
    super(message);
    this.code = code;
  }
}

const fail = (message, code) => {
  throw new RecurrenceError(message, code);
};

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
    if (!match || !WEEKDAYS.has(match[2])) {
      return false;
    }

    if (!match[1]) {
      return true;
    }

    const ordinal = Number(match[1]);
    return ordinal >= -53 && ordinal <= 53 && ordinal !== 0;
  });

const formatDateParts = (date, timeZone) =>
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

// Difference between the wall clock in `timeZone` and the actual instant, in milliseconds.
const getZoneOffset = (date, timeZone) => {
  const parts = formatDateParts(date, timeZone);

  return (
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ) - date.getTime()
  );
};

// rrule resolves TZID against the timezone of the running process rather than the requested
// one (see rrule's dateutil.dateInTimeZone), so every rule is built and iterated in plain wall
// clock time instead, and instants are converted on the way in and out.
const toWallClock = (date, timeZone) => new Date(date.getTime() + getZoneOffset(date, timeZone));

const fromWallClock = (wallDate, timeZone) => {
  const approximate = new Date(wallDate.getTime() - getZoneOffset(wallDate, timeZone));
  return new Date(wallDate.getTime() - getZoneOffset(approximate, timeZone));
};

const formatWallClock = (wallDate) =>
  `${wallDate.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;

const parseUntilToInstant = (value, timeZone) => {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);

  if (!match) {
    fail('Invalid recurrence rule');
  }

  const [, year, month, day, hour, minute, second, zulu] = match;
  const wallDate = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour || 0),
      Number(minute || 0),
      Number(second || 0),
    ),
  );

  if (
    wallDate.getUTCFullYear() !== Number(year) ||
    wallDate.getUTCMonth() !== Number(month) - 1 ||
    wallDate.getUTCDate() !== Number(day) ||
    wallDate.getUTCHours() !== Number(hour || 0) ||
    wallDate.getUTCMinutes() !== Number(minute || 0) ||
    wallDate.getUTCSeconds() !== Number(second || 0)
  ) {
    fail('Invalid recurrence rule');
  }

  if (hour === undefined) {
    // A date-only UNTIL covers the whole day in the recurrence timezone.
    return fromWallClock(
      new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59)),
      timeZone,
    );
  }

  // Without a trailing Z the value is a floating time, so it already is a wall clock time.
  return zulu ? wallDate : fromWallClock(wallDate, timeZone);
};

const parseFields = (value) => {
  if (typeof value !== 'string' || value.length > 1024) {
    fail('Invalid recurrence rule');
  }

  const rule = value.trim().replace(/^RRULE:/i, '');
  if (!rule) {
    fail('Invalid recurrence rule');
  }

  const fields = {};
  rule.split(';').forEach((field) => {
    const [key, fieldValue, ...rest] = field.split('=');
    const normalizedKey = key && key.toUpperCase();
    const normalizedValue = fieldValue && fieldValue.toUpperCase();

    if (
      !normalizedKey ||
      !normalizedValue ||
      rest.length > 0 ||
      !ALLOWED_KEY_SET.has(normalizedKey) ||
      fields[normalizedKey]
    ) {
      fail('Invalid recurrence rule');
    }

    fields[normalizedKey] = normalizedValue;
  });

  if (!ALLOWED_FREQUENCIES.has(fields.FREQ)) {
    fail('Invalid recurrence rule');
  }

  if (fields.COUNT && fields.UNTIL) {
    fail('COUNT and UNTIL cannot be used together');
  }

  if (
    (fields.BYDAY && !isWeekdayList(fields.BYDAY)) ||
    (fields.BYMONTHDAY && !isIntegerListInRange(fields.BYMONTHDAY, -31, 31)) ||
    (fields.BYMONTH && !isIntegerListInRange(fields.BYMONTH, 1, 12))
  ) {
    fail('Invalid recurrence rule');
  }

  if (fields.INTERVAL) {
    const interval = Number(fields.INTERVAL);

    if (!/^[1-9][0-9]*$/.test(fields.INTERVAL) || interval > MAX_INTERVAL) {
      fail('Invalid recurrence interval');
    }
  }

  if (fields.COUNT) {
    const count = Number(fields.COUNT);

    if (!/^[1-9][0-9]*$/.test(fields.COUNT) || count > MAX_COUNT) {
      fail('Invalid recurrence count');
    }
  }

  if (fields.UNTIL) {
    if (!/^\d{8}(T\d{6}Z?)?$/.test(fields.UNTIL)) {
      fail('Invalid recurrence rule');
    }

    parseUntilToInstant(fields.UNTIL, 'UTC');
  }

  return fields;
};

const MAX_DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const MAX_WEEKDAY_ORDINAL_IN_MONTH = 5;
const MAX_WEEKDAY_ORDINAL_IN_YEAR = 53;

// rrule keeps iterating towards its year 9999 limit when a rule can never match, and neither
// UNTIL, COUNT nor a bounded between() stops it. Unsatisfiable BY* combinations are therefore
// rejected before rrule ever sees them.
function assertSatisfiable(fields) {
  const months = fields.BYMONTH
    ? fields.BYMONTH.split(',').map(Number)
    : MAX_DAYS_IN_MONTH.map((value, index) => index + 1);

  if (fields.BYMONTHDAY) {
    const monthDays = fields.BYMONTHDAY.split(',').map(Number);

    const isReachable = months.some((month) =>
      monthDays.some((monthDay) => Math.abs(monthDay) <= MAX_DAYS_IN_MONTH[month - 1]),
    );

    if (!isReachable) {
      fail('Recurrence never repeats', RecurrenceErrorCodes.NEVER_REPEATS);
    }
  }

  if (fields.BYDAY) {
    const ordinals = fields.BYDAY.split(',')
      .map((weekday) => weekday.match(/^([+-]?\d{1,2})/))
      .filter(Boolean)
      .map(([, ordinal]) => Math.abs(Number(ordinal)));

    if (ordinals.length === 0) {
      return;
    }

    if (fields.FREQ === 'DAILY' || fields.FREQ === 'WEEKLY') {
      fail('Invalid recurrence rule');
    }

    const maxOrdinal =
      fields.FREQ === 'MONTHLY' || fields.BYMONTH
        ? MAX_WEEKDAY_ORDINAL_IN_MONTH
        : MAX_WEEKDAY_ORDINAL_IN_YEAR;

    if (ordinals.some((ordinal) => ordinal > maxOrdinal)) {
      fail('Recurrence never repeats', RecurrenceErrorCodes.NEVER_REPEATS);
    }
  }
}

const serializeFields = (fields) =>
  ALLOWED_KEYS.flatMap((key) => (fields[key] ? [`${key}=${fields[key]}`] : [])).join(';');

// Syntactic normalization only; whether the rule ever produces an occurrence is decided in
// getRecurrenceMetadata, where the start date and timezone are known.
const normalizeRecurrenceRule = (value) => serializeFields(parseFields(value));

const getLookupUpperBound = (afterWallClock, fields) => {
  const interval = fields.INTERVAL ? Number(fields.INTERVAL) : 1;
  const years =
    fields.FREQ === 'YEARLY'
      ? Math.max(GREGORIAN_CYCLE_IN_YEARS, interval * 4)
      : GREGORIAN_CYCLE_IN_YEARS;
  const upperBound = new Date(afterWallClock);

  upperBound.setUTCFullYear(Math.min(upperBound.getUTCFullYear() + years, 9999));

  return upperBound;
};

const buildRule = ({ recurrenceRule, seriesStartAt, timeZone, isAllDay }) => {
  const fields = parseFields(recurrenceRule);
  assertSatisfiable(fields);
  const normalizedRule = serializeFields(fields);

  const seriesStart = new Date(seriesStartAt);
  if (Number.isNaN(seriesStart.getTime())) {
    fail('A recurring card must have a start date', RecurrenceErrorCodes.START_DATE_REQUIRED);
  }

  const startWallClock = toWallClock(seriesStart, timeZone);
  const dtStartWallClock = isAllDay
    ? new Date(
        Date.UTC(
          startWallClock.getUTCFullYear(),
          startWallClock.getUTCMonth(),
          startWallClock.getUTCDate(),
        ),
      )
    : startWallClock;

  const iterationFields = { ...fields };
  if (fields.UNTIL) {
    if (!isAllDay && !fields.UNTIL.endsWith('Z')) {
      fail('Timed recurrence UNTIL must be UTC');
    }

    const untilAt = parseUntilToInstant(fields.UNTIL, timeZone);

    if (untilAt < fromWallClock(dtStartWallClock, timeZone)) {
      fail('Recurrence must not end before it starts');
    }

    iterationFields.UNTIL = formatWallClock(toWallClock(untilAt, timeZone));
  }

  let rule;
  try {
    rule = rrulestr(
      `DTSTART:${formatWallClock(dtStartWallClock)}\nRRULE:${serializeFields(iterationFields)}`,
    );
  } catch (error) {
    fail('Invalid recurrence rule');
  }

  return { fields, normalizedRule, rule, dtStartWallClock };
};

const findNextWallClock = (rule, fields, afterWallClock) => {
  const upperBound = getLookupUpperBound(afterWallClock, fields);
  let next = null;

  rule.between(afterWallClock, upperBound, false, (date) => {
    next = date;
    return false;
  });

  return next;
};

const getRecurrenceMetadata = ({
  recurrenceRule,
  seriesStartAt,
  occurrenceAt = seriesStartAt,
  timeZone,
  isAllDay,
}) => {
  const { fields, normalizedRule, rule, dtStartWallClock } = buildRule({
    recurrenceRule,
    seriesStartAt,
    timeZone,
    isAllDay,
  });

  const occurrenceWallClock = toWallClock(new Date(occurrenceAt), timeZone);
  const nextWallClock = findNextWallClock(
    rule,
    fields,
    occurrenceWallClock < dtStartWallClock ? dtStartWallClock : occurrenceWallClock,
  );

  let untilWallClock = null;
  if (fields.COUNT) {
    // COUNT is capped at 1000 by the parser.
    const occurrences = findNextWallClock(rule, fields, dtStartWallClock) ? rule.all() : [];
    untilWallClock = occurrences[occurrences.length - 1] || null;
  } else if (fields.UNTIL) {
    untilWallClock = toWallClock(parseUntilToInstant(fields.UNTIL, timeZone), timeZone);
  }

  return {
    recurrenceRule: normalizedRule,
    recurrenceUntil: untilWallClock ? fromWallClock(untilWallClock, timeZone).toISOString() : null,
    recurrenceNextAt: nextWallClock ? fromWallClock(nextWallClock, timeZone).toISOString() : null,
  };
};

// Latest occurrence at or before `at`, used to skip occurrences a stopped server missed.
const getOccurrenceAtOrBefore = ({ recurrenceRule, seriesStartAt, at, timeZone, isAllDay }) => {
  const { rule } = buildRule({ recurrenceRule, seriesStartAt, timeZone, isAllDay });
  const wallClock = rule.before(toWallClock(new Date(at), timeZone), true);

  return wallClock ? fromWallClock(wallClock, timeZone) : null;
};

const RELEVANT_KEYS = ['recurrenceRule', 'recurrenceTimezone', 'startDate', 'dueDate', 'isAllDay'];

const DERIVED_KEYS = [
  'recurrenceUntil',
  'recurrenceSeriesStartAt',
  'recurrenceOccurrenceAt',
  'recurrenceNextAt',
];

const normalizeCardRecurrenceValues = (values, currentCard = {}) => {
  // Derived fields are server-owned and are never accepted from the outside.
  DERIVED_KEYS.forEach((key) => {
    // eslint-disable-next-line no-param-reassign
    delete values[key];
  });

  if (!RELEVANT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(values, key))) {
    return values;
  }

  const recurrenceRule =
    values.recurrenceRule === undefined ? currentCard.recurrenceRule : values.recurrenceRule;

  if (!recurrenceRule) {
    if (values.recurrenceRule === null) {
      Object.assign(values, {
        recurrenceRule: null,
        recurrenceUntil: null,
        recurrenceTimezone: null,
        recurrenceSeriesStartAt: null,
        recurrenceNextAt: null,
      });
    } else {
      // A timezone without a rule has nothing to apply to.
      // eslint-disable-next-line no-param-reassign
      delete values.recurrenceTimezone;
    }

    return values;
  }

  const startDate = values.startDate === undefined ? currentCard.startDate : values.startDate;
  const dueDate = values.dueDate === undefined ? currentCard.dueDate : values.dueDate;
  const seriesStartAt = startDate || dueDate;

  if (!seriesStartAt || Number.isNaN(new Date(seriesStartAt).getTime())) {
    fail('A recurring card must have a start date', RecurrenceErrorCodes.START_DATE_REQUIRED);
  }

  const recurrenceTimezone =
    values.recurrenceTimezone === undefined
      ? currentCard.recurrenceTimezone || 'UTC'
      : values.recurrenceTimezone || 'UTC';

  let { isAllDay } = values;
  if (isAllDay === undefined) {
    isAllDay = currentCard.isAllDay === undefined ? true : currentCard.isAllDay;
  }

  const metadata = getRecurrenceMetadata({
    recurrenceRule,
    seriesStartAt,
    timeZone: recurrenceTimezone,
    isAllDay,
  });

  if (!metadata.recurrenceNextAt) {
    fail('Recurrence never repeats', RecurrenceErrorCodes.NEVER_REPEATS);
  }

  Object.assign(values, metadata, {
    recurrenceTimezone,
    recurrenceSeriesStartAt: new Date(seriesStartAt).toISOString(),
    recurrenceOccurrenceAt: new Date(seriesStartAt).toISOString(),
  });

  return values;
};

module.exports = {
  RecurrenceError,
  RecurrenceErrorCodes,
  normalizeRecurrenceRule,
  getRecurrenceMetadata,
  getOccurrenceAtOrBefore,
  normalizeCardRecurrenceValues,
};
