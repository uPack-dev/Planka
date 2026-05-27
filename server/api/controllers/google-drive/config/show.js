/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {},

  async fn() {
    const config = await sails.helpers.googleDrive.getConfig();
    const redirectUri = `${sails.config.custom.baseUrl}/api/google-drive/callback`;
    const hasClientId = !!config.clientId;
    const hasClientSecret = !!config.clientSecret;
    const hasPickerApiKey = !!config.pickerApiKey;
    const hasPickerAppId = !!config.pickerAppId;
    const isConfigured = !!(
      config.enabled &&
      hasClientId &&
      hasClientSecret &&
      hasPickerApiKey &&
      hasPickerAppId
    );

    return {
      item: {
        enabled: config.enabled,
        configured: isConfigured,
        hasClientId,
        hasClientSecret,
        hasPickerApiKey,
        hasPickerAppId,
        scopes: config.scopes,
        redirectUri,
      },
    };
  },
};
