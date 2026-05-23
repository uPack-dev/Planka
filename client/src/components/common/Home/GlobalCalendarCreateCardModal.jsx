/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input, Modal, Message } from 'semantic-ui-react';

import { getDueDateForSchedule } from '../../../utils/calendar-events';
import parseTime from '../../../utils/parse-time';
import { useNestedRef } from '../../../hooks';
import { BoardMembershipRoles, CardTypes } from '../../../constants/Enums';

import styles from './GlobalCalendarCreateCardModal.module.scss';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMED_DURATION_IN_MS = 60 * 60 * 1000;

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

const getVisibleEndDate = (defaults) => {
  if (!defaults) {
    return new Date(new Date().setHours(13, 0, 0, 0));
  }

  if (defaults.isAllDay) {
    return addMilliseconds(defaults.endDate, -DAY_IN_MS);
  }

  return defaults.endDate || addMilliseconds(defaults.startDate, DEFAULT_TIMED_DURATION_IN_MS);
};

const GlobalCalendarCreateCardModal = React.memo(
  ({ isOpened, defaults, filters, projects, boards, lists, onCreate, onClose }) => {
    const [t] = useTranslation();

    const [titleFieldRef, handleTitleFieldRef] = useNestedRef('inputRef');
    const [error, setError] = useState(null);
    const [data, setData] = useState({
      projectId: null,
      boardId: null,
      listId: null,
      type: CardTypes.PROJECT,
      name: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      isAllDay: true,
    });

    const editableBoards = useMemo(
      () =>
        boards.filter(
          (board) => board.membership && board.membership.role === BoardMembershipRoles.EDITOR,
        ),
      [boards],
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

    const availableBoards = useMemo(
      () => editableBoards.filter((board) => !data.projectId || board.projectId === data.projectId),
      [data.projectId, editableBoards],
    );

    const boardOptions = useMemo(
      () =>
        availableBoards.map((board) => ({
          key: board.id,
          value: board.id,
          text: board.project ? `${board.project.name} · ${board.name}` : board.name,
        })),
      [availableBoards],
    );

    const availableLists = useMemo(
      () => lists.filter((list) => !data.boardId || list.boardId === data.boardId),
      [data.boardId, lists],
    );

    const listOptions = useMemo(
      () =>
        availableLists.map((list) => ({
          key: list.id,
          value: list.id,
          text: list.name || t(`common.${list.type}`),
        })),
      [availableLists, t],
    );

    const typeOptions = useMemo(
      () =>
        Object.values(CardTypes).map((type) => ({
          key: type,
          value: type,
          text: t(`common.${type}`),
        })),
      [t],
    );

    useEffect(() => {
      if (!isOpened || !defaults) {
        return;
      }

      const selectedBoardIds = new Set(filters.boardIds);
      const selectedProjectIds = new Set(filters.projectIds);

      const defaultBoard =
        filters.boardIds.length === 1
          ? editableBoards.find((board) => selectedBoardIds.has(board.id))
          : null;

      const defaultProject =
        (defaultBoard && projects.find((project) => project.id === defaultBoard.projectId)) ||
        (filters.projectIds.length === 1
          ? projects.find((project) => selectedProjectIds.has(project.id))
          : null);

      const boardsInProject = defaultProject
        ? editableBoards.filter((board) => board.projectId === defaultProject.id)
        : editableBoards;

      const boardIdsInProject = new Set(boardsInProject.map((board) => board.id));
      const listsInProject = lists.filter((list) => boardIdsInProject.has(list.boardId));

      let nextBoard = defaultBoard || (boardsInProject.length === 1 ? boardsInProject[0] : null);
      let nextList = null;

      if (nextBoard) {
        const listsInBoard = lists.filter((list) => list.boardId === nextBoard.id);
        nextList = listsInBoard.length === 1 ? listsInBoard[0] : null;
      } else if (listsInProject.length === 1) {
        [nextList] = listsInProject;
        nextBoard = boardsInProject.find((board) => board.id === nextList.boardId);
      }
      const visibleEndDate = getVisibleEndDate(defaults);

      setData({
        projectId: (defaultProject && defaultProject.id) || (nextBoard && nextBoard.projectId),
        boardId: nextBoard && nextBoard.id,
        listId: nextList && nextList.id,
        type: (nextBoard && nextBoard.defaultCardType) || CardTypes.PROJECT,
        name: '',
        startDate: formatDate(t, defaults.startDate),
        startTime: formatTime(t, defaults.startDate),
        endDate: formatDate(t, visibleEndDate),
        endTime: formatTime(t, visibleEndDate),
        isAllDay: defaults.isAllDay,
      });

      setError(null);
    }, [
      defaults,
      editableBoards,
      filters.boardIds,
      filters.projectIds,
      isOpened,
      lists,
      projects,
      t,
    ]);

    useEffect(() => {
      if (isOpened && titleFieldRef.current) {
        titleFieldRef.current.focus();
      }
    }, [isOpened, titleFieldRef]);

    const handleFieldChange = useCallback(
      (_, { name, value, checked }) => {
        setData((prevData) => {
          const nextData = {
            ...prevData,
            [name]: name === 'isAllDay' ? checked : value,
          };

          if (name === 'projectId') {
            nextData.boardId = null;
            nextData.listId = null;
          } else if (name === 'boardId') {
            nextData.listId = null;

            const board = boards.find((item) => item.id === value);
            if (board) {
              nextData.projectId = board.projectId;
              nextData.type = board.defaultCardType;
            }
          }

          return nextData;
        });
      },
      [boards],
    );

    const handleSubmit = useCallback(() => {
      const name = data.name.trim();

      if (!data.projectId || !data.boardId || !data.listId) {
        setError('common.selectList');
        return;
      }

      if (!name) {
        titleFieldRef.current.select();
        return;
      }

      const startDateOnly = parseDate(t, data.startDate);
      const endDateOnly = parseDate(t, data.endDate);

      if (Number.isNaN(startDateOnly.getTime()) || Number.isNaN(endDateOnly.getTime())) {
        setError('common.date');
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
        }

        endDate = parseDateTime(t, data.endDate, data.endTime);

        if (Number.isNaN(endDate.getTime())) {
          endDate = parseTime(data.endTime, endDateOnly);
        }

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          setError('common.time');
          return;
        }
      }

      if (endDate.getTime() <= startDate.getTime()) {
        setError('common.endDate');
        return;
      }

      onCreate(data.listId, {
        type: data.type,
        name,
        startDate,
        endDate,
        isAllDay: data.isAllDay,
        dueDate: getDueDateForSchedule(startDate, endDate, data.isAllDay),
      });
    }, [data, onCreate, t, titleFieldRef]);

    const handleClose = useCallback(() => {
      setError(null);
      onClose();
    }, [onClose]);

    return (
      <Modal open={isOpened} size="small" className={styles.modal} onClose={handleClose}>
        <Modal.Header>{t('action.createCardHere')}</Modal.Header>
        <Modal.Content>
          <Form onSubmit={handleSubmit}>
            {error && <Message negative content={t(error)} />}
            <Form.Field>
              <Input
                ref={handleTitleFieldRef}
                name="name"
                value={data.name}
                maxLength={1024}
                placeholder={t('common.enterCardTitle')}
                onChange={handleFieldChange}
              />
            </Form.Field>
            <Form.Group widths="equal">
              <Form.Select
                search
                name="projectId"
                value={data.projectId}
                label={t('common.project')}
                options={projectOptions}
                placeholder={t('common.selectProject')}
                onChange={handleFieldChange}
              />
              <Form.Select
                search
                name="boardId"
                value={data.boardId}
                label={t('common.board')}
                options={boardOptions}
                placeholder={t('common.selectBoard')}
                onChange={handleFieldChange}
              />
            </Form.Group>
            <Form.Group widths="equal">
              <Form.Select
                search
                name="listId"
                value={data.listId}
                label={t('common.list')}
                options={listOptions}
                placeholder={t('common.selectList')}
                onChange={handleFieldChange}
              />
              <Form.Select
                name="type"
                value={data.type}
                label={t('common.defaultCardType', {
                  context: 'title',
                })}
                options={typeOptions}
                onChange={handleFieldChange}
              />
            </Form.Group>
            <Form.Group widths="equal">
              <Form.Input
                name="startDate"
                value={data.startDate}
                label={t('common.startDate')}
                onChange={handleFieldChange}
              />
              {!data.isAllDay && (
                <Form.Input
                  name="startTime"
                  value={data.startTime}
                  label={t('common.startTime')}
                  onChange={handleFieldChange}
                />
              )}
            </Form.Group>
            <Form.Group widths="equal">
              <Form.Input
                name="endDate"
                value={data.endDate}
                label={t('common.endDate')}
                onChange={handleFieldChange}
              />
              {!data.isAllDay && (
                <Form.Input
                  name="endTime"
                  value={data.endTime}
                  label={t('common.endTime')}
                  onChange={handleFieldChange}
                />
              )}
            </Form.Group>
            <Form.Checkbox
              name="isAllDay"
              checked={data.isAllDay}
              label={t('common.allDay')}
              onChange={handleFieldChange}
            />
            <div className={styles.controls}>
              <Button type="button" onClick={handleClose}>
                {t('action.cancel')}
              </Button>
              <Button positive disabled={!data.name.trim() || !data.listId}>
                {t('action.addCard')}
              </Button>
            </div>
          </Form>
        </Modal.Content>
      </Modal>
    );
  },
);

GlobalCalendarCreateCardModal.propTypes = {
  isOpened: PropTypes.bool.isRequired,
  defaults: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  filters: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  projects: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  boards: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  lists: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onCreate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

GlobalCalendarCreateCardModal.defaultProps = {
  defaults: null,
};

export default GlobalCalendarCreateCardModal;
