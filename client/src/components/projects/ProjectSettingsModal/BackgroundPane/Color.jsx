/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Input, Message } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { ProjectBackgroundTypes } from '../../../../constants/Enums';
import {
  DEFAULT_COLOR,
  buildBackgroundData,
  getBackgroundForTarget,
  normalizeHexColor,
} from './utils';

import styles from './BackgroundPane.module.scss';

const Color = React.memo(({ target }) => {
  const project = useSelector(selectors.selectCurrentProject);
  const background = useMemo(() => getBackgroundForTarget(project, target), [project, target]);

  const [value, setValue] = useState(background.color || DEFAULT_COLOR);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  useEffect(() => {
    setValue(background.color || DEFAULT_COLOR);
  }, [background.color]);

  const normalizedValue = normalizeHexColor(value);
  const isInvalid = value.trim().length > 0 && !normalizedValue;
  const isActive =
    background.type === ProjectBackgroundTypes.COLOR && background.color === normalizedValue;

  const updateColor = useCallback(
    (color) => {
      dispatch(
        entryActions.updateCurrentProject(
          buildBackgroundData(target, ProjectBackgroundTypes.COLOR, color),
        ),
      );
    },
    [target, dispatch],
  );

  const handlePickerChange = useCallback((_, { value: nextValue }) => {
    const normalizedNextValue = normalizeHexColor(nextValue);

    setValue((normalizedNextValue || nextValue).toUpperCase());
  }, []);

  const handleTextChange = useCallback((_, { value: nextValue }) => {
    setValue(nextValue.toUpperCase());
  }, []);

  const handleSaveClick = useCallback(() => {
    if (normalizedValue) {
      updateColor(normalizedValue);
    }
  }, [normalizedValue, updateColor]);

  return (
    <div className={styles.colorWrapper}>
      <div className={styles.colorFields}>
        <Input
          type="color"
          value={normalizedValue || DEFAULT_COLOR}
          aria-label={t('common.customColor')}
          className={styles.colorPicker}
          onChange={handlePickerChange}
        />
        <Input
          value={value}
          placeholder="#1E88E5"
          error={isInvalid}
          className={styles.hexInput}
          onChange={handleTextChange}
        />
        <Button
          type="button"
          icon="check"
          content={t('action.save')}
          disabled={!normalizedValue || isActive}
          className={styles.colorButton}
          onClick={handleSaveClick}
        />
      </div>
      {isInvalid && (
        <Message negative size="mini" className={styles.colorMessage}>
          {t('common.invalidHexColor')}
        </Message>
      )}
    </div>
  );
});

Color.propTypes = {
  target: PropTypes.oneOf(['background', 'cover']).isRequired,
};

export default Color;
