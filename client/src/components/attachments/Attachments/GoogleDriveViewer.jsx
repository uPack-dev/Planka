/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';

import styles from './GoogleDriveViewer.module.scss';

const GoogleDriveViewer = React.memo(({ embedUrl, name, webViewLink, className }) => {
  const [t] = useTranslation();

  return (
    <div className={className}>
      <iframe
        src={embedUrl}
        title={name}
        className={styles.iframe}
        sandbox="allow-scripts allow-same-origin allow-popups"
        allowFullScreen
      />
      <div className={styles.actions}>
        <Button
          basic
          inverted
          size="small"
          icon="external"
          content={t('common.openInGoogleDrive')}
          onClick={(e) => {
            e.stopPropagation();
            window.open(webViewLink, '_blank');
          }}
        />
      </div>
    </div>
  );
});

GoogleDriveViewer.propTypes = {
  embedUrl: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  webViewLink: PropTypes.string.isRequired,
  className: PropTypes.string,
};

GoogleDriveViewer.defaultProps = {
  className: undefined,
};

export default GoogleDriveViewer;
