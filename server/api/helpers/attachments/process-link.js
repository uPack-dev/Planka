/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { URL } = require('url');

module.exports = {
  inputs: {
    url: {
      type: 'string',
      required: true,
    },
    provider: {
      type: 'string',
    },
    providerData: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { hostname } = new URL(inputs.url);

    if (inputs.provider === 'googleDrive') {
      return {
        provider: 'googleDrive',
        hostname,
        url: inputs.url,
        webViewLink: inputs.providerData.webViewLink || inputs.url,
        embedUrl: inputs.providerData.embedUrl || null,
        fileId: inputs.providerData.fileId,
        resourceKey: inputs.providerData.resourceKey || null,
        mimeType: inputs.providerData.mimeType || null,
        iconUrl: inputs.providerData.iconUrl || null,
        thumbnailUrl: inputs.providerData.thumbnailUrl || null,
        permissionId: inputs.providerData.permissionId,
        permissionCreatedByPlanka: inputs.providerData.permissionCreatedByPlanka,
        originalPermissionExisted: inputs.providerData.originalPermissionExisted,
      };
    }

    if (!sails.helpers.utils.isPreloadedFaviconExists(hostname)) {
      await sails.helpers.utils.downloadFavicon(inputs.url);
    }

    return {
      hostname,
      url: inputs.url,
    };
  },
};
