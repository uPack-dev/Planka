/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

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
    const config = await sails.helpers.googleDrive.getConfig();
    if (!config.enabled) {
      return this.res.forbidden();
    }

    let userId = null;

    if (!inputs.state) {
      return this.res.forbidden();
    }

    try {
      const { state, signature } = JSON.parse(
        Buffer.from(inputs.state, 'base64url').toString('utf8'),
      );
      const key = sails.helpers.googleDrive.getEncryptionKey();
      const expectedSignature = crypto.createHmac('sha256', key).update(state).digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid state signature');
      }

      const stateData = JSON.parse(state);
      if (stateData.purpose !== 'googleDriveOAuth' || Date.now() - stateData.issuedAt > 300000) {
        throw new Error('Invalid state');
      }
      userId = stateData.userId;
    } catch (error) {
      sails.log.error('OAuth callback state error:', error);
    }

    if (!userId) {
      return this.res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Google Drive Connection Failed</title></head>
        <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'google-drive-error', error: 'Not authenticated' }, '${sails.config.custom.baseUrl}');
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
      key: sails.helpers.googleDrive.getEncryptionKey(),
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
          window.opener.postMessage({ type: 'google-drive-connected' }, '${sails.config.custom.baseUrl}');
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
