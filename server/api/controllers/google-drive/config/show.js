/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {},

  async fn() {
    const config = await sails.helpers.googleDrive.getConfig();
    const redirectUri = `${sails.config.custom.baseUrl}/api/google-drive/callback`;
    const isConfigured = !!(
      config.enabled &&
      config.clientId &&
      config.clientSecret &&
      config.pickerApiKey &&
      config.pickerAppId
    );

    return {
      item: {
        enabled: config.enabled,
        configured: isConfigured,
        clientId: config.clientId,
        pickerApiKey: config.pickerApiKey,
        pickerAppId: config.pickerAppId,
        scopes: config.scopes,
        redirectUri,
      },
    };
  },
};
