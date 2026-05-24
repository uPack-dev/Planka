/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    state: {
      type: 'string',
    },
  },

  sync: true,

  fn(inputs) {
    const clientId = sails.config.custom.googleDriveClientId;
    const redirectUri = sails.config.custom.googleDriveRedirectUri;
    const scopes = sails.config.custom.googleDriveScopes;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      include_granted_scopes: 'true',
    });

    if (inputs.state) {
      params.append('state', inputs.state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },
};
