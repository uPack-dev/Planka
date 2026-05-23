/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Checkbox, Dropdown, Input } from 'semantic-ui-react';
import { push } from '../../../lib/redux-router';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import {
  cardToCalendarEvent,
  dateClickToCardDefaults,
  selectionToCardDefaults,
} from '../../../utils/calendar-events';
import Paths from '../../../constants/Paths';
import { BoardMembershipRoles } from '../../../constants/Enums';
import Calendar from '../Calendar';
import GlobalCalendarCreateCardModal from './GlobalCalendarCreateCardModal';

import styles from './GlobalCalendarView.module.scss';

const DEFAULT_FILTERS = {
  projectIds: [],
  boardIds: [],
  userIds: [],
  labelIds: [],
  search: '',
  onlyMyCards: false,
};

const GlobalCalendarView = React.memo(() => {
  const calendar = useSelector(selectors.selectGlobalCalendar);
  const projects = useSelector(selectors.selectGlobalCalendarProjects);
  const boards = useSelector(selectors.selectGlobalCalendarBoards);
  const lists = useSelector(selectors.selectGlobalCalendarLists);
  const users = useSelector(selectors.selectGlobalCalendarUsers);
  const labels = useSelector(selectors.selectGlobalCalendarLabels);
  const cards = useSelector(selectors.selectGlobalCalendarCards);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState(DEFAULT_FILTERS.search);
  const [visibleRange, setVisibleRange] = useState(null);
  const [createDefaults, setCreateDefaults] = useState(null);

  const canCreate = useMemo(
    () =>
      boards.some(
        (board) =>
          board.membership &&
          board.membership.role === BoardMembershipRoles.EDITOR &&
          lists.some((list) => list.boardId === board.id),
      ),
    [boards, lists],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        setFilters((prevFilters) => ({
          ...prevFilters,
          search: value.trim(),
        }));
      }, 400),
    [],
  );

  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch],
  );

  useEffect(() => {
    if (!visibleRange) {
      return;
    }

    dispatch(
      entryActions.fetchGlobalCalendarCards({
        ...visibleRange,
        ...filters,
      }),
    );
  }, [dispatch, filters, visibleRange]);

  const events = useMemo(
    () =>
      cards
        .map((card) => {
          const event = cardToCalendarEvent(card);

          if (!event) {
            return null;
          }

          return {
            ...event,
            extendedProps: {
              ...event.extendedProps,
              project: card.project,
              board: card.board,
              list: card.list,
            },
          };
        })
        .filter(Boolean),
    [cards],
  );

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        key: project.id,
        value: project.id,
        text: project.name,
      })),
    [projects],
  );

  const boardOptions = useMemo(
    () =>
      boards
        .filter(
          (board) =>
            filters.projectIds.length === 0 || filters.projectIds.includes(board.projectId),
        )
        .map((board) => ({
          key: board.id,
          value: board.id,
          text: board.project ? `${board.project.name} · ${board.name}` : board.name,
        })),
    [boards, filters.projectIds],
  );

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        key: user.id,
        value: user.id,
        text: user.name,
      })),
    [users],
  );

  const labelOptions = useMemo(
    () =>
      labels.map((label) => ({
        key: label.id,
        value: label.id,
        text: label.name || label.color,
      })),
    [labels],
  );

  const handleFilterChange = useCallback((_, { name, value, checked }) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: name === 'onlyMyCards' ? checked : value,
    }));
  }, []);

  const handleSearchChange = useCallback(
    (_, { value }) => {
      setSearchDraft(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleDatesSet = useCallback((info) => {
    setVisibleRange((prevVisibleRange) => {
      if (
        prevVisibleRange &&
        prevVisibleRange.visibleStart === info.startStr &&
        prevVisibleRange.visibleEnd === info.endStr
      ) {
        return prevVisibleRange;
      }

      return {
        visibleStart: info.startStr,
        visibleEnd: info.endStr,
      };
    });
  }, []);

  const handleEventClick = useCallback(
    ({ event }) => {
      dispatch(entryActions.fetchBoard(event.extendedProps.boardId));
      dispatch(push(Paths.CARDS.replace(':id', event.extendedProps.cardId)));
    },
    [dispatch],
  );

  const openCreateModal = useCallback(
    (defaults) => {
      if (!canCreate) {
        return;
      }

      setCreateDefaults(defaults);
    },
    [canCreate],
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
    (listId, data) => {
      dispatch(entryActions.createCard(listId, data, 0, true));
      setCreateDefaults(null);
    },
    [dispatch],
  );

  const renderEventMeta = useCallback(
    ({ event }) => {
      const { project, board, list } = event.extendedProps;
      const listName = list && (list.name || t(`common.${list.type}`));
      const scopeName = board ? board.name : project && project.name;

      return [scopeName, listName].filter(Boolean).join(' · ');
    },
    [t],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <Dropdown
          multiple
          selection
          clearable
          name="projectIds"
          value={filters.projectIds}
          options={projectOptions}
          placeholder={t('common.filterByProjects', {
            context: 'title',
          })}
          className={styles.filter}
          onChange={handleFilterChange}
        />
        <Dropdown
          multiple
          selection
          clearable
          name="boardIds"
          value={filters.boardIds}
          options={boardOptions}
          placeholder={t('common.filterByBoards', {
            context: 'title',
          })}
          className={styles.filter}
          onChange={handleFilterChange}
        />
        <Dropdown
          multiple
          selection
          clearable
          name="userIds"
          value={filters.userIds}
          options={userOptions}
          placeholder={t('common.members')}
          className={styles.filter}
          onChange={handleFilterChange}
        />
        <Dropdown
          multiple
          selection
          clearable
          name="labelIds"
          value={filters.labelIds}
          options={labelOptions}
          placeholder={t('common.labels')}
          className={styles.filter}
          onChange={handleFilterChange}
        />
        <Input
          name="search"
          value={searchDraft}
          icon="search"
          placeholder={t('common.searchCards')}
          className={styles.search}
          onChange={handleSearchChange}
        />
        <Checkbox
          toggle
          name="onlyMyCards"
          checked={filters.onlyMyCards}
          label={t('common.onlyMyCards')}
          className={styles.checkbox}
          onChange={handleFilterChange}
        />
      </div>
      <Calendar
        events={events}
        isFetching={calendar.isFetching}
        isSelectable={canCreate}
        emptyMessage={t('common.noCardsFound')}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        onSelect={handleSelect}
        onDatesSet={handleDatesSet}
        renderEventMeta={renderEventMeta}
      />
      <GlobalCalendarCreateCardModal
        isOpened={!!createDefaults}
        defaults={createDefaults}
        filters={filters}
        projects={projects}
        boards={boards}
        lists={lists}
        onCreate={handleCreate}
        onClose={handleCreateClose}
      />
    </div>
  );
});

export default GlobalCalendarView;
