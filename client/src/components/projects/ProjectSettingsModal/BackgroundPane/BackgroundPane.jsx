/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Tab } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { ProjectBackgroundTypes } from '../../../../constants/Enums';
import Gradients from './Gradients';
import Images from './Images';
import AddImageZone from './AddImageZone';
import Color from './Color';
import {
  BackgroundTargets,
  buildBackgroundDataFromBackground,
  buildClearBackgroundData,
  getBackgroundForTarget,
} from './utils';

import styles from './BackgroundPane.module.scss';

const TITLE_BY_TYPE = {
  [ProjectBackgroundTypes.GRADIENT]: 'common.gradients',
  [ProjectBackgroundTypes.IMAGE]: 'common.uploadedImages',
  [ProjectBackgroundTypes.COLOR]: 'common.customColor',
};

const TITLE_BY_TARGET = {
  [BackgroundTargets.BACKGROUND]: 'common.boardBackground',
  [BackgroundTargets.COVER]: 'common.projectCover',
};

const BackgroundPane = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [activeTarget, setActiveTarget] = useState(BackgroundTargets.BACKGROUND);
  const activeBackground = useMemo(
    () => getBackgroundForTarget(project, activeTarget),
    [project, activeTarget],
  );
  const [activeType, setActiveType] = useState(ProjectBackgroundTypes.GRADIENT);

  useEffect(() => {
    setActiveType(activeBackground.type || ProjectBackgroundTypes.GRADIENT);
  }, [activeBackground.type]);

  const handleImageCreate = useCallback(
    (file) => {
      dispatch(
        entryActions.createBackgroundImageInCurrentProject({
          file,
          target: activeTarget,
        }),
      );

      setActiveType(ProjectBackgroundTypes.IMAGE);
    },
    [activeTarget, dispatch],
  );

  const handleActiveTargetChange = useCallback((_, { value }) => {
    setActiveTarget(value);
  }, []);

  const handleActiveTypeChange = useCallback((_, { value }) => {
    setActiveType(value);
  }, []);

  const handleApplyToBothClick = useCallback(() => {
    dispatch(
      entryActions.updateCurrentProject({
        ...buildBackgroundDataFromBackground(BackgroundTargets.BACKGROUND, activeBackground),
        ...buildBackgroundDataFromBackground(BackgroundTargets.COVER, activeBackground),
      }),
    );
  }, [activeBackground, dispatch]);

  const handleClearClick = useCallback(() => {
    dispatch(entryActions.updateCurrentProject(buildClearBackgroundData(activeTarget)));
  }, [activeTarget, dispatch]);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <AddImageZone onCreate={handleImageCreate}>
        <Button.Group fluid basic className={styles.activeTargetButtonGroup}>
          {Object.values(BackgroundTargets).map((target) => (
            <Button
              key={target}
              type="button"
              value={target}
              active={target === activeTarget}
              onClick={handleActiveTargetChange}
            >
              {t(TITLE_BY_TARGET[target])}
            </Button>
          ))}
        </Button.Group>
        <div className={styles.actionsRow}>
          <Button
            type="button"
            basic
            compact
            icon="copy outline"
            content={t('common.applyToBoth')}
            disabled={!activeBackground.type}
            onClick={handleApplyToBothClick}
          />
          <Button
            type="button"
            basic
            compact
            icon="eraser"
            content={t('common.clearBackground')}
            onClick={handleClearClick}
          />
        </div>
        <Button.Group fluid basic className={styles.activeTypeButtonGroup}>
          {[
            ProjectBackgroundTypes.GRADIENT,
            ProjectBackgroundTypes.IMAGE,
            ProjectBackgroundTypes.COLOR,
          ].map((type) => (
            <Button
              key={type}
              type="button"
              value={type}
              active={type === activeType}
              onClick={handleActiveTypeChange}
            >
              {t(TITLE_BY_TYPE[type])}
            </Button>
          ))}
        </Button.Group>
        {activeType === ProjectBackgroundTypes.GRADIENT && <Gradients target={activeTarget} />}
        {activeType === ProjectBackgroundTypes.IMAGE && <Images target={activeTarget} />}
        {activeType === ProjectBackgroundTypes.COLOR && <Color target={activeTarget} />}
      </AddImageZone>
    </Tab.Pane>
  );
});

export default BackgroundPane;
