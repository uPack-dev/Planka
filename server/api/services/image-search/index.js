/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/* eslint-disable no-await-in-loop, no-restricted-syntax */

const crypto = require('crypto');

const { toPublicResult, toSourceMetadata } = require('./normalize-result');
const { withValidation } = require('./validate-image-result');
const downloadRemoteImage = require('./remote-image-downloader');
const pexelsProvider = require('./providers/pexels');
const openverseProvider = require('./providers/openverse');
const wikimediaProvider = require('./providers/wikimedia');

const providerModules = {
  pexels: pexelsProvider,
  openverse: openverseProvider,
  wikimedia: wikimediaProvider,
};

const searchCache = new Map();
const importTokens = new Map();

const IMPORT_TOKEN_TTL_MS = 15 * 60 * 1000;

const getConfig = () => sails.config.custom.backgroundImageSearch;

const cleanupExpiredEntries = (map) => {
  const now = Date.now();

  map.forEach((value, key) => {
    if (value.expiresAt <= now) {
      map.delete(key);
    }
  });
};

const getProviderStatus = () => {
  const config = getConfig();

  return config.providers
    .filter((name) => providerModules[name])
    .map((name) => ({
      name,
      isAvailable: providerModules[name].isConfigured(config),
    }));
};

const getAvailableProviderNames = () =>
  getProviderStatus()
    .filter(({ isAvailable }) => isAvailable)
    .map(({ name }) => name);

const getPublicConfig = () => {
  const config = getConfig();
  const providers = getProviderStatus();
  const availableProviderNames = providers
    .filter(({ isAvailable }) => isAvailable)
    .map(({ name }) => name);

  return {
    enabled: availableProviderNames.length > 0,
    providers,
    defaultProvider: availableProviderNames.includes(config.defaultProvider)
      ? config.defaultProvider
      : availableProviderNames[0] || null,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    fullHdOnly: config.requireMinSize,
  };
};

const createImportToken = (result) => {
  cleanupExpiredEntries(importTokens);

  const token = crypto.randomBytes(32).toString('base64url');
  importTokens.set(token, {
    result,
    expiresAt: Date.now() + IMPORT_TOKEN_TTL_MS,
  });

  return token;
};

const resolveImportToken = (token) => {
  cleanupExpiredEntries(importTokens);

  const entry = importTokens.get(token);
  if (!entry) {
    const error = new Error('Image import token is invalid or expired');
    error.code = 'invalidImportToken';
    throw error;
  }

  return entry.result;
};

const buildCacheKey = (params) =>
  JSON.stringify({
    provider: params.provider,
    query: params.query,
    language: params.language,
    orientation: params.orientation,
    page: params.page,
    perPage: params.perPage,
    minWidth: params.minWidth,
    minHeight: params.minHeight,
    fullHdOnly: params.fullHdOnly,
    providers: getConfig().providers,
  });

const dedupeResults = (results) => {
  const seen = new Set();

  return results.filter((result) => {
    const keys = [
      result.downloadUrl,
      result.sourceUrl,
      result.provider && result.id && `${result.provider}:${result.id}`,
    ].filter(Boolean);

    if (keys.some((key) => seen.has(key))) {
      return false;
    }

    keys.forEach((key) => seen.add(key));
    return true;
  });
};

const interleaveResultSets = (resultSets) => {
  const results = [];
  const maxLength = Math.max(...resultSets.map((resultSet) => resultSet.length), 0);

  for (let index = 0; index < maxLength; index += 1) {
    resultSets.forEach((resultSet) => {
      if (resultSet[index]) {
        results.push(resultSet[index]);
      }
    });
  }

  return results;
};

const searchProvider = async (providerName, params) => {
  const config = getConfig();
  const provider = providerModules[providerName];

  if (!provider || !provider.isConfigured(config)) {
    return [];
  }

  const rawResults = await provider.search(params);

  return rawResults
    .map((result) =>
      withValidation(result, {
        minWidth: params.minWidth,
        minHeight: params.minHeight,
        requireMinSize: params.fullHdOnly && config.requireMinSize,
      }),
    )
    .filter(Boolean);
};

const search = async (params) => {
  const config = getConfig();
  const cacheKey = buildCacheKey(params);
  const cachedEntry = searchCache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return {
      ...cachedEntry.body,
      items: cachedEntry.body.items.map((result) =>
        toPublicResult(result, createImportToken(result)),
      ),
    };
  }

  cleanupExpiredEntries(searchCache);

  const availableProviderNames = getAvailableProviderNames();
  const providerNames =
    params.provider === 'auto'
      ? availableProviderNames
      : availableProviderNames.filter((providerName) => providerName === params.provider);

  if (providerNames.length === 0) {
    const error = new Error('Online image search is disabled or provider is not configured');
    error.code = 'providerNotConfigured';
    throw error;
  }

  const resultSets = [];
  const providerErrors = [];

  for (const providerName of providerNames) {
    try {
      resultSets.push(await searchProvider(providerName, params));
    } catch (error) {
      providerErrors.push({
        provider: providerName,
        message: error.message,
      });

      sails.log.warn(`Image search provider "${providerName}" failed: ${error.message}`);
    }
  }

  const results =
    params.provider === 'auto'
      ? interleaveResultSets(resultSets)
      : resultSets.reduce((combinedResults, resultSet) => [...combinedResults, ...resultSet], []);

  if (results.length === 0 && providerErrors.length === providerNames.length) {
    const error = new Error('Image search failed');
    error.code = 'imageSearchFailed';
    error.providerErrors = providerErrors;
    throw error;
  }

  const body = {
    items: dedupeResults(results).slice(0, params.perPage),
    included: {
      providerErrors,
      config: getPublicConfig(),
    },
  };

  searchCache.set(cacheKey, {
    body,
    expiresAt: Date.now() + config.cacheTtlSeconds * 1000,
  });

  return {
    ...body,
    items: body.items.map((result) => toPublicResult(result, createImportToken(result))),
  };
};

const download = (result) => {
  const config = getConfig();

  return downloadRemoteImage(result.downloadUrl, {
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    requireMinSize: config.requireMinSize,
    timeoutMs: config.timeoutMs,
    maxDownloadBytes: config.maxDownloadBytes,
  });
};

module.exports = {
  download,
  getPublicConfig,
  resolveImportToken,
  search,
  toSourceMetadata,
};
