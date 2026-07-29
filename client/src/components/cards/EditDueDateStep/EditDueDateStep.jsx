/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { Button, Form, Message } from 'semantic-ui-react';
import { useDidUpdate, useToggle } from '../../../lib/hooks';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import parseTime from '../../../utils/parse-time';
import {
  buildRecurrenceRule,
  parseRecurrenceFields,
  validateRecurrenceRule,
} from '../../../utils/calendar-events';

import styles from './EditDueDateStep.module.scss';

const DEFAULT_TIMED_DURATION_IN_MS = 60 * 60 * 1000;

const RecurrenceModes = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
};

const RecurrenceEndTypes = {
  NEVER: 'never',
  ON_DATE: 'onDate',
  AFTER: 'after',
};

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

const addMilliseconds = (date, milliseconds) => new Date(date.getTime() + milliseconds);
const addDays = (date, days) => {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (t, value) =>
  t('format:date', {
    postProcess: 'formatDate',
    value,
  });

const formatTime = (t, value) =>
  t('format:time', {
    postProcess: 'formatDate',
    value,
  });

const parseDate = (t, value) =>
  t('format:date', {
    postProcess: 'parseDate',
    value,
  });

const parseDateTime = (t, dateValue, timeValue) =>
  t('format:dateTime', {
    postProcess: 'parseDate',
    value: `${dateValue} ${timeValue}`,
  });

const getVisibleEndDate = (card) => {
  const startDate = card.startDate || card.dueDate || new Date(new Date().setHours(12, 0, 0, 0));
  const isAllDay = card.isAllDay ?? !card.startDate;

  if (card.endDate) {
    return isAllDay ? addDays(card.endDate, -1) : card.endDate;
  }

  return addMilliseconds(startDate, isAllDay ? 0 : DEFAULT_TIMED_DURATION_IN_MS);
};

const parseRecurrenceData = (recurrenceRule, recurrenceUntil, t) => {
  if (!recurrenceRule) {
    return {
      recurrenceMode: RecurrenceModes.NONE,
      recurrenceInterval: 1,
      recurrenceWeekdays: [],
      recurrenceEndType: RecurrenceEndTypes.NEVER,
      recurrenceUntilDate: formatDate(t, recurrenceUntil || new Date()),
      recurrenceCount: 10,
      customRecurrenceRule: '',
      recurrenceError: false,
    };
  }

  let fields;
  try {
    fields = parseRecurrenceFields(recurrenceRule);
  } catch (error) {
    return {
      recurrenceMode: RecurrenceModes.CUSTOM,
      recurrenceInterval: 1,
      recurrenceWeekdays: [],
      recurrenceEndType: RecurrenceEndTypes.NEVER,
      recurrenceUntilDate: formatDate(t, recurrenceUntil || new Date()),
      recurrenceCount: 10,
      customRecurrenceRule: recurrenceRule,
      recurrenceError: true,
    };
  }

  const recurrenceModeByFrequency = {
    DAILY: RecurrenceModes.DAILY,
    WEEKLY: RecurrenceModes.WEEKLY,
    MONTHLY: RecurrenceModes.MONTHLY,
    YEARLY: RecurrenceModes.YEARLY,
  };

  const keys = Object.keys(fields);
  const simpleKeys = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL']);
  if (fields.FREQ === 'WEEKLY') {
    simpleKeys.add('BYDAY');
  }

  const hasUnsupportedSimpleField =
    keys.some((key) => !simpleKeys.has(key)) ||
    (fields.BYDAY && fields.BYDAY.split(',').some((weekday) => /^[-+]?\d/.test(weekday)));

  let recurrenceEndType = RecurrenceEndTypes.NEVER;

  if (fields.UNTIL) {
    recurrenceEndType = RecurrenceEndTypes.ON_DATE;
  } else if (fields.COUNT) {
    recurrenceEndType = RecurrenceEndTypes.AFTER;
  }

  return {
    recurrenceMode:
      !hasUnsupportedSimpleField && recurrenceModeByFrequency[fields.FREQ]
        ? recurrenceModeByFrequency[fields.FREQ]
        : RecurrenceModes.CUSTOM,
    recurrenceInterval: fields.INTERVAL || 1,
    recurrenceWeekdays: fields.BYDAY ? fields.BYDAY.split(',') : [],
    recurrenceEndType,
    recurrenceUntilDate: formatDate(t, recurrenceUntil || new Date()),
    recurrenceCount: fields.COUNT || 10,
    customRecurrenceRule: recurrenceRule,
    recurrenceError: false,
  };
};

const EditDueDateStep = React.memo(({ cardId, onBack, onClose }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const card = useSelector((state) => selectCardById(state, cardId));

  const dispatch = useDispatch();
  const [t, i18n] = useTranslation();
  const recurrenceTimezone =
    card.recurrenceTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const [data, handleFieldChange, setData] = useForm(() => {
    const startDate = card.startDate || card.dueDate || new Date(new Date().setHours(12, 0, 0, 0));
    const endDate = getVisibleEndDate(card);
    const recurrenceData = parseRecurrenceData(card.recurrenceRule, card.recurrenceUntil, t);

    return {
      startDate: formatDate(t, startDate),
      startTime: formatTime(t, startDate),
      endDate: formatDate(t, endDate),
      endTime: formatTime(t, endDate),
      isAllDay: card.isAllDay ?? !card.startDate,
      ...recurrenceData,
    };
  });

  const [selectStartTimeFieldState, selectStartTimeField] = useToggle();

  const [startDateFieldRef, handleStartDateFieldRef] = useNestedRef('inputRef');
  const [startTimeFieldRef, handleStartTimeFieldRef] = useNestedRef('inputRef');
  const [endDateFieldRef, handleEndDateFieldRef] = useNestedRef('inputRef');
  const [endTimeFieldRef, handleEndTimeFieldRef] = useNestedRef('inputRef');

  const handleFormFieldChange = useCallback(
    (event, fieldData) => {
      handleFieldChange(event, fieldData);
      setData((prevData) => ({
        ...prevData,
        recurrenceError: false,
      }));
    },
    [handleFieldChange, setData],
  );

  const nullableStartDate = useMemo(() => {
    const date = parseDate(t, data.startDate);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }, [data.startDate, t]);

  const saveSchedule = useCallback(
    (recurrenceScope) => {
      const startDateOnly = parseDate(t, data.startDate);
      const endDateOnly = parseDate(t, data.endDate);

      if (Number.isNaN(startDateOnly.getTime())) {
        startDateFieldRef.current.select();
        return;
      }

      if (Number.isNaN(endDateOnly.getTime())) {
        endDateFieldRef.current.select();
        return;
      }

      let startDate;
      let endDate;

      if (data.isAllDay) {
        startDate = startDateOnly;
        endDate = addDays(endDateOnly, 1);
      } else {
        startDate = parseDateTime(t, data.startDate, data.startTime);

        if (Number.isNaN(startDate.getTime())) {
          startDate = parseTime(data.startTime, startDateOnly);

          if (Number.isNaN(startDate.getTime())) {
            startTimeFieldRef.current.select();
            return;
          }
        }

        endDate = parseDateTime(t, data.endDate, data.endTime);

        if (Number.isNaN(endDate.getTime())) {
          endDate = parseTime(data.endTime, endDateOnly);

          if (Number.isNaN(endDate.getTime())) {
            endTimeFieldRef.current.select();
            return;
          }
        }
      }

      if (endDate.getTime() <= startDate.getTime()) {
        endDateFieldRef.current.select();
        return;
      }

      let recurrenceRule = null;
      let recurrenceUntil = null;
      if (data.recurrenceMode === RecurrenceModes.CUSTOM) {
        recurrenceRule = data.customRecurrenceRule.trim() || null;
      } else if (data.recurrenceMode !== RecurrenceModes.NONE) {
        const frequency = data.recurrenceMode.toUpperCase();
        const interval = Number(data.recurrenceInterval);
        const count = Number(data.recurrenceCount);

        if (
          !Number.isInteger(interval) ||
          interval < 1 ||
          interval > 365 ||
          (data.recurrenceEndType === RecurrenceEndTypes.AFTER &&
            (!Number.isInteger(count) || count < 1 || count > 1000))
        ) {
          setData((prevData) => ({
            ...prevData,
            recurrenceError: true,
          }));
          return;
        }

        if (data.recurrenceEndType === RecurrenceEndTypes.ON_DATE) {
          recurrenceUntil = parseDate(t, data.recurrenceUntilDate);

          if (Number.isNaN(recurrenceUntil.getTime())) {
            return;
          }
        }

        recurrenceRule = buildRecurrenceRule({
          frequency,
          interval,
          weekdays: data.recurrenceWeekdays,
          endType: data.recurrenceEndType,
          until: recurrenceUntil,
          count,
        });
      }

      if (recurrenceRule) {
        try {
          validateRecurrenceRule(recurrenceRule, startDate, data.isAllDay, recurrenceTimezone);
        } catch (error) {
          setData((prevData) => ({
            ...prevData,
            recurrenceError: true,
          }));
          return;
        }
      }

      dispatch(
        entryActions.updateCard(cardId, {
          startDate,
          endDate,
          isAllDay: data.isAllDay,
          dueDate: data.isAllDay ? addDays(endDate, -1) : endDate,
          recurrenceRule,
          recurrenceUntil,
          recurrenceTimezone: recurrenceRule ? recurrenceTimezone : null,
          ...(card.recurrenceRule && { recurrenceScope }),
        }),
      );

      onClose();
    },
    [
      cardId,
      card.recurrenceRule,
      data,
      dispatch,
      endDateFieldRef,
      endTimeFieldRef,
      onClose,
      recurrenceTimezone,
      startDateFieldRef,
      startTimeFieldRef,
      setData,
      t,
    ],
  );

  const handleSubmit = useCallback(() => {
    saveSchedule('series');
  }, [saveSchedule]);

  const handleCurrentCardClick = useCallback(() => {
    saveSchedule('current');
  }, [saveSchedule]);

  const handleClearClick = useCallback(() => {
    dispatch(
      entryActions.updateCard(cardId, {
        dueDate: null,
        startDate: null,
        endDate: null,
        isAllDay: true,
        recurrenceRule: null,
        recurrenceUntil: null,
        recurrenceTimezone: null,
      }),
    );

    onClose();
  }, [cardId, dispatch, onClose]);

  const handleAllDayChange = useCallback(
    (_, { checked }) => {
      setData((prevData) => ({
        ...prevData,
        isAllDay: checked,
        recurrenceError: false,
      }));
    },
    [setData],
  );

  const handleWeekdayToggle = useCallback(
    ({ currentTarget: { value } }) => {
      setData((prevData) => ({
        ...prevData,
        recurrenceWeekdays: prevData.recurrenceWeekdays.includes(value)
          ? prevData.recurrenceWeekdays.filter((weekday) => weekday !== value)
          : [...prevData.recurrenceWeekdays, value],
        recurrenceError: false,
      }));
    },
    [setData],
  );

  const handleDatePickerChange = useCallback(
    (date) => {
      setData((prevData) => ({
        ...prevData,
        startDate: formatDate(t, date),
        endDate: prevData.endDate || formatDate(t, date),
        recurrenceError: false,
      }));
      selectStartTimeField();
    },
    [t, setData, selectStartTimeField],
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
      weekday: 'short',
      timeZone: 'UTC',
    });

    return WEEKDAYS.map((weekday, index) => ({
      value: weekday,
      label: formatter.format(new Date(Date.UTC(2026, 0, 5 + index))),
    }));
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    startDateFieldRef.current.select();
  }, [startDateFieldRef]);

  useDidUpdate(() => {
    if (!data.isAllDay) {
      startTimeFieldRef.current.select();
    }
  }, [selectStartTimeFieldState]);

  return (
    <>
      <Popup.Header onBack={onBack}>{t('common.schedule')}</Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <div className={styles.fieldWrapper}>
            <div className={styles.fieldBox}>
              <div className={styles.text}>{t('common.startDate')}</div>
              <Input
                ref={handleStartDateFieldRef}
                name="startDate"
                value={data.startDate}
                maxLength={16}
                onChange={handleFormFieldChange}
              />
            </div>
            {!data.isAllDay && (
              <div className={styles.fieldBox}>
                <div className={styles.text}>{t('common.startTime')}</div>
                <Input
                  ref={handleStartTimeFieldRef}
                  name="startTime"
                  value={data.startTime}
                  maxLength={16}
                  onChange={handleFormFieldChange}
                />
              </div>
            )}
          </div>
          <div className={styles.fieldWrapper}>
            <div className={styles.fieldBox}>
              <div className={styles.text}>{t('common.endDate')}</div>
              <Input
                ref={handleEndDateFieldRef}
                name="endDate"
                value={data.endDate}
                maxLength={16}
                onChange={handleFormFieldChange}
              />
            </div>
            {!data.isAllDay && (
              <div className={styles.fieldBox}>
                <div className={styles.text}>{t('common.endTime')}</div>
                <Input
                  ref={handleEndTimeFieldRef}
                  name="endTime"
                  value={data.endTime}
                  maxLength={16}
                  onChange={handleFormFieldChange}
                />
              </div>
            )}
          </div>
          <Form.Checkbox
            name="isAllDay"
            checked={data.isAllDay}
            label={t('common.allDay')}
            onChange={handleAllDayChange}
          />
          <div className={styles.text}>{t('common.recurrence')}</div>
          <Form.Select
            name="recurrenceMode"
            value={data.recurrenceMode}
            options={[
              {
                key: RecurrenceModes.NONE,
                value: RecurrenceModes.NONE,
                text: t('common.noRecurrence'),
              },
              { key: RecurrenceModes.DAILY, value: RecurrenceModes.DAILY, text: t('common.daily') },
              {
                key: RecurrenceModes.WEEKLY,
                value: RecurrenceModes.WEEKLY,
                text: t('common.weekly'),
              },
              {
                key: RecurrenceModes.MONTHLY,
                value: RecurrenceModes.MONTHLY,
                text: t('common.monthly'),
              },
              {
                key: RecurrenceModes.YEARLY,
                value: RecurrenceModes.YEARLY,
                text: t('common.yearly'),
              },
              {
                key: RecurrenceModes.CUSTOM,
                value: RecurrenceModes.CUSTOM,
                text: t('common.custom'),
              },
            ]}
            onChange={handleFormFieldChange}
          />
          {data.recurrenceMode !== RecurrenceModes.NONE && (
            <div className={styles.recurrenceOptions}>
              {data.recurrenceMode === RecurrenceModes.CUSTOM ? (
                <>
                  <div className={styles.text}>RRULE</div>
                  <Input
                    name="customRecurrenceRule"
                    value={data.customRecurrenceRule}
                    maxLength={1024}
                    onChange={handleFormFieldChange}
                  />
                </>
              ) : (
                <>
                  <div className={styles.fieldWrapper}>
                    <div className={styles.fieldBoxFull}>
                      <div className={styles.text}>{t('common.repeatEvery')}</div>
                      <Input
                        name="recurrenceInterval"
                        type="number"
                        min="1"
                        max="365"
                        value={`${data.recurrenceInterval}`}
                        onChange={handleFormFieldChange}
                      />
                    </div>
                  </div>
                  {data.recurrenceMode === RecurrenceModes.WEEKLY && (
                    <>
                      <div className={styles.text}>{t('common.repeatOn')}</div>
                      <div className={styles.weekdayButtons}>
                        {weekdayLabels.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            value={value}
                            className={
                              data.recurrenceWeekdays.includes(value)
                                ? styles.weekdayButtonActive
                                : styles.weekdayButton
                            }
                            onClick={handleWeekdayToggle}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className={styles.text}>{t('common.ends')}</div>
                  <Form.Select
                    name="recurrenceEndType"
                    value={data.recurrenceEndType}
                    options={[
                      {
                        key: RecurrenceEndTypes.NEVER,
                        value: RecurrenceEndTypes.NEVER,
                        text: t('common.never'),
                      },
                      {
                        key: RecurrenceEndTypes.ON_DATE,
                        value: RecurrenceEndTypes.ON_DATE,
                        text: t('common.onDate'),
                      },
                      {
                        key: RecurrenceEndTypes.AFTER,
                        value: RecurrenceEndTypes.AFTER,
                        text: t('common.afterNOccurrences', {
                          count: Number(data.recurrenceCount) || 10,
                        }),
                      },
                    ]}
                    onChange={handleFormFieldChange}
                  />
                  {data.recurrenceEndType === RecurrenceEndTypes.ON_DATE && (
                    <Input
                      name="recurrenceUntilDate"
                      value={data.recurrenceUntilDate}
                      maxLength={16}
                      onChange={handleFormFieldChange}
                    />
                  )}
                  {data.recurrenceEndType === RecurrenceEndTypes.AFTER && (
                    <Input
                      name="recurrenceCount"
                      type="number"
                      min="1"
                      max="1000"
                      value={`${data.recurrenceCount}`}
                      onChange={handleFormFieldChange}
                    />
                  )}
                </>
              )}
            </div>
          )}
          {data.recurrenceMode !== RecurrenceModes.NONE && (
            <div className={styles.recurrenceTimezone}>{recurrenceTimezone}</div>
          )}
          {data.recurrenceError && (
            <Message negative size="small" content={t('common.invalidRecurrenceRule')} />
          )}
          <DatePicker
            inline
            disabledKeyboardNavigation
            selected={nullableStartDate}
            onChange={handleDatePickerChange}
          />
          {card.recurrenceRule && (
            <Button
              type="button"
              content={t('common.currentCard')}
              onClick={handleCurrentCardClick}
            />
          )}
          <Button
            positive
            content={card.recurrenceRule ? t('common.entireSeries') : t('action.saveSchedule')}
          />
        </Form>
        <Button
          negative
          content={t('action.clearSchedule')}
          className={styles.deleteButton}
          onClick={handleClearClick}
        />
      </Popup.Content>
    </>
  );
});

EditDueDateStep.propTypes = {
  cardId: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

EditDueDateStep.defaultProps = {
  onBack: undefined,
};

export default EditDueDateStep;
