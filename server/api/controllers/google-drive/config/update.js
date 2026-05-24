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

    return {
      item: {
        enabled: inputs.enabled,
        clientId: inputs.clientId,
        pickerApiKey: inputs.pickerApiKey,
        pickerAppId: inputs.pickerAppId,
        scopes: inputs.scopes,
      },
    };
  },
};
