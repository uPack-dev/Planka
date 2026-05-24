/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    clientId: {
      type: 'string',
      required: true,
    },
    clientSecret: {
      type: 'string',
      allowNull: true,
    },
    pickerApiKey: {
      type: 'string',
      required: true,
    },
    pickerAppId: {
      type: 'string',
      required: true,
    },
    scopes: {
      type: 'string',
    },
  },

  async fn(inputs) {
    const scopes = inputs.scopes || 'https://www.googleapis.com/auth/drive.file';
    const redirectUri = `${sails.config.custom.baseUrl}/api/google-drive/callback`;

    const results = {};

    try {
      const oauthResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: inputs.clientId,
          client_secret: inputs.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'client_credentials',
          scope: scopes,
        }),
      });

      if (oauthResponse.ok) {
        results.oauth = { success: true };
      } else {
        const errorData = await oauthResponse.json().catch(() => ({}));
        results.oauth = {
          success: false,
          error: errorData.error_description || errorData.error || `HTTP ${oauthResponse.status}`,
        };
      }
    } catch (error) {
      results.oauth = { success: false, error: error.message };
    }

    try {
      results.redirectUri = redirectUri;
      results.redirectUriValid = !!sails.config.custom.baseUrl;
    } catch (error) {
      results.redirectUri = null;
      results.redirectUriValid = false;
    }

    return {
      item: results,
    };
  },
};
