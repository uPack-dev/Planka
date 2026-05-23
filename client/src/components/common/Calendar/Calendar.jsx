/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import camelCase from 'lodash/camelCase';
import upperFirst from 'lodash/upperFirst';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import rrulePlugin from '@fullcalendar/rrule';
import timeGridPlugin from '@fullcalendar/timegrid';
import ruLocale from '@fullcalendar/core/locales/ru';
import ukLocale from '@fullcalendar/core/locales/uk';
import { Button, Loader, Modal } from 'semantic-ui-react';

import { eventDropToCardData, eventResizeToCardData } from '../../../utils/calendar-events';

import styles from './Calendar.module.scss';
import globalStyles from '../../../styles.module.scss';

const FULL_CALENDAR_PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  listPlugin,
  rrulePlugin,
];

const LOCALE_BY_LANGUAGE = {
  ru: ruLocale,
  'ru-RU': ruLocale,
  uk: ukLocale,
  'uk-UA': ukLocale,
};

const RecurringUpdateModal = React.memo(({ mutation, onConfirm, onCancel }) => {
  const [t] = useTranslation();

  return (
    <Modal open={!!mutation} size="tiny" onClose={onCancel}>
      <Modal.Header>{t('common.recurringCard')}</Modal.Header>
      <Modal.Content>
        <p>{t('common.thisRecurringCardUpdateScope')}</p>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onCancel}>{t('action.cancel')}</Button>
        <Button positive onClick={onConfirm}>
          {t('common.entireSeries')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
});

RecurringUpdateModal.propTypes = {
  mutation: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

RecurringUpdateModal.defaultProps = {
  mutation: null,
};

const Calendar = React.memo(
  ({
    events,
    isFetching,
    isEditable,
    isSelectable,
    emptyMessage,
    className,
    onEventClick,
    onDateClick,
    onSelect,
    onDatesSet,
    onEventUpdate,
    renderEventMeta,
    dayMaxEvents,
  }) => {
    const [t, i18n] = useTranslation();
    const [recurringMutation, setRecurringMutation] = useState(null);

    const locale = useMemo(
      () => LOCALE_BY_LANGUAGE[i18n.language] || LOCALE_BY_LANGUAGE[i18n.resolvedLanguage],
      [i18n.language, i18n.resolvedLanguage],
    );

    const commitEventMutation = useCallback(
      (cardId, data) => {
        if (onEventUpdate) {
          onEventUpdate(cardId, data);
        }
      },
      [onEventUpdate],
    );

    const requestEventMutation = useCallback(
      (info, getData) => {
        if (!onEventUpdate) {
          info.revert();
          return;
        }

        const { cardId } = info.event.extendedProps;
        const data = getData(info);

        if (info.event.extendedProps.recurrenceRule) {
          setRecurringMutation({
            cardId,
            data,
            revert: info.revert,
          });

          return;
        }

        commitEventMutation(cardId, data);
      },
      [commitEventMutation, onEventUpdate],
    );

    const handleEventDrop = useCallback(
      (info) => {
        requestEventMutation(info, eventDropToCardData);
      },
      [requestEventMutation],
    );

    const handleEventResize = useCallback(
      (info) => {
        requestEventMutation(info, eventResizeToCardData);
      },
      [requestEventMutation],
    );

    const handleRecurringConfirm = useCallback(() => {
      if (recurringMutation) {
        commitEventMutation(recurringMutation.cardId, recurringMutation.data);
        setRecurringMutation(null);
      }
    }, [commitEventMutation, recurringMutation]);

    const handleRecurringCancel = useCallback(() => {
      if (recurringMutation) {
        recurringMutation.revert();
        setRecurringMutation(null);
      }
    }, [recurringMutation]);

    const renderEventContent = useCallback(
      (eventInfo) => {
        const { extendedProps } = eventInfo.event;
        const labels = extendedProps.labels || [];
        const meta = renderEventMeta ? renderEventMeta(eventInfo) : null;

        return (
          <div
            className={classNames(
              styles.event,
              extendedProps.isDueCompleted && styles.eventCompleted,
              extendedProps.isClosed && styles.eventClosed,
              meta && styles.eventWithMeta,
            )}
          >
            <div className={styles.eventTop}>
              <span className={styles.eventTitle}>{eventInfo.event.title}</span>
              {labels.length > 0 && (
                <span className={styles.eventLabels}>
                  {labels.slice(0, 3).map((label) => (
                    <span
                      key={label.id}
                      title={label.name || label.color}
                      aria-label={label.name || label.color}
                      className={classNames(
                        styles.eventLabel,
                        label.color &&
                          globalStyles[`background${upperFirst(camelCase(label.color))}`],
                      )}
                    />
                  ))}
                </span>
              )}
            </div>
            {meta && <div className={styles.eventMeta}>{meta}</div>}
          </div>
        );
      },
      [renderEventMeta],
    );

    return (
      <div className={classNames(styles.wrapper, className)}>
        {isFetching && (
          <div className={styles.loader}>
            <Loader active inverted size="small" />
          </div>
        )}
        {emptyMessage && !isFetching && events.length === 0 && (
          <div className={styles.emptyMessage}>{emptyMessage}</div>
        )}
        <FullCalendar
          plugins={FULL_CALENDAR_PLUGINS}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today: t('action.today'),
            month: t('common.month'),
            week: t('common.week'),
            day: t('common.day'),
            list: t('common.list'),
          }}
          locale={locale}
          events={events}
          height="100%"
          editable={isEditable}
          selectable={isSelectable}
          eventStartEditable={isEditable}
          eventDurationEditable={isEditable}
          nowIndicator
          dayMaxEvents={dayMaxEvents}
          expandRows
          eventContent={renderEventContent}
          eventClick={onEventClick}
          dateClick={onDateClick}
          select={onSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={onDatesSet}
        />
        <RecurringUpdateModal
          mutation={recurringMutation}
          onConfirm={handleRecurringConfirm}
          onCancel={handleRecurringCancel}
        />
      </div>
    );
  },
);

Calendar.propTypes = {
  events: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  isFetching: PropTypes.bool,
  isEditable: PropTypes.bool,
  isSelectable: PropTypes.bool,
  emptyMessage: PropTypes.string,
  className: PropTypes.string,
  onEventClick: PropTypes.func.isRequired,
  onDateClick: PropTypes.func,
  onSelect: PropTypes.func,
  onDatesSet: PropTypes.func,
  onEventUpdate: PropTypes.func,
  renderEventMeta: PropTypes.func,
  dayMaxEvents: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
};

Calendar.defaultProps = {
  isFetching: false,
  isEditable: false,
  isSelectable: false,
  emptyMessage: undefined,
  className: undefined,
  onDateClick: undefined,
  onSelect: undefined,
  onDatesSet: undefined,
  onEventUpdate: undefined,
  renderEventMeta: undefined,
  dayMaxEvents: true,
};

export default Calendar;
