/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fetchJson = require('../fetch-json');
const { isRasterMimeType } = require('../validate-image-result');

const API_URL = 'https://commons.wikimedia.org/w/api.php';

const cleanText = (value) => {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const getExtMetadataValue = (extmetadata, key) =>
  cleanText(extmetadata && extmetadata[key] && extmetadata[key].value);

const normalizePage = (page) => {
  const imageInfo = page.imageinfo && page.imageinfo[0];

  if (!imageInfo || !isRasterMimeType(imageInfo.mime)) {
    return null;
  }

  const license =
    getExtMetadataValue(imageInfo.extmetadata, 'LicenseShortName') ||
    getExtMetadataValue(imageInfo.extmetadata, 'UsageTerms');

  const authorName =
    getExtMetadataValue(imageInfo.extmetadata, 'Artist') ||
    getExtMetadataValue(imageInfo.extmetadata, 'Credit') ||
    imageInfo.user;

  return {
    id: page.pageid && page.pageid.toString(),
    provider: 'wikimedia',
    title: cleanText((page.title || '').replace(/^File:/, '')) || undefined,
    previewUrl: imageInfo.thumburl || imageInfo.url,
    thumbnailUrl: imageInfo.thumburl || imageInfo.url,
    downloadUrl: imageInfo.url,
    sourceUrl: imageInfo.descriptionurl,
    width: imageInfo.width,
    height: imageInfo.height,
    mimeType: imageInfo.mime,
    authorName,
    authorUrl: getExtMetadataValue(imageInfo.extmetadata, 'ArtistUrl'),
    license,
    licenseUrl: getExtMetadataValue(imageInfo.extmetadata, 'LicenseUrl'),
    attributionText: [authorName && `By ${authorName}`, license, 'via Wikimedia Commons']
      .filter(Boolean)
      .join(' '),
  };
};

module.exports = {
  name: 'wikimedia',

  isConfigured: () => true,

  async search({ query, page, perPage }) {
    const url = new URL(API_URL);
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', query);
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrlimit', perPage);
    url.searchParams.set('gsroffset', (page - 1) * perPage);
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size|dimensions|mime|extmetadata|user');
    url.searchParams.set('iiurlwidth', '640');
    url.searchParams.set('iilimit', '1');

    const data = await fetchJson(url, {
      headers: {
        'Api-User-Agent': `PLANKA/${sails.config.custom.version} (${sails.config.custom.baseUrl})`,
      },
    });

    return Object.values((data.query && data.query.pages) || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map(normalizePage)
      .filter(Boolean);
  },
};
