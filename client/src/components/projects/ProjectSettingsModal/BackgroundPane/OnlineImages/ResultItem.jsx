/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon, Label, Popup } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import styles from './ResultItem.module.scss';

const PROVIDER_LABELS = {
  pexels: 'common.providerPexels',
  openverse: 'common.providerOpenverse',
  wikimedia: 'common.providerWikimedia',
  unsplash: 'common.providerUnsplash',
};

const ResultItem = React.memo(({ item, target, isImporting, onImport }) => {
  const [t] = useTranslation();

  const isImportDisabled = !item.importToken || !item.isFullHd || isImporting;
  const previewUrls = useMemo(
    () => [...new Set([item.thumbnailUrl, item.previewUrl].filter(Boolean))],
    [item.thumbnailUrl, item.previewUrl],
  );

  const [previewIndex, setPreviewIndex] = useState(0);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const previewUrl = previewUrls[previewIndex];

  useEffect(() => {
    setPreviewIndex(0);
  }, [item.id, item.provider, item.thumbnailUrl, item.previewUrl]);

  const handlePrimaryImportClick = useCallback(() => {
    onImport(item, target);
  }, [item, target, onImport]);

  const handleBackgroundImportClick = useCallback(() => {
    setIsImportMenuOpen(false);
    onImport(item, 'background');
  }, [item, onImport]);

  const handleCoverImportClick = useCallback(() => {
    setIsImportMenuOpen(false);
    onImport(item, 'cover');
  }, [item, onImport]);

  const handleBothImportClick = useCallback(() => {
    setIsImportMenuOpen(false);
    onImport(item, 'both');
  }, [item, onImport]);

  const handlePreviewError = useCallback(() => {
    setPreviewIndex((index) => index + 1);
  }, []);

  const handleImportMenuOpen = useCallback(() => {
    setIsImportMenuOpen(true);
  }, []);

  const handleImportMenuClose = useCallback(() => {
    setIsImportMenuOpen(false);
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.preview}>
        {previewUrl && (
          <img
            src={previewUrl}
            alt=""
            loading="lazy"
            className={styles.previewImage}
            onError={handlePreviewError}
          />
        )}
        {item.isFullHd && (
          <Label corner="left" size="mini" className={styles.fullHdLabel}>
            <Icon name="checkmark" />
          </Label>
        )}
      </div>
      <div className={styles.meta}>
        <div className={styles.title}>{item.title || t('common.onlineImages')}</div>
        <div className={styles.badges}>
          <span className={styles.providerBadge}>{t(PROVIDER_LABELS[item.provider])}</span>
          {item.width && item.height && (
            <span className={styles.dimensions}>
              {t('common.imageDimensions', {
                width: item.width,
                height: item.height,
              })}
            </span>
          )}
          {item.isFullHd && <span className={styles.fullHdBadge}>{t('common.fullHdPlus')}</span>}
        </div>
        {(item.authorName || item.license) && (
          <div className={styles.attribution}>
            {item.authorName && (
              <span>
                {t('common.photoBy', {
                  author: item.authorName,
                })}
              </span>
            )}
            {item.license && <span>{item.license}</span>}
          </div>
        )}
      </div>
      {!item.isFullHd && <div className={styles.warning}>{t('common.imageTooSmall')}</div>}
      <Button.Group size="tiny" fluid className={styles.importButtons}>
        <Button
          type="button"
          primary
          loading={isImporting}
          disabled={isImportDisabled}
          className={styles.importButton}
          onClick={handlePrimaryImportClick}
        >
          {t('action.import')}
        </Button>
        <Popup
          basic
          on="click"
          open={isImportMenuOpen}
          position="bottom right"
          trigger={
            <Button
              type="button"
              icon="caret down"
              disabled={isImportDisabled}
              className={styles.importMenuButton}
            />
          }
          popperModifiers={[
            {
              name: 'preventOverflow',
              enabled: true,
              options: {
                altAxis: true,
                padding: 8,
              },
            },
          ]}
          className={styles.importPopup}
          onOpen={handleImportMenuOpen}
          onClose={handleImportMenuClose}
        >
          <div className={styles.importMenu}>
            <button
              type="button"
              className={styles.importMenuItem}
              onClick={handleBackgroundImportClick}
            >
              {t('common.importAsBoardBackground')}
            </button>
            <button
              type="button"
              className={styles.importMenuItem}
              onClick={handleCoverImportClick}
            >
              {t('common.importAsProjectCover')}
            </button>
            <button type="button" className={styles.importMenuItem} onClick={handleBothImportClick}>
              {t('common.importForBoth')}
            </button>
          </div>
        </Popup>
      </Button.Group>
    </div>
  );
});

ResultItem.propTypes = {
  item: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  target: PropTypes.oneOf(['background', 'cover']).isRequired,
  isImporting: PropTypes.bool.isRequired,
  onImport: PropTypes.func.isRequired,
};

export default ResultItem;
