/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const imageSearch = require('../../services/image-search');

module.exports = {
  sync: false,

  inputs: {
    internalConfig: {
      type: 'ref',
      required: true,
    },
    oidc: {
      type: 'ref',
    },
    user: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const data = {
      oidc: inputs.oidc,
      termsLanguages: sails.hooks.terms.getLanguages(),
      version: sails.config.custom.version,
    };

    const googleDriveConfig = await sails.helpers.googleDrive.getConfig();

    Object.assign(data, {
      backgroundImageSearch: imageSearch.getPublicConfig(),
      googleDrive: {
        enabled: googleDriveConfig.enabled,
        configured: !!(
          googleDriveConfig.enabled &&
          googleDriveConfig.clientId &&
          googleDriveConfig.clientSecret &&
          googleDriveConfig.pickerApiKey &&
          googleDriveConfig.pickerAppId
        ),
        clientId: googleDriveConfig.clientId,
        pickerApiKey: googleDriveConfig.pickerApiKey,
        pickerAppId: googleDriveConfig.pickerAppId,
        scopes: googleDriveConfig.scopes,
        redirectUri: `${sails.config.custom.baseUrl}/api/google-drive/callback`,
      },
    });

    if (inputs.user && inputs.user.role === User.Roles.ADMIN) {
      Object.assign(data, {
        activeUsersLimit: inputs.internalConfig.activeUsersLimit,
        customerPanelUrl: sails.config.custom.customerPanelUrl,
      });
    }

    if (sails.config.custom.demoMode) {
      data.isDemoMode = true;
    }

    return data;
  },
};
