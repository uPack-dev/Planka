/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    userId: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    credentialNotFound: {},
  },

  async fn(inputs) {
    const accessToken = await sails.helpers.googleDrive
      .getAccessTokenForUser(inputs.userId)
      .intercept('credentialNotFound', () => 'credentialNotFound');

    return {
      accessToken,
    };
  },
};
