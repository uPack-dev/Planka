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

const ItemContent = React.forwardRef(({ id, onOpen }, ref) => {
  const selectAttachmentById = useMemo(() => selectors.makeSelectAttachmentById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const attachment = useSelector((state) => selectAttachmentById(state, id));

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
    attachment.type === AttachmentTypes.LINK && attachment.data.provider === 'googleDrive';

  const handleClick = useCallback(() => {
    if (onOpen) {
      onOpen();
    } else if (isGoogleDrive) {
      window.open(attachment.data.webViewLink || attachment.data.url, '_blank');
    } else {
      window.open(attachment.data.url, '_blank');
    }
  }, [onOpen, attachment.data, isGoogleDrive]);

  const handleDownloadClick = useCallback(
    (event) => {
      event.stopPropagation();

      const linkElement = document.createElement('a');
      linkElement.href = attachment.data.url;
      linkElement.download = attachment.data.filename;
      linkElement.target = '_blank';
      linkElement.click();
    },
    [attachment.data],
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
      window.open(attachment.data.webViewLink || attachment.data.url, '_blank');
    },
    [attachment.data],
  );

  const EditPopup = usePopupInClosableContext(EditStep);

  if (!attachment.isPersisted) {
    return (
      <div className={classNames(styles.wrapper, styles.wrapperSubmitting)}>
        <Loader inverted />
      </div>
    );
  }

  const renderThumbnail = () => {
    if (attachment.type === AttachmentTypes.FILE) {
      if (attachment.data.image) {
        return {
          background: `url("${attachment.data.thumbnailUrls.outside360}") center / cover`,
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
          <span className={styles.thumbnailExtension}>{attachment.data.extension || '-'}</span>
        ),
      };
    }

    if (isGoogleDrive) {
      return {
        children: <Icon name="cloud" size="big" color="grey" />,
      };
    }

    return {
      children: <Favicon url={attachment.data.faviconUrl} />,
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
              <span className={styles.providerLabel}>{t('common.googleDrive')}</span>
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
            {attachment.data.image && canEdit && (
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
