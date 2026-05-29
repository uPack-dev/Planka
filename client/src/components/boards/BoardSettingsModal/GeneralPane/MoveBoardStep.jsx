/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Form } from 'semantic-ui-react';
import { Popup } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { useForm } from '../../../../hooks';

import styles from './MoveBoardStep.module.scss';

const MoveBoardStep = React.memo(({ id, onBack, onClose }) => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const board = useSelector((state) => selectBoardById(state, id));
  const projects = useSelector(selectors.selectProjectsWithManagerRightsForCurrentUser);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm(() => ({
    projectId: board.projectId,
  }));

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === data.projectId) || null,
    [data.projectId, projects],
  );

  const position = useSelector((state) =>
    selectedProject && selectedProject.id !== board.projectId
      ? selectors.selectNextBoardPosition(state, selectedProject.id)
      : undefined,
  );

  const handleSubmit = useCallback(() => {
    if (selectedProject && selectedProject.id !== board.projectId) {
      dispatch(
        entryActions.updateBoard(id, {
          projectId: selectedProject.id,
          position,
        }),
      );
    }

    onClose();
  }, [board.projectId, dispatch, id, onClose, position, selectedProject]);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.moveBoard', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <div className={styles.text}>{t('common.project')}</div>
          <Dropdown
            fluid
            selection
            name="projectId"
            options={projects.map((project) => ({
              text: project.name,
              value: project.id,
            }))}
            value={selectedProject && selectedProject.id}
            placeholder={projects.length === 0 ? t('common.noProjects') : t('common.selectProject')}
            disabled={projects.length === 0}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <Button
            positive
            content={t('action.move')}
            disabled={!selectedProject || selectedProject.id === board.projectId}
          />
        </Form>
      </Popup.Content>
    </>
  );
});

MoveBoardStep.propTypes = {
  id: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

MoveBoardStep.defaultProps = {
  onBack: undefined,
};

export default MoveBoardStep;
