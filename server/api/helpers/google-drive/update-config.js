/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: false,

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
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const updateValues = {};
    if (inputs.enabled !== undefined) {
      updateValues.googleDriveEnabled = inputs.enabled;
    }
    if (inputs.clientId !== undefined) {
      updateValues.googleDriveClientId = inputs.clientId;
    }
    if (inputs.pickerApiKey !== undefined) {
      updateValues.googleDrivePickerApiKey = inputs.pickerApiKey;
    }
    if (inputs.pickerAppId !== undefined) {
      updateValues.googleDrivePickerAppId = inputs.pickerAppId;
    }
    if (inputs.scopes !== undefined) {
      updateValues.googleDriveScopes = inputs.scopes;
    }

    if (inputs.clientSecret) {
      const key = sails.helpers.googleDrive.getEncryptionKey();
      updateValues.googleDriveClientSecretEncrypted = sails.helpers.utils.encrypt(
        inputs.clientSecret,
        key,
      );
    }

    const config = await sails.helpers.config.updateMain.with({
      values: updateValues,
      actorUser: inputs.actorUser,
      request: inputs.request,
    });

    return config;
  },
};