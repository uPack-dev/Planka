/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import BACKGROUND_GRADIENTS from '../../../../../constants/BackgroundGradients';
import Item from './Item';

import styles from './Gradients.module.scss';

const Gradients = React.memo(({ target }) => (
  <div className={styles.wrapper}>
    {BACKGROUND_GRADIENTS.map((backgroundGradient) => (
      <Item key={backgroundGradient} name={backgroundGradient} target={target} />
    ))}
  </div>
));

Gradients.propTypes = {
  target: PropTypes.oneOf(['background', 'cover']).isRequired,
};

export default Gradients;
