/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dropdown, Form, Input, Message } from 'semantic-ui-react';

import selectors from '../../../../../selectors';
import entryActions from '../../../../../entry-actions';
import api from '../../../../../api';
import ResultItem from './ResultItem';

import styles from './OnlineImages.module.scss';

const PROVIDER_LABELS = {
  pexels: 'common.providerPexels',
  openverse: 'common.providerOpenverse',
  wikimedia: 'common.providerWikimedia',
  unsplash: 'common.providerUnsplash',
};

const LANGUAGE_OPTIONS = [
  { key: 'auto', value: 'auto', text: 'common.languageAuto' },
  { key: 'en', value: 'en', text: 'common.languageEnglish' },
  { key: 'ru', value: 'ru', text: 'common.languageRussian' },
  { key: 'uk', value: 'uk', text: 'common.languageUkrainian' },
];

const ORIENTATION_OPTIONS = [
  { key: 'landscape', value: 'landscape', text: 'common.orientationLandscape' },
  { key: 'any', value: 'any', text: 'common.orientationAny' },
  { key: 'portrait', value: 'portrait', text: 'common.orientationPortrait' },
  { key: 'square', value: 'square', text: 'common.orientationSquare' },
];

const getErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  return error.message || fallback;
};

const getImportErrorMessage = (error, t) => {
  switch (error && error.message) {
    case 'Image is smaller than the minimum required size':
      return t('common.imageTooSmall');
    case 'Remote image download failed':
    case 'File is not image':
      return t('common.imageImportFailed');
    default:
      return getErrorMessage(error, t('common.imageImportFailed'));
  }
};

const buildQuickQueries = (project) => {
  const queries = [];

  if (project.name) {
    queries.push(project.name);
  }

  if (project.description) {
    const words = project.description
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 5);

    if (words.length > 0) {
      queries.push(words.join(' '));
    }
  }

  return [...new Set(queries)].slice(0, 3);
};

const OnlineImages = React.memo(({ target }) => {
  const project = useSelector(selectors.selectCurrentProject);
  const accessToken = useSelector(selectors.selectAccessToken);
  const bootstrap = useSelector(selectors.selectBootstrap) || {};
  const searchConfig = bootstrap.backgroundImageSearch || {};

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('auto');
  const [language, setLanguage] = useState('auto');
  const [orientation, setOrientation] = useState('landscape');
  const [fullHdOnly, setFullHdOnly] = useState(true);
  const [items, setItems] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [importingKey, setImportingKey] = useState(null);
  const [importError, setImportError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const providerOptions = useMemo(
    () => [
      {
        key: 'auto',
        value: 'auto',
        text: t('common.providerAuto'),
        disabled: !searchConfig.enabled,
      },
      ...(searchConfig.providers || []).map(({ name, isAvailable }) => ({
        key: name,
        value: name,
        text: isAvailable
          ? t(PROVIDER_LABELS[name])
          : `${t(PROVIDER_LABELS[name])} (${t('common.providerNotConfigured')})`,
        disabled: !isAvailable,
      })),
    ],
    [searchConfig.enabled, searchConfig.providers, t],
  );

  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((option) => ({
        ...option,
        text: t(option.text),
      })),
    [t],
  );

  const orientationOptions = useMemo(
    () =>
      ORIENTATION_OPTIONS.map((option) => ({
        ...option,
        text: t(option.text),
      })),
    [t],
  );

  const quickQueries = useMemo(() => buildQuickQueries(project), [project]);

  const handleQueryChange = useCallback((_, { value }) => {
    setQuery(value);
  }, []);

  const handleProviderChange = useCallback((_, { value }) => {
    setProvider(value);
  }, []);

  const handleLanguageChange = useCallback((_, { value }) => {
    setLanguage(value);
  }, []);

  const handleOrientationChange = useCallback((_, { value }) => {
    setOrientation(value);
  }, []);

  const handleFullHdOnlyChange = useCallback((_, { checked }) => {
    setFullHdOnly(checked);
  }, []);

  const handleQuickQueryClick = useCallback((value) => {
    setQuery(value);
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    const trimmedQuery = query.trim();

    setSuccessMessage(null);
    setImportError(null);

    if (!searchConfig.enabled) {
      setSearchError(t('common.onlineImageSearchDisabled'));
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchError(t('common.searchQuery'));
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const body = await api.searchBackgroundImages(
        project.id,
        {
          q: trimmedQuery,
          provider,
          language,
          orientation,
          fullHdOnly,
        },
        headers,
      );

      setItems(body.items || []);
      setHasSearched(true);
    } catch (error) {
      setItems([]);
      setHasSearched(true);
      setSearchError(getErrorMessage(error, t('common.imageSearchFailed')));
    } finally {
      setIsSearching(false);
    }
  }, [
    fullHdOnly,
    headers,
    language,
    orientation,
    project.id,
    provider,
    query,
    searchConfig.enabled,
    t,
  ]);

  const handleImport = useCallback(
    async (item, importTarget) => {
      const key = `${item.provider}:${item.id}:${importTarget}`;

      setImportingKey(key);
      setImportError(null);
      setSuccessMessage(null);

      try {
        const { item: backgroundImage } = await api.importBackgroundImage(
          project.id,
          {
            provider: item.provider,
            resultId: item.id,
            importToken: item.importToken,
            target: importTarget,
          },
          headers,
        );

        dispatch(entryActions.handleBackgroundImageCreate(backgroundImage));
        setSuccessMessage(t('common.imageImported'));
      } catch (error) {
        setImportError(getImportErrorMessage(error, t));
      } finally {
        setImportingKey(null);
      }
    },
    [dispatch, headers, project.id, t],
  );

  const hasNoResults = hasSearched && items.length === 0 && !isSearching;

  let resultsNode = null;
  if (hasNoResults) {
    resultsNode = <div className={styles.empty}>{t('common.noImagesFound')}</div>;
  } else if (items.length > 0) {
    resultsNode = (
      <div className={styles.results}>
        {items.map((item) => (
          <ResultItem
            key={`${item.provider}:${item.id}`}
            item={item}
            target={target}
            isImporting={!!importingKey && importingKey.startsWith(`${item.provider}:${item.id}:`)}
            onImport={handleImport}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {!searchConfig.enabled && (
        <Message warning size="mini" className={styles.message}>
          {t('common.onlineImageSearchDisabled')}
        </Message>
      )}
      <Form onSubmit={handleSearchSubmit}>
        <div className={styles.searchRow}>
          <Input
            fluid
            value={query}
            placeholder={t('common.searchQuery')}
            disabled={!searchConfig.enabled || isSearching}
            className={styles.searchInput}
            onChange={handleQueryChange}
          />
          <Button
            type="submit"
            icon="search"
            content={t('common.searchOnlineImages')}
            loading={isSearching}
            disabled={!searchConfig.enabled || isSearching}
            className={styles.searchButton}
          />
        </div>
        {quickQueries.length > 0 && (
          <div className={styles.quickQueries}>
            {quickQueries.map((quickQuery) => (
              <Button
                key={quickQuery}
                type="button"
                basic
                compact
                size="tiny"
                disabled={!searchConfig.enabled || isSearching}
                onClick={() => handleQuickQueryClick(quickQuery)}
              >
                {quickQuery}
              </Button>
            ))}
          </div>
        )}
        <div className={styles.filters}>
          <Dropdown
            selection
            fluid
            value={provider}
            options={providerOptions}
            disabled={!searchConfig.enabled || isSearching}
            aria-label={t('common.provider')}
            onChange={handleProviderChange}
          />
          <Dropdown
            selection
            fluid
            value={language}
            options={languageOptions}
            disabled={!searchConfig.enabled || isSearching}
            aria-label={t('common.language')}
            onChange={handleLanguageChange}
          />
          <Dropdown
            selection
            fluid
            value={orientation}
            options={orientationOptions}
            disabled={!searchConfig.enabled || isSearching}
            aria-label={t('common.orientation')}
            onChange={handleOrientationChange}
          />
        </div>
        <div className={styles.toggleRow}>
          <Checkbox
            toggle
            checked={fullHdOnly}
            disabled={!searchConfig.enabled || isSearching}
            label={t('common.fullHdOnly')}
            onChange={handleFullHdOnlyChange}
          />
          <span className={styles.minimumSize}>
            {t('common.minimumImageSize', {
              width: searchConfig.minWidth || 1920,
              height: searchConfig.minHeight || 1080,
            })}
          </span>
        </div>
      </Form>
      {!fullHdOnly && (
        <Message warning size="mini" className={styles.message}>
          {t('common.imagesBelowFullHdMayLookBad')}
        </Message>
      )}
      <Message info size="mini" className={styles.message}>
        {t('common.imagesMayRequireAttribution')}
      </Message>
      {searchError && (
        <Message negative size="mini" className={styles.message}>
          {searchError}
        </Message>
      )}
      {importError && (
        <Message negative size="mini" className={styles.message}>
          {importError}
        </Message>
      )}
      {successMessage && (
        <Message positive size="mini" className={styles.message}>
          {successMessage}
        </Message>
      )}
      {resultsNode}
    </div>
  );
});

OnlineImages.propTypes = {
  target: PropTypes.oneOf(['background', 'cover']).isRequired,
};

export default OnlineImages;
