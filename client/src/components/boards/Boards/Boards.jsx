/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useRef } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Button, Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';
import { closePopup, usePopup } from '../../../lib/popup';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import DroppableTypes from '../../../constants/DroppableTypes';
import { UserRoles } from '../../../constants/Enums';
import Item from './Item';
import AddBoardStep from '../AddBoardStep';

import styles from './Boards.module.scss';
import globalStyles from '../../../styles.module.scss';

const Boards = React.memo(() => {
  const boardIds = useSelector(selectors.selectBoardIdsForCurrentProject);
  const archivedBoardIds = useSelector(selectors.selectArchivedBoardIdsForCurrentProject);
  const isArchivedBoardsVisible = useSelector(selectors.selectIsArchivedBoardsVisible);

  const canAdd = useSelector((state) => {
    const isEditModeEnabled = selectors.selectIsEditModeEnabled(state); // TODO: move out?

    if (!isEditModeEnabled) {
      return isEditModeEnabled;
    }

    const project = selectors.selectCurrentProject(state);
    const currentUser = selectors.selectCurrentUser(state);

    return (
      !!project &&
      !project.isArchived &&
      (selectors.selectIsCurrentUserManagerForCurrentProject(state) ||
        (currentUser && currentUser.role === UserRoles.ADMIN && !project.ownerProjectManagerId))
    );
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const tabsWrapperRef = useRef(null);

  const handleDragStart = useCallback(() => {
    document.body.classList.add(globalStyles.dragging);
    closePopup();
  }, []);

  const handleDragEnd = useCallback(
    ({ draggableId, source, destination }) => {
      document.body.classList.remove(globalStyles.dragging);

      if (!destination || source.index === destination.index) {
        return;
      }

      dispatch(entryActions.moveBoard(draggableId, destination.index));
    },
    [dispatch],
  );

  const handleWheel = useCallback(({ deltaY }) => {
    tabsWrapperRef.current.scrollBy({
      left: deltaY,
    });
  }, []);

  const handleArchivedDragEnd = useCallback(() => {
    document.body.classList.remove(globalStyles.dragging);
  }, []);

  const handleToggleArchivedClick = useCallback(() => {
    dispatch(entryActions.toggleArchivedBoards(!isArchivedBoardsVisible));
  }, [isArchivedBoardsVisible, dispatch]);

  const AddBoardPopup = usePopup(AddBoardStep);

  return (
    <div
      className={classNames(
        styles.wrapper,
        archivedBoardIds.length > 0 && isArchivedBoardsVisible && styles.wrapperExpanded,
      )}
      onWheel={handleWheel}
    >
      <div ref={tabsWrapperRef} className={styles.tabsWrapper}>
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="boards" type={DroppableTypes.BOARD} direction="horizontal">
            {({ innerRef, droppableProps, placeholder }) => (
              // eslint-disable-next-line react/jsx-props-no-spreading
              <div {...droppableProps} ref={innerRef} className={styles.tabs}>
                {boardIds.map((boardId, index) => (
                  <Item key={boardId} id={boardId} index={index} />
                ))}
                {placeholder}
                {canAdd && (
                  <AddBoardPopup>
                    <Button icon="plus" className={styles.addButton} />
                  </AddBoardPopup>
                )}
                {archivedBoardIds.length > 0 && (
                  <button
                    type="button"
                    className={styles.archivedButton}
                    onClick={handleToggleArchivedClick}
                  >
                    <Icon name={isArchivedBoardsVisible ? 'chevron up' : 'chevron down'} />
                    <Icon name="archive" />
                    {t('common.archivedBoards', {
                      context: 'title',
                    })}
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      {archivedBoardIds.length > 0 && isArchivedBoardsVisible && (
        <div className={styles.archivedTabsWrapper}>
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleArchivedDragEnd}>
            <Droppable
              droppableId="archivedBoards"
              type={DroppableTypes.BOARD}
              direction="horizontal"
              isDropDisabled
            >
              {({ innerRef, droppableProps, placeholder }) => (
                // eslint-disable-next-line react/jsx-props-no-spreading
                <div {...droppableProps} ref={innerRef} className={styles.tabs}>
                  {archivedBoardIds.map((boardId, index) => (
                    <Item key={boardId} id={boardId} index={index} isArchived />
                  ))}
                  {placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}
    </div>
  );
});

export default Boards;
