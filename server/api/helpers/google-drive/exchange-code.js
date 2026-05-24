/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    code: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    tokenExchangeFailed: {},
  },

  async fn(inputs) {
    const clientId = sails.config.custom.googleDriveClientId;
    const clientSecret = sails.config.custom.googleDriveClientSecret;
    const redirectUri = sails.config.custom.googleDriveRedirectUri;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: inputs.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw 'tokenExchangeFailed';
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      tokenType: data.token_type,
      expiryDate:
        data.expires_in != null
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
    };
  },
};
