/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Loader } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import api from '../../../api';
import selectors from '../../../selectors';

import styles from './ImportStep.module.scss';

const TemplateStep = React.memo(({ onSelect, onBack }) => {
  const accessToken = useSelector(selectors.selectAccessToken);
  const [t] = useTranslation();

  const [templates, setTemplates] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api
      .getBoardTemplates({
        Authorization: `Bearer ${accessToken}`,
      })
      .then(({ items }) => {
        if (isMounted) {
          setTemplates(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTemplates([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsFetching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const handleSelectClick = useCallback(
    (_, { value }) => {
      const template = templates.find((item) => item.id === value);

      if (template) {
        onSelect(template);
      }
    },
    [templates, onSelect],
  );

  let contentNode;
  if (isFetching) {
    contentNode = <Loader active inline="centered" />;
  } else if (templates.length > 0) {
    contentNode = templates.map((template) => (
      <Button
        key={template.id}
        fluid
        value={template.id}
        content={template.name}
        icon="copy outline"
        className={styles.button}
        onClick={handleSelectClick}
      />
    ));
  } else {
    contentNode = <div className={styles.text}>{t('common.noBoardTemplates')}</div>;
  }

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.selectBoardTemplate', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>{contentNode}</Popup.Content>
    </>
  );
});

TemplateStep.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default TemplateStep;
