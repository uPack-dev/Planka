/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Form, Input, Message, Modal } from 'semantic-ui-react';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import {
  cardToCalendarEvent,
  dateClickToCardDefaults,
  selectionToCardDefaults,
} from '../../../utils/calendar-events';
import Paths from '../../../constants/Paths';
import { BoardContexts, BoardMembershipRoles } from '../../../constants/Enums';
import Calendar from '../../common/Calendar';

import styles from './CalendarView.module.scss';

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

const CalendarView = React.memo(({ cardIds }) => {
  const board = useSelector(selectors.selectCurrentBoard);
  const cards = useSelector(selectors.selectCalendarCardsForCurrentBoard);
  const boardMembership = useSelector(selectors.selectCurrentUserMembershipForCurrentBoard);
  const isReadOnly = useSelector(selectors.selectIsCurrentBoardReadOnly);
  const hasKanbanList = useSelector((state) => !!selectors.selectFirstKanbanListId(state));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [createDefaults, setCreateDefaults] = useState(null);
  const [isCompletedHidden, setIsCompletedHidden] = useState(true);

  const canEdit =
    board.context === BoardContexts.BOARD &&
    !isReadOnly &&
    hasKanbanList &&
    !!boardMembership &&
    boardMembership.role === BoardMembershipRoles.EDITOR;

  const cardIdSet = useMemo(() => new Set(cardIds), [cardIds]);

  const events = useMemo(() => {
    const currentCards = cards || [];

    return currentCards
      .filter((card) => cardIdSet.has(card.id))
      .filter((card) => !isCompletedHidden || !card.isDueCompleted)
      .map(cardToCalendarEvent)
      .filter(Boolean);
  }, [cardIdSet, cards, isCompletedHidden]);

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

  const handleCompletedHiddenChange = useCallback((_, { checked }) => {
    setIsCompletedHidden(checked);
  }, []);

  const handleEventUpdate = useCallback(
    (cardId, data) => {
      dispatch(entryActions.updateCard(cardId, data));
    },
    [dispatch],
  );

  return (
    <div className={styles.wrapper}>
      {!hasKanbanList && (
        <Message className={styles.message} content={t('common.atLeastOneListMustBePresent')} />
      )}
      <div className={styles.toolbar}>
        <Checkbox
          toggle
          checked={isCompletedHidden}
          label={t('common.hideCompletedCards')}
          className={styles.checkbox}
          onChange={handleCompletedHiddenChange}
        />
      </div>
      <Calendar
        events={events}
        isEditable={canEdit}
        isSelectable={canEdit}
        emptyMessage={t('common.noCardsFound')}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        onSelect={handleSelect}
        onEventUpdate={handleEventUpdate}
      />
      <CalendarCreateCardModal
        isOpened={!!createDefaults}
        defaults={createDefaults}
        onCreate={handleCreate}
        onClose={handleCreateClose}
      />
    </div>
  );
});

CalendarView.propTypes = {
  cardIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default CalendarView;
