/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Loader } from 'semantic-ui-react';

import selectors from '../../../../../selectors';
import entryActions from '../../../../../entry-actions';
import { ProjectBackgroundTypes } from '../../../../../constants/Enums';
import { buildBackgroundData, buildClearBackgroundData, getBackgroundForTarget } from '../utils';
import Image from '../Image';

import styles from './Item.module.scss';

const Item = React.memo(({ id, target }) => {
  const selectBackgroundImageById = useMemo(() => selectors.makeSelectBackgroundImageById(), []);

  const backgroundImage = useSelector((state) => selectBackgroundImageById(state, id));

  const isActive = useSelector((state) => {
    const background = getBackgroundForTarget(selectors.selectCurrentProject(state), target);
    return background.type === ProjectBackgroundTypes.IMAGE && id === background.imageId;
  });

  const dispatch = useDispatch();

  const handleSelect = useCallback(() => {
    dispatch(
      entryActions.updateCurrentProject(
        buildBackgroundData(target, ProjectBackgroundTypes.IMAGE, id),
      ),
    );
  }, [id, target, dispatch]);

  const handleDeselect = useCallback(() => {
    dispatch(entryActions.updateCurrentProject(buildClearBackgroundData(target)));
  }, [target, dispatch]);

  const handleDelete = useCallback(() => {
    dispatch(entryActions.deleteBackgroundImage(id));
  }, [id, dispatch]);

  if (!backgroundImage.isPersisted) {
    return (
      <div className={styles.wrapperSubmitting}>
        <Loader inverted />
      </div>
    );
  }

  return (
    <Image
      url={backgroundImage.thumbnailUrls.outside360}
      isActive={isActive}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onDelete={handleDelete}
    />
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  target: PropTypes.oneOf(['background', 'cover']).isRequired,
};

export default Item;
