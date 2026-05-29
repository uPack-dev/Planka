/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab, Button, Loader, Message, List } from 'semantic-ui-react';
import { usePopupInClosableContext } from '../../../hooks';
import ConfirmationStep from '../ConfirmationStep';

import api from '../../../api';
import selectors from '../../../selectors';

import styles from './TemplatesPane.module.scss';

const TemplatesPane = React.memo(() => {
  const accessToken = useSelector(selectors.selectAccessToken);
  const [t] = useTranslation();

  const [templates, setTemplates] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(() => {
    setIsFetching(true);
    setError(null);
    api
      .getBoardTemplates({
        Authorization: `Bearer ${accessToken}`,
      })
      .then(({ items }) => {
        setTemplates(items);
      })
      .catch((err) => {
        setError(err.message || t('common.unknownError'));
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [accessToken, t]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDeleteConfirm = useCallback(
    (id) => {
      api
        .deleteBoardTemplate(id, {
          Authorization: `Bearer ${accessToken}`,
        })
        .then(() => {
          setTemplates((prev) => prev.filter((item) => item.id !== id));
        })
        .catch((err) => {
          setError(err.message || t('common.unknownError'));
        });
    },
    [accessToken, t],
  );

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  let contentNode;
  if (isFetching) {
    contentNode = <Loader active inline="centered" />;
  } else if (error) {
    contentNode = (
      <Message negative>
        <Message.Content>{error}</Message.Content>
      </Message>
    );
  } else if (templates.length > 0) {
    contentNode = (
      <List divided relaxed className={styles.templateList}>
        {templates.map((template) => (
          <List.Item key={template.id} className={styles.templateItem}>
            <List.Content className={styles.templateContent}>
              <div className={styles.templateName}>{template.name}</div>
              <ConfirmationPopup
                title="action.deleteTemplate_title"
                content="common.areYouSureYouWantToDeleteThisTemplate"
                buttonContent="action.deleteTemplate"
                onConfirm={() => handleDeleteConfirm(template.id)}
              >
                <Button
                  type="button"
                  className={styles.deleteButton}
                  icon="trash alternate"
                  basic
                  compact
                />
              </ConfirmationPopup>
            </List.Content>
          </List.Item>
        ))}
      </List>
    );
  } else {
    contentNode = <div className={styles.text}>{t('common.noBoardTemplates')}</div>;
  }

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {contentNode}
    </Tab.Pane>
  );
});

export default TemplatesPane;
