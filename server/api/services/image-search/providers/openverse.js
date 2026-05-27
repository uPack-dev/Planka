/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fetchJson = require('../fetch-json');

const API_BASE_URL = 'https://api.openverse.org/v1';

let tokenCache = null;

const getAccessToken = async () => {
  const { openverseClientId, openverseClientSecret } = sails.config.custom.backgroundImageSearch;

  if (!openverseClientId || !openverseClientSecret) {
    return null;
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken;
  }

  try {
    const data = await fetchJson(`${API_BASE_URL}/auth_tokens/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: openverseClientId,
        client_secret: openverseClientSecret,
        grant_type: 'client_credentials',
      }),
    });

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + Math.max((data.expires_in || 300) - 30, 60) * 1000,
    };

    return tokenCache.accessToken;
  } catch (error) {
    sails.log.warn(`Openverse authentication failed, using anonymous access: ${error.message}`);
    return null;
  }
};

const getLicense = (image) => {
  if (!image.license) {
    return undefined;
  }

  return image.license_version
    ? `${image.license.toUpperCase()} ${image.license_version}`
    : image.license.toUpperCase();
};

const normalizeImage = (image) => {
  const license = getLicense(image);

  return {
    id: image.id,
    provider: 'openverse',
    title: image.title || undefined,
    previewUrl: image.url || image.thumbnail,
    thumbnailUrl: image.thumbnail && image.thumbnail !== image.url ? image.thumbnail : undefined,
    downloadUrl: image.url,
    sourceUrl: image.foreign_landing_url || image.url,
    width: image.width,
    height: image.height,
    mimeType: image.mimetype || undefined,
    authorName: image.creator || undefined,
    authorUrl: image.creator_url || undefined,
    license,
    licenseUrl: image.license_url || undefined,
    attributionText: [image.title, image.creator && `by ${image.creator}`, license]
      .filter(Boolean)
      .join(' '),
  };
};

module.exports = {
  name: 'openverse',

  isConfigured: () => true,

  async search({ query, orientation, page, perPage }) {
    const url = new URL(`${API_BASE_URL}/images/`);
    url.searchParams.set('q', query);
    url.searchParams.set('page', page);
    url.searchParams.set('page_size', perPage);
    url.searchParams.set('mature', 'false');

    if (orientation && orientation !== 'any') {
      url.searchParams.set(
        'aspect_ratio',
        {
          landscape: 'wide',
          portrait: 'tall',
          square: 'square',
        }[orientation],
      );
    }

    const accessToken = await getAccessToken();
    const data = await fetchJson(url, {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    });

    return (data.results || []).map(normalizeImage);
  },
};
