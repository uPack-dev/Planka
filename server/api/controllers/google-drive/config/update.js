/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    enabled: {
      type: 'boolean',
    },
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
    const { currentUser } = this.req;

    await sails.helpers.googleDrive.updateConfig.with({
      ...inputs,
      actorUser: currentUser,
      request: this.req,
    });

    const config = await sails.helpers.googleDrive.getConfig();
    const hasClientId = !!config.clientId;
    const hasClientSecret = !!config.clientSecret;
    const hasPickerApiKey = !!config.pickerApiKey;
    const hasPickerAppId = !!config.pickerAppId;

    return {
      item: {
        enabled: config.enabled,
        configured: !!(
          config.enabled &&
          hasClientId &&
          hasClientSecret &&
          hasPickerApiKey &&
          hasPickerAppId
        ),
        hasClientId,
        hasClientSecret,
        hasPickerApiKey,
        hasPickerAppId,
        scopes: config.scopes,
      },
    };
  },
};
