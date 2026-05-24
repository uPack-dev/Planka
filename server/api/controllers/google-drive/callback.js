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
    state: {
      type: 'string',
    },
  },

  exits: {
    tokenExchangeFailed: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    if (!sails.config.custom.googleDriveIntegrationEnabled) {
      return this.res.forbidden();
    }

    let userId = null;

    if (inputs.state) {
      try {
        const stateData = JSON.parse(Buffer.from(inputs.state, 'base64url').toString('utf8'));
        userId = stateData.userId;
      } catch (error) {
        // Invalid state
      }
    }

    if (!userId) {
      return this.res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Google Drive Connection Failed</title></head>
        <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'google-drive-error', error: 'Not authenticated' }, '*');
            window.close();
          } else {
            document.body.innerText = 'Authentication failed. Please try again.';
          }
        </script>
        </body>
        </html>
      `);
    }

    const tokens = await sails.helpers.googleDrive
      .exchangeCode(inputs.code)
      .intercept('tokenExchangeFailed', () => 'tokenExchangeFailed');

    const encrypted = sails.helpers.utils.encrypt.with({
      value: tokens.refreshToken,
      key: sails.config.custom.googleDriveTokenEncryptionKey,
    });

    await GoogleDriveCredential.qm.deleteOneByUserId(userId);

    await GoogleDriveCredential.qm.createOne({
      userId,
      refreshTokenEncrypted: encrypted,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
      expiryDate: tokens.expiryDate,
    });

    return this.res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Google Drive Connected</title></head>
      <body>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'google-drive-connected' }, '*');
          window.close();
        } else {
          document.body.innerText = 'Google Drive account connected. You can close this window.';
        }
      </script>
      </body>
      </html>
    `);
  },
};
