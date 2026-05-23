/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { Button, Form } from 'semantic-ui-react';
import { useDidUpdate, useToggle } from '../../../lib/hooks';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import parseTime from '../../../utils/parse-time';
import { buildRecurrenceRule } from '../../../utils/calendar-events';

import styles from './EditDueDateStep.module.scss';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMED_DURATION_IN_MS = 60 * 60 * 1000;

const RecurrenceModes = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
};

const RecurrenceEndTypes = {
  NEVER: 'never',
  ON_DATE: 'onDate',
  AFTER: 'after',
};

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

const addMilliseconds = (date, milliseconds) => new Date(date.getTime() + milliseconds);

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
    return isAllDay ? addMilliseconds(card.endDate, -DAY_IN_MS) : card.endDate;
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
    };
  }

  const fields = recurrenceRule
    .replace(/^RRULE:/, '')
    .split(';')
    .reduce((result, field) => {
      const [key, value] = field.split('=');
      return {
        ...result,
        [key]: value,
      };
    }, {});

  const recurrenceModeByFrequency = {
    DAILY: RecurrenceModes.DAILY,
    WEEKLY: RecurrenceModes.WEEKLY,
    MONTHLY: RecurrenceModes.MONTHLY,
  };

  let recurrenceEndType = RecurrenceEndTypes.NEVER;

  if (fields.UNTIL) {
    recurrenceEndType = RecurrenceEndTypes.ON_DATE;
  } else if (fields.COUNT) {
    recurrenceEndType = RecurrenceEndTypes.AFTER;
  }

  return {
    recurrenceMode: recurrenceModeByFrequency[fields.FREQ] || RecurrenceModes.CUSTOM,
    recurrenceInterval: fields.INTERVAL || 1,
    recurrenceWeekdays: fields.BYDAY ? fields.BYDAY.split(',') : [],
    recurrenceEndType,
    recurrenceUntilDate: formatDate(t, recurrenceUntil || new Date()),
    recurrenceCount: fields.COUNT || 10,
    customRecurrenceRule: recurrenceRule,
  };
};

const EditDueDateStep = React.memo(({ cardId, onBack, onClose }) => {
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const card = useSelector((state) => selectCardById(state, cardId));

  const dispatch = useDispatch();
  const [t] = useTranslation();

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

  const nullableStartDate = useMemo(() => {
    const date = parseDate(t, data.startDate);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }, [data.startDate, t]);

  const handleSubmit = useCallback(() => {
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
      endDate = addMilliseconds(endDateOnly, DAY_IN_MS);
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

      if (data.recurrenceEndType === RecurrenceEndTypes.ON_DATE) {
        recurrenceUntil = parseDate(t, data.recurrenceUntilDate);

        if (Number.isNaN(recurrenceUntil.getTime())) {
          return;
        }
      }

      recurrenceRule = buildRecurrenceRule({
        frequency,
        interval: Number(data.recurrenceInterval) || 1,
        weekdays: data.recurrenceWeekdays,
        endType: data.recurrenceEndType,
        until: recurrenceUntil,
        count: Number(data.recurrenceCount) || 10,
      });
    }

    dispatch(
      entryActions.updateCard(cardId, {
        startDate,
        endDate,
        isAllDay: data.isAllDay,
        dueDate: data.isAllDay ? addMilliseconds(endDate, -DAY_IN_MS) : endDate,
        recurrenceRule,
        recurrenceUntil,
        recurrenceTimezone:
          recurrenceRule && Intl.DateTimeFormat().resolvedOptions().timeZone
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : null,
      }),
    );

    onClose();
  }, [
    cardId,
    data,
    dispatch,
    endDateFieldRef,
    endTimeFieldRef,
    onClose,
    startDateFieldRef,
    startTimeFieldRef,
    t,
  ]);

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
      }));
      selectStartTimeField();
    },
    [t, setData, selectStartTimeField],
  );

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
                onChange={handleFieldChange}
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
                  onChange={handleFieldChange}
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
                onChange={handleFieldChange}
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
                  onChange={handleFieldChange}
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
                key: RecurrenceModes.CUSTOM,
                value: RecurrenceModes.CUSTOM,
                text: t('common.custom'),
              },
            ]}
            onChange={handleFieldChange}
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
                    onChange={handleFieldChange}
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
                        onChange={handleFieldChange}
                      />
                    </div>
                  </div>
                  {data.recurrenceMode === RecurrenceModes.WEEKLY && (
                    <>
                      <div className={styles.text}>{t('common.repeatOn')}</div>
                      <div className={styles.weekdayButtons}>
                        {WEEKDAYS.map((weekday) => (
                          <button
                            key={weekday}
                            type="button"
                            value={weekday}
                            className={
                              data.recurrenceWeekdays.includes(weekday)
                                ? styles.weekdayButtonActive
                                : styles.weekdayButton
                            }
                            onClick={handleWeekdayToggle}
                          >
                            {weekday}
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
                    onChange={handleFieldChange}
                  />
                  {data.recurrenceEndType === RecurrenceEndTypes.ON_DATE && (
                    <Input
                      name="recurrenceUntilDate"
                      value={data.recurrenceUntilDate}
                      maxLength={16}
                      onChange={handleFieldChange}
                    />
                  )}
                  {data.recurrenceEndType === RecurrenceEndTypes.AFTER && (
                    <Input
                      name="recurrenceCount"
                      type="number"
                      min="1"
                      max="1000"
                      value={`${data.recurrenceCount}`}
                      onChange={handleFieldChange}
                    />
                  )}
                </>
              )}
            </div>
          )}
          <DatePicker
            inline
            disabledKeyboardNavigation
            selected={nullableStartDate}
            onChange={handleDatePickerChange}
          />
          <Button positive content={t('action.saveSchedule')} />
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
