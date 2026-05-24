/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Label, Loader } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import { isListArchiveOrTrash } from '../../../utils/record-helpers';
import { AttachmentTypes, BoardMembershipRoles } from '../../../constants/Enums';
import EditStep from './EditStep';
import Favicon from '../../common/Favicon';
import TimeAgo from '../../common/TimeAgo';

import styles from './ItemContent.module.scss';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

const ItemContent = React.forwardRef(({ id, onOpen }, ref) => {
  const selectAttachmentById = useMemo(() => selectors.makeSelectAttachmentById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const attachment = useSelector((state) => selectAttachmentById(state, id));
  const attachmentData = attachment?.data || {};

  const isCover = useSelector(
    (state) => id === selectors.selectCurrentCard(state).coverAttachmentId,
  );

  const canEdit = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return false;
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const isGoogleDrive =
    attachment?.type === AttachmentTypes.LINK && attachmentData.provider === 'googleDrive';
  const isGoogleDriveFolder = isGoogleDrive && attachmentData.mimeType === FOLDER_MIME_TYPE;

  const handleClick = useCallback(() => {
    if (onOpen) {
      onOpen();
    } else if (isGoogleDrive) {
      window.open(attachmentData.webViewLink || attachmentData.url, '_blank');
    } else if (attachmentData.url) {
      window.open(attachmentData.url, '_blank');
    }
  }, [onOpen, attachmentData, isGoogleDrive]);

  const handleDownloadClick = useCallback(
    (event) => {
      event.stopPropagation();

      const linkElement = document.createElement('a');
      linkElement.href = attachmentData.url;
      linkElement.download = attachmentData.filename;
      linkElement.target = '_blank';
      linkElement.click();
    },
    [attachmentData],
  );

  const handleToggleCoverClick = useCallback(
    (event) => {
      event.stopPropagation();

      dispatch(
        entryActions.updateCurrentCard({
          coverAttachmentId: isCover ? null : id,
        }),
      );
    },
    [id, isCover, dispatch],
  );

  const handleOpenInDriveClick = useCallback(
    (event) => {
      event.stopPropagation();
      window.open(attachmentData.webViewLink || attachmentData.url, '_blank');
    },
    [attachmentData],
  );

  const EditPopup = usePopupInClosableContext(EditStep);

  if (!attachment || !attachment.isPersisted) {
    return (
      <div className={classNames(styles.wrapper, styles.wrapperSubmitting)}>
        <Loader inverted />
      </div>
    );
  }

  const renderThumbnail = () => {
    if (attachment.type === AttachmentTypes.FILE) {
      if (attachmentData.image) {
        return {
          background: `url("${attachmentData.thumbnailUrls.outside360}") center / cover`,
          children: isCover ? (
            <Label
              corner="left"
              size="mini"
              icon={{
                name: 'checkmark',
                color: 'grey',
                inverted: true,
              }}
              className={styles.thumbnailLabel}
            />
          ) : null,
        };
      }

      return {
        children: (
          <span className={styles.thumbnailExtension}>{attachmentData.extension || '-'}</span>
        ),
      };
    }

    if (isGoogleDrive) {
      if (attachmentData.thumbnailUrl) {
        return {
          background: `url("${attachmentData.thumbnailUrl}") center / cover`,
        };
      }

      return {
        children: <Icon name={isGoogleDriveFolder ? 'folder open' : 'cloud'} size="big" color="grey" />,
      };
    }

    return {
      children: <Favicon url={attachmentData.faviconUrl} />,
    };
  };

  const thumbnail = renderThumbnail();

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                jsx-a11y/no-static-element-interactions */
    <div ref={ref} className={styles.wrapper} onClick={handleClick}>
      <div
        className={styles.thumbnail}
        style={{
          background: thumbnail.background,
        }}
      >
        {thumbnail.children}
      </div>
      <div className={styles.details}>
        <span className={styles.name}>{attachment.name}</span>
        <span className={styles.information}>
          {isGoogleDrive && (
            <>
              <span className={styles.providerLabel}>
                {isGoogleDriveFolder ? t('common.googleDriveFolder') : t('common.googleDrive')}
              </span>
              {' — '}
            </>
          )}
          <TimeAgo date={attachment.createdAt} />
        </span>
        {attachment.type === AttachmentTypes.FILE && (
          <span className={styles.options}>
            <button type="button" className={styles.option} onClick={handleDownloadClick}>
              <Icon name="download" size="small" className={styles.optionIcon} />
              <span className={styles.optionText}>
                {t('action.download', {
                  context: 'title',
                })}
              </span>
            </button>
            {attachmentData.image && canEdit && (
              <button type="button" className={styles.option} onClick={handleToggleCoverClick}>
                <Icon
                  name="window maximize outline"
                  flipped="vertically"
                  size="small"
                  className={styles.optionIcon}
                />
                <span className={styles.optionText}>
                  {isCover
                    ? t('action.removeCover', {
                        context: 'title',
                      })
                    : t('action.makeCover', {
                        context: 'title',
                      })}
                </span>
              </button>
            )}
          </span>
        )}
        {isGoogleDrive && (
          <span className={styles.options}>
            <button type="button" className={styles.option} onClick={handleOpenInDriveClick}>
              <Icon name="external" size="small" className={styles.optionIcon} />
              <span className={styles.optionText}>{t('common.openInGoogleDrive')}</span>
            </button>
          </span>
        )}
      </div>
      {canEdit && (
        <EditPopup attachmentId={id}>
          <Button className={styles.editButton}>
            <Icon fitted name="pencil" size="small" />
          </Button>
        </EditPopup>
      )}
    </div>
  );
});

ItemContent.propTypes = {
  id: PropTypes.string.isRequired,
  onOpen: PropTypes.func,
};

ItemContent.defaultProps = {
  onOpen: undefined,
};

export default React.memo(ItemContent);