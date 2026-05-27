/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fetchJson = require('../fetch-json');

const LOCALES_BY_LANGUAGE = {
  en: 'en-US',
  ru: 'ru-RU',
  uk: 'uk-UA',
};

const getLocale = (language, query) => {
  if (language && language !== 'auto') {
    return LOCALES_BY_LANGUAGE[language];
  }

  if (/[іїєґ]/i.test(query)) {
    return LOCALES_BY_LANGUAGE.uk;
  }

  if (/[а-яё]/i.test(query)) {
    return LOCALES_BY_LANGUAGE.ru;
  }

  if (/^[\w\s'.,-]+$/.test(query)) {
    return LOCALES_BY_LANGUAGE.en;
  }

  return undefined;
};

const normalizePhoto = (photo) => ({
  id: photo.id && photo.id.toString(),
  provider: 'pexels',
  title: photo.alt || undefined,
  previewUrl: photo.src.large2x || photo.src.large || photo.src.original,
  thumbnailUrl: photo.src.medium || photo.src.tiny,
  downloadUrl: photo.src.original,
  sourceUrl: photo.url,
  width: photo.width,
  height: photo.height,
  authorName: photo.photographer,
  authorUrl: photo.photographer_url,
  license: 'Pexels License',
  licenseUrl: 'https://www.pexels.com/license/',
  attributionText: photo.photographer
    ? `Photo by ${photo.photographer} on Pexels`
    : 'Photos provided by Pexels',
});

module.exports = {
  name: 'pexels',

  isConfigured: (config) => !!config.pexelsApiKey,

  async search({ query, language, orientation, page, perPage }) {
    const config = sails.config.custom.backgroundImageSearch;
    const url = new URL('https://api.pexels.com/v1/search');

    url.searchParams.set('query', query);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', perPage);
    url.searchParams.set('size', 'large');

    if (orientation && orientation !== 'any') {
      url.searchParams.set('orientation', orientation);
    }

    const locale = getLocale(language, query);
    if (locale) {
      url.searchParams.set('locale', locale);
    }

    const data = await fetchJson(url, {
      headers: {
        Authorization: config.pexelsApiKey,
      },
    });

    return (data.photos || []).map(normalizePhoto);
  },
};
