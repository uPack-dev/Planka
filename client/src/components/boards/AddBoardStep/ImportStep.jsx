/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import { FilePicker, Popup } from '../../../lib/custom-ui';

import { useSteps } from '../../../hooks';
import TemplateStep from './TemplateStep';

import styles from './ImportStep.module.scss';

const StepTypes = {
  TEMPLATE: 'TEMPLATE',
};

const ImportStep = React.memo(({ onSelect, onBack }) => {
  const [t] = useTranslation();
  const [step, openStep, handleBack] = useSteps();

  const handleFileSelect = useCallback(
    (type, file) => {
      onSelect({
        type,
        file,
      });

      onBack();
    },
    [onSelect, onBack],
  );

  const handleTemplateSelect = useCallback(
    (template) => {
      onSelect({
        type: 'template',
        template,
      });

      onBack();
    },
    [onSelect, onBack],
  );

  const handleTemplateClick = useCallback(() => {
    openStep(StepTypes.TEMPLATE);
  }, [openStep]);

  if (step && step.type === StepTypes.TEMPLATE) {
    return <TemplateStep onSelect={handleTemplateSelect} onBack={handleBack} />;
  }

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.importBoard', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <FilePicker accept=".json" onSelect={(file) => handleFileSelect('trello', file)}>
          <Button fluid content={t('common.fromTrello')} icon="trello" className={styles.button} />
        </FilePicker>
        <Button
          fluid
          content={t('common.fromTemplate')}
          icon="copy outline"
          className={styles.button}
          onClick={handleTemplateClick}
        />
      </Popup.Content>
    </>
  );
});

ImportStep.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default ImportStep;
