/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    clientId: {
      type: 'string',
      allowNull: true,
    },
    clientSecret: {
      type: 'string',
      allowNull: true,
    },
    pickerApiKey: {
      type: 'string',
      allowNull: true,
    },
    pickerAppId: {
      type: 'string',
      allowNull: true,
    },
    scopes: {
      type: 'string',
      allowNull: true,
    },
  },

  async fn(inputs) {
    const savedConfig = await sails.helpers.googleDrive.getConfig();
    const clientId = inputs.clientId || savedConfig.clientId;
    const clientSecret = inputs.clientSecret || savedConfig.clientSecret;
    const pickerApiKey = inputs.pickerApiKey || savedConfig.pickerApiKey;
    const pickerAppId = inputs.pickerAppId || savedConfig.pickerAppId;
    const scopes =
      inputs.scopes || savedConfig.scopes || 'https://www.googleapis.com/auth/drive.file';
    const redirectUri = `${sails.config.custom.baseUrl}/api/google-drive/callback`;

    const missingFields = [];

    if (!clientId) {
      missingFields.push('clientId');
    }
    if (!clientSecret) {
      missingFields.push('clientSecret');
    }
    if (!pickerApiKey) {
      missingFields.push('pickerApiKey');
    }
    if (!pickerAppId) {
      missingFields.push('pickerAppId');
    }
    if (!sails.config.custom.baseUrl) {
      missingFields.push('baseUrl');
    }

    return {
      item: {
        success: missingFields.length === 0,
        missingFields,
        redirectUri,
        scopes,
        note:
          missingFields.length === 0
            ? 'Configuration fields are present. Complete OAuth from the attachment picker to verify Google authorization.'
            : 'Configuration is incomplete.',
      },
    };
  },
};
