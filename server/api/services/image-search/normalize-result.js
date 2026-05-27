/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const compactObject = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

const toSourceMetadata = (result, downloadedImage) =>
  compactObject({
    provider: result.provider,
    providerImageId: result.id,
    sourceUrl: result.sourceUrl,
    authorName: result.authorName,
    authorUrl: result.authorUrl,
    license: result.license,
    licenseUrl: result.licenseUrl,
    originalWidth: result.width || downloadedImage.width,
    originalHeight: result.height || downloadedImage.height,
    mimeType: downloadedImage.mimeType || result.mimeType,
    importedAt: new Date().toISOString(),
  });

const toPublicResult = (result, importToken) =>
  compactObject({
    id: result.id,
    provider: result.provider,
    title: result.title,
    previewUrl: result.previewUrl,
    thumbnailUrl: result.thumbnailUrl,
    importToken,
    sourceUrl: result.sourceUrl,
    width: result.width,
    height: result.height,
    mimeType: result.mimeType,
    authorName: result.authorName,
    authorUrl: result.authorUrl,
    license: result.license,
    licenseUrl: result.licenseUrl,
    attributionText: result.attributionText,
    isFullHd: result.isFullHd,
  });

module.exports = {
  toPublicResult,
  toSourceMetadata,
};
