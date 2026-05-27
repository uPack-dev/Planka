/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const RASTER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const normalizeInteger = (value) => {
  const number = parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const isRasterMimeType = (mimeType) => !mimeType || RASTER_MIME_TYPES.has(mimeType);

const withValidation = (result, { minWidth, minHeight, requireMinSize }) => {
  const width = normalizeInteger(result.width);
  const height = normalizeInteger(result.height);

  if (!isRasterMimeType(result.mimeType)) {
    return null;
  }

  const isFullHd = !!width && !!height && width >= minWidth && height >= minHeight;

  if (requireMinSize && !isFullHd) {
    return null;
  }

  return {
    ...result,
    width,
    height,
    isFullHd,
  };
};

module.exports = {
  RASTER_MIME_TYPES,
  isRasterMimeType,
  withValidation,
};
