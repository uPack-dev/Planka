/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';
import { FilePicker, Popup } from '../../../lib/custom-ui';

import entryActions from '../../../entry-actions';
import { AttachmentTypes } from '../../../constants/Enums';
import { selectConfig } from '../../../selectors/core';
import googleDrivePicker from '../../../utils/google-drive-picker';

import styles from './AddAttachmentStep.module.scss';

const AddAttachmentStep = React.memo(({ onClose }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isGoogleDriveLoading, setIsGoogleDriveLoading] = useState(false);

  const config = useSelector(selectConfig);
  const googleDriveEnabled = !!(config && config.googleDrive);

  const handleFilesSelect = useCallback(
    (files) => {
      files.forEach((file) => {
        dispatch(
          entryActions.createAttachmentInCurrentCard({
            file,
            type: AttachmentTypes.FILE,
            name: file.name,
          }),
        );
      });

      onClose();
    },
    [onClose, dispatch],
  );

  const handleGoogleDriveSelect = useCallback(async () => {
    if (isGoogleDriveLoading) {
      return;
    }

    setIsGoogleDriveLoading(true);

    try {
      const files = await googleDrivePicker.openGoogleDrivePicker(t);

      if (files.length > 0) {
        files.forEach((file) => {
          dispatch(
            entryActions.createAttachmentInCurrentCard({
              type: AttachmentTypes.LINK,
              provider: 'googleDrive',
              providerData: {
                fileId: file.fileId,
                name: file.name,
                mimeType: file.mimeType,
                webViewLink: file.webViewLink,
                url: file.url,
                embedUrl: file.embedUrl,
                iconUrl: file.iconUrl,
                thumbnailUrl: file.thumbnailUrl,
                resourceKey: file.resourceKey,
              },
              url: file.webViewLink || file.url,
              name: file.name,
            }),
          );
        });

        onClose();
      }
    } catch (error) {
      // Picker cancelled or error — just ignore silently
    } finally {
      setIsGoogleDriveLoading(false);
    }
  }, [isGoogleDriveLoading, onClose, dispatch, t]);

  return (
    <>
      <Popup.Header>
        {t('common.addAttachment', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Menu secondary vertical className={styles.menu}>
          <FilePicker multiple onSelect={handleFilesSelect}>
            <Menu.Item className={styles.menuItem}>
              <Icon name="computer" className={styles.menuItemIcon} />
              {t('common.fromComputer', {
                context: 'title',
              })}
            </Menu.Item>
          </FilePicker>
          {googleDriveEnabled && (
            <Menu.Item
              className={styles.menuItem}
              onClick={handleGoogleDriveSelect}
              disabled={isGoogleDriveLoading}
            >
              <Icon name="cloud" className={styles.menuItemIcon} />
              {isGoogleDriveLoading ? t('common.loading') : t('common.fromGoogleDrive')}
            </Menu.Item>
          )}
        </Menu>
        <hr className={styles.divider} />
        <div className={styles.tip}>
          {t('common.pressPasteShortcutToAddAttachmentFromClipboard')}
        </div>
      </Popup.Content>
    </>
  );
});

AddAttachmentStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AddAttachmentStep;
