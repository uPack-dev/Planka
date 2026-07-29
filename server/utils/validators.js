/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const validator = require('validator');
const zxcvbn = require('zxcvbn');
const moment = require('moment');
const { normalizeRecurrenceRule } = require('./recurrence');

const MAX_STRING_ID = '9223372036854775807';

const ID_REGEX = /^[1-9][0-9]*$/;
const IDS_WITH_COMMA_REGEX = /^[1-9][0-9]*(,[1-9][0-9]*)*$/;
const USERNAME_REGEX = /^[a-zA-Z0-9]+((_|\.)?[a-zA-Z0-9])*$/;
const TIMEZONE_REGEX = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-.]+)+$/;

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

const isRecurrenceRule = (value) => {
  try {
    normalizeRecurrenceRule(value);
  } catch (error) {
    return false;
  }

  return true;
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
