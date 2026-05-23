/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import rrulePlugin from '@fullcalendar/rrule';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Button, Form, Input, Message, Modal } from 'semantic-ui-react';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import {
  cardToCalendarEvent,
  dateClickToCardDefaults,
  eventDropToCardData,
  eventResizeToCardData,
  selectionToCardDefaults,
} from '../../../utils/calendar-events';
import Paths from '../../../constants/Paths';
import { BoardContexts, BoardMembershipRoles } from '../../../constants/Enums';

import styles from './CalendarView.module.scss';

const FULL_CALENDAR_PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  listPlugin,
  rrulePlugin,
];

const CalendarCreateCardModal = React.memo(({ isOpened, defaults, onCreate, onClose }) => {
  const board = useSelector(selectors.selectCurrentBoard);
  const [t] = useTranslation();
  const [name, setName] = useState('');

  const handleNameChange = useCallback((_, { value }) => {
    setName(value);
  }, []);

  const handleSubmit = useCallback(() => {
    const cleanName = name.trim();

    if (!cleanName || !defaults) {
      return;
    }

    onCreate({
      ...defaults,
      type: board.defaultCardType,
      name: cleanName,
    });

    setName('');
  }, [board.defaultCardType, defaults, name, onCreate]);

  const handleClose = useCallback(() => {
    setName('');
    onClose();
  }, [onClose]);

  return (
    <Modal open={isOpened} size="tiny" className={styles.createModal} onClose={handleClose}>
      <Modal.Header>{t('action.createCardHere')}</Modal.Header>
      <Modal.Content>
        <Form onSubmit={handleSubmit}>
          <Form.Field>
            <Input
              autoFocus
              value={name}
              maxLength={1024}
              placeholder={t('common.enterCardTitle')}
              onChange={handleNameChange}
            />
          </Form.Field>
          <div className={styles.createControls}>
            <Button type="button" onClick={handleClose}>
              {t('action.cancel')}
            </Button>
            <Button positive disabled={!name.trim()}>
              {t('action.addCard')}
            </Button>
          </div>
        </Form>
      </Modal.Content>
    </Modal>
  );
});

CalendarCreateCardModal.propTypes = {
  isOpened: PropTypes.bool.isRequired,
  defaults: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onCreate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

CalendarCreateCardModal.defaultProps = {
  defaults: null,
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

const CalendarView = React.memo(({ cardIds }) => {
  const board = useSelector(selectors.selectCurrentBoard);
  const cards = useSelector(selectors.selectCalendarCardsForCurrentBoard);
  const boardMembership = useSelector(selectors.selectCurrentUserMembershipForCurrentBoard);
  const hasKanbanList = useSelector((state) => !!selectors.selectFirstKanbanListId(state));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [createDefaults, setCreateDefaults] = useState(null);
  const [recurringMutation, setRecurringMutation] = useState(null);

  const canEdit =
    board.context === BoardContexts.BOARD &&
    hasKanbanList &&
    !!boardMembership &&
    boardMembership.role === BoardMembershipRoles.EDITOR;

  const cardIdSet = useMemo(() => new Set(cardIds), [cardIds]);

  const events = useMemo(() => {
    const currentCards = cards || [];

    return currentCards
      .filter((card) => cardIdSet.has(card.id))
      .map(cardToCalendarEvent)
      .filter(Boolean);
  }, [cardIdSet, cards]);

  const handleEventClick = useCallback(
    ({ event }) => {
      dispatch(push(Paths.CARDS.replace(':id', event.extendedProps.cardId)));
    },
    [dispatch],
  );

  const openCreateModal = useCallback(
    (defaults) => {
      if (!canEdit) {
        return;
      }

      setCreateDefaults(defaults);
    },
    [canEdit],
  );

  const handleDateClick = useCallback(
    (info) => {
      openCreateModal(dateClickToCardDefaults(info));
    },
    [openCreateModal],
  );

  const handleSelect = useCallback(
    (info) => {
      openCreateModal(selectionToCardDefaults(info));
      info.view.calendar.unselect();
    },
    [openCreateModal],
  );

  const handleCreateClose = useCallback(() => {
    setCreateDefaults(null);
  }, []);

  const handleCreate = useCallback(
    (data) => {
      dispatch(entryActions.createCardInCurrentContext(data, 0, true));
      setCreateDefaults(null);
    },
    [dispatch],
  );

  const commitEventMutation = useCallback(
    (cardId, data) => {
      dispatch(entryActions.updateCard(cardId, data));
    },
    [dispatch],
  );

  const requestEventMutation = useCallback(
    (info, getData) => {
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
    [commitEventMutation],
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

  const renderEventContent = useCallback((eventInfo) => {
    const { extendedProps } = eventInfo.event;

    return (
      <div
        className={classNames(
          styles.event,
          extendedProps.isDueCompleted && styles.eventCompleted,
          extendedProps.isClosed && styles.eventClosed,
        )}
      >
        <span className={styles.eventTitle}>{eventInfo.event.title}</span>
        {extendedProps.labels.length > 0 && (
          <span className={styles.eventLabels}>
            {extendedProps.labels.slice(0, 3).map((label) => (
              <span key={label.id} title={label.name} className={styles.eventLabel}>
                {label.name || '\u00A0'}
              </span>
            ))}
          </span>
        )}
      </div>
    );
  }, []);

  return (
    <div className={styles.wrapper}>
      {!hasKanbanList && (
        <Message className={styles.message} content={t('common.atLeastOneListMustBePresent')} />
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
        events={events}
        height="100%"
        editable={canEdit}
        selectable={canEdit}
        eventStartEditable={canEdit}
        eventDurationEditable={canEdit}
        nowIndicator
        dayMaxEvents
        expandRows
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        select={handleSelect}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      />
      <CalendarCreateCardModal
        isOpened={!!createDefaults}
        defaults={createDefaults}
        onCreate={handleCreate}
        onClose={handleCreateClose}
      />
      <RecurringUpdateModal
        mutation={recurringMutation}
        onConfirm={handleRecurringConfirm}
        onCancel={handleRecurringCancel}
      />
    </div>
  );
});

CalendarView.propTypes = {
  cardIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default CalendarView;
