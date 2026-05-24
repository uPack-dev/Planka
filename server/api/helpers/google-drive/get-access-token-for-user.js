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
    const credential = await GoogleDriveCredential.qm.getOneByUserId(inputs.userId);

    if (!credential) {
      throw 'credentialNotFound';
    }

    const refreshToken = sails.helpers.utils.decrypt(
      credential.refreshTokenEncrypted,
      sails.helpers.googleDrive.getEncryptionKey(),
    );

    const config = await sails.helpers.googleDrive.getConfig();
    const { clientId } = config;
    const { clientSecret } = config;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw 'credentialNotFound';
    }

    const data = await response.json();

    if (data.expires_in != null) {
      await GoogleDriveCredential.qm.updateOneByUserId(inputs.userId, {
        expiryDate: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      });
    }

    return data.access_token;
  },
};