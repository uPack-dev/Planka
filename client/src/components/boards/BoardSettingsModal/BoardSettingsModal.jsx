/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useClosableModal } from '../../../hooks';
import GeneralPane from './GeneralPane';
import PreferencesPane from './PreferencesPane';
import NotificationsPane from './NotificationsPane';

const BoardSettingsModal = React.memo(() => {
  const openPreferences = useSelector(
    (state) => selectors.selectCurrentModal(state).params.openPreferences,
  );
  const boardId = useSelector((state) => selectors.selectCurrentModal(state).params.id);
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
  const selectProjectById = useMemo(() => selectors.makeSelectProjectById(), []);
  const board = useSelector((state) => selectBoardById(state, boardId));
  const project = useSelector((state) => board && selectProjectById(state, board.projectId));
  const isReadOnly = !!(board && (board.isArchived || (project && project.isArchived)));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const [ClosableModal] = useClosableModal();

  const panes = [
    {
      menuItem: t('common.general', {
        context: 'title',
      }),
      render: () => <GeneralPane />,
    },
  ];

  if (!isReadOnly) {
    panes.push(
      {
        menuItem: t('common.preferences', {
          context: 'title',
        }),
        render: () => <PreferencesPane />,
      },
      {
        menuItem: t('common.notifications', {
          context: 'title',
        }),
        render: () => <NotificationsPane />,
      },
    );
  }

  return (
    <ClosableModal closeIcon size="small" centered={false} onClose={handleClose}>
      <ClosableModal.Content>
        <Tab
          menu={{
            secondary: true,
            pointing: true,
          }}
          panes={panes}
          defaultActiveIndex={openPreferences && !isReadOnly ? 1 : undefined}
        />
      </ClosableModal.Content>
    </ClosableModal>
  );
});

export default BoardSettingsModal;
