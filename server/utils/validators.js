/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const validator = require('validator');
const zxcvbn = require('zxcvbn');
const moment = require('moment');

const MAX_STRING_ID = '9223372036854775807';

const ID_REGEX = /^[1-9][0-9]*$/;
const IDS_WITH_COMMA_REGEX = /^[1-9][0-9]*(,[1-9][0-9]*)*$/;
const USERNAME_REGEX = /^[a-zA-Z0-9]+((_|\.)?[a-zA-Z0-9])*$/;
const RRULE_DATE_REGEX = /^\d{8}(T\d{6}Z?)?$/;
const TIMEZONE_REGEX = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-.]+)+$/;

const RRULE_ALLOWED_KEYS = new Set([
  'FREQ',
  'INTERVAL',
  'COUNT',
  'UNTIL',
  'BYDAY',
  'BYMONTHDAY',
  'BYMONTH',
]);

const RRULE_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const RRULE_WEEKDAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

const is = (defaultValue) => (value) => value === defaultValue;

const isUrl = (value) =>
  validator.isURL(value, {
    protocols: ['http', 'https'],
    require_tld: false,
    require_protocol: true,
  });

const isIdInRange = (value) => value.length < MAX_STRING_ID.length || value <= MAX_STRING_ID;

const isIdsWithCommaInRange = (value) => _.every(value.split(','), isIdInRange);

const isId = (value) =>
  value.length <= MAX_STRING_ID.length && ID_REGEX.test(value) && isIdInRange(value);

const isIds = (values) => _.every(values, isId);

const isPassword = (value) => zxcvbn(value).score >= 2; // TODO: move to config

const isEmailOrUsername = (value) =>
  value.includes('@')
    ? validator.isEmail(value)
    : value.length >= 3 && value.length <= 32 && USERNAME_REGEX.test(value);

const isDueDate = (value) => moment(value, moment.ISO_8601, true).isValid();

const isCalendarDate = isDueDate;

const isCalendarEndDate = (value, startDate) => {
  if (!isCalendarDate(value)) {
    return false;
  }

  if (!startDate) {
    return true;
  }

  return moment(value).isAfter(moment(startDate));
};

const parsePositiveInteger = (value) => {
  if (!/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  return Number(value);
};

const isRRuleDate = (value) => {
  if (!RRULE_DATE_REGEX.test(value)) {
    return false;
  }

  const formats = ['YYYYMMDD', 'YYYYMMDDTHHmmss', 'YYYYMMDDTHHmmss[Z]'];
  return moment(value, formats, true).isValid();
};

const isRRuleWeekdayList = (value) =>
  value.split(',').every((part) => {
    const match = part.match(/^([+-]?\d{1,2})?([A-Z]{2})$/);

    if (!match || !RRULE_WEEKDAYS.has(match[2])) {
      return false;
    }

    if (match[1]) {
      const ordinal = Number(match[1]);
      return ordinal >= -53 && ordinal <= 53 && ordinal !== 0;
    }

    return true;
  });

const isRRuleNumberList = (value, min, max, allowNegative = false) =>
  value.split(',').every((part) => {
    if (!/^-?[0-9]+$/.test(part)) {
      return false;
    }

    const number = Number(part);

    if (!allowNegative && number < 0) {
      return false;
    }

    return number >= min && number <= max && number !== 0;
  });

const isRecurrenceRule = (value) => {
  if (!_.isString(value) || value.length > 1024) {
    return false;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  const normalizedValue = trimmedValue.startsWith('RRULE:')
    ? trimmedValue.substring('RRULE:'.length)
    : trimmedValue;

  const fields = normalizedValue.split(';');
  const valuesByKey = {};

  if (fields.length === 0) {
    return false;
  }

  return (
    fields.every((field) => {
      const [key, fieldValue, ...rest] = field.split('=');

      if (!key || !fieldValue || rest.length > 0) {
        return false;
      }

      const normalizedKey = key.toUpperCase();
      const normalizedFieldValue = fieldValue.toUpperCase();

      if (!RRULE_ALLOWED_KEYS.has(normalizedKey) || valuesByKey[normalizedKey]) {
        return false;
      }

      valuesByKey[normalizedKey] = normalizedFieldValue;

      switch (normalizedKey) {
        case 'FREQ':
          return RRULE_FREQUENCIES.has(normalizedFieldValue);
        case 'INTERVAL': {
          const interval = parsePositiveInteger(normalizedFieldValue);
          return interval !== null && interval <= 365;
        }
        case 'COUNT': {
          const count = parsePositiveInteger(normalizedFieldValue);
          return count !== null && count <= 1000;
        }
        case 'UNTIL':
          return isRRuleDate(normalizedFieldValue);
        case 'BYDAY':
          return isRRuleWeekdayList(normalizedFieldValue);
        case 'BYMONTHDAY':
          return isRRuleNumberList(normalizedFieldValue, -31, 31, true);
        case 'BYMONTH':
          return isRRuleNumberList(normalizedFieldValue, 1, 12);
        default:
          return false;
      }
    }) && !!valuesByKey.FREQ
  );
};

const isTimezone = (value) => {
  if (!_.isString(value) || value.length > 128) {
    return false;
  }

  if (value === 'UTC') {
    return true;
  }

  if (!TIMEZONE_REGEX.test(value)) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, {
      timeZone: value,
    });
  } catch (error) {
    return !error;
  }

  return true;
};

const isStopwatch = (value) => {
  if (!_.isPlainObject(value) || _.size(value) !== 2) {
    return false;
  }

  if (!_.isNull(value.startedAt) && !moment(value.startedAt, moment.ISO_8601, true).isValid()) {
    return false;
  }

  if (!_.isFinite(value.total) || value.total < 0) {
    return false;
  }

  return true;
};

module.exports = {
  MAX_STRING_ID,

  ID_REGEX,
  IDS_WITH_COMMA_REGEX,
  USERNAME_REGEX,

  is,
  isUrl,
  isIdInRange,
  isIdsWithCommaInRange,
  isId,
  isIds,
  isPassword,
  isEmailOrUsername,
  isDueDate,
  isCalendarDate,
  isCalendarEndDate,
  isRecurrenceRule,
  isTimezone,
  isStopwatch,
};
