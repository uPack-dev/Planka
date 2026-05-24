/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Menu, Message } from 'semantic-ui-react';
import { FilePicker, Popup } from '../../../lib/custom-ui';

import entryActions from '../../../entry-actions';
import selectors from '../../../selectors';
import { AttachmentTypes, UserRoles } from '../../../constants/Enums';
import Config from '../../../constants/Config';
import googleDrivePicker, { ErrorCodes } from '../../../utils/google-drive-picker';

import styles from './AddAttachmentStep.module.scss';

const fetchGoogleDriveStatus = async () => {
  const response = await fetch(`${Config.BASE_PATH}/api/google-drive/status`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = new Error('Failed to get Google Drive status');
    error.code = ErrorCodes.TOKEN_FAILED;
    throw error;
  }

  return response.json();
};

const AddAttachmentStep = React.memo(({ onClose }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isGoogleDriveLoading, setIsGoogleDriveLoading] = useState(false);
  const [googleDriveError, setGoogleDriveError] = useState(null);
  const [showSettingsLink, setShowSettingsLink] = useState(false);

  const currentUser = useSelector(selectors.selectCurrentUser);
  const isAdmin = currentUser && currentUser.role === UserRoles.ADMIN;

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

    setGoogleDriveError(null);
    setShowSettingsLink(false);
    setIsGoogleDriveLoading(true);

    try {
      const status = await fetchGoogleDriveStatus();

      if (!status.configured) {
        const error = new Error(t('common.googleDriveIntegrationNotConfigured'));
        error.code = ErrorCodes.NOT_CONFIGURED;
        throw error;
      }

      const files = await googleDrivePicker.openGoogleDrivePicker(t, {
        configured: true,
      });

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
      if (error.code === ErrorCodes.PICKER_CANCELLED) {
        return;
      }

      if (error.code === ErrorCodes.NOT_CONFIGURED || error.code === ErrorCodes.DISABLED) {
        setShowSettingsLink(true);
        setGoogleDriveError(error.message);
      } else if (error.code === ErrorCodes.OAUTH_CANCELLED) {
        setGoogleDriveError(t('common.googleDriveConnectionFailed'));
      } else if (error.code === ErrorCodes.POPUP_BLOCKED) {
        setGoogleDriveError(t('common.popupWasBlocked'));
      } else {
        setGoogleDriveError(error.message || t('common.googleDrivePickerFailed'));
      }
    } finally {
      setIsGoogleDriveLoading(false);
    }
  }, [isGoogleDriveLoading, onClose, dispatch, t]);

  const handleConfigureClick = useCallback(() => {
    dispatch(entryActions.closeModal());
    dispatch(entryActions.openAdministrationModal());
  }, [dispatch]);

  return (
    <>
      <Popup.Header>
        {t('common.addAttachment', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        {googleDriveError && (
          <Message visible warning className={styles.errorMessage}>
            <Message.Content>
              {googleDriveError}
              {showSettingsLink && isAdmin && (
                <>
                  {' '}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleConfigureClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfigureClick();
                    }}
                    className={styles.configureLink}
                  >
                    {t('action.configureGoogleDrive')}
                  </span>
                </>
              )}
              {showSettingsLink &&
                !isAdmin &&
                ` ${t('common.askAdministratorToConfigureGoogleDrive')}`}
            </Message.Content>
          </Message>
        )}
        <Menu secondary vertical className={styles.menu}>
          <FilePicker multiple onSelect={handleFilesSelect}>
            <Menu.Item className={styles.menuItem}>
              <Icon name="computer" className={styles.menuItemIcon} />
              {t('common.fromComputer', {
                context: 'title',
              })}
            </Menu.Item>
          </FilePicker>
          <Menu.Item
            className={styles.menuItem}
            onClick={handleGoogleDriveSelect}
            disabled={isGoogleDriveLoading}
          >
            <Icon name="cloud" className={styles.menuItemIcon} />
            {isGoogleDriveLoading ? t('common.loading') : t('common.fromGoogleDrive')}
          </Menu.Item>
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