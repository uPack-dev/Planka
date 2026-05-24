/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  exits: {
    credentialNotFound: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn() {
    const { currentUser } = this.req;

    if (!sails.config.custom.googleDriveIntegrationEnabled) {
      return this.res.forbidden();
    }

    const accessToken = await sails.helpers.googleDrive
      .getAccessTokenForUser(currentUser.id)
      .intercept('credentialNotFound', () => 'credentialNotFound');

    return {
      accessToken,
      apiKey: sails.config.custom.googleDrivePickerApiKey,
      appId: sails.config.custom.googleDrivePickerAppId,
      clientId: sails.config.custom.googleDriveClientId,
    };
  },
};
