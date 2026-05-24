/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  fn() {
    if (!sails.config.custom.googleDriveIntegrationEnabled) {
      return this.res.forbidden();
    }

    let userId = null;
    const { accessToken } = this.req.cookies;

    if (accessToken) {
      try {
        const payload = sails.helpers.utils.verifyJwtToken(accessToken);
        userId = payload.subject;
      } catch (error) {
        // Not authenticated — will redirect anyway, callback will fail
      }
    }

    const state = JSON.stringify({
      userId,
      nonce: crypto.randomBytes(16).toString('hex'),
    });

    const stateEncoded = Buffer.from(state).toString('base64url');

    const url = sails.helpers.googleDrive.getAuthUrl(stateEncoded);

    return this.res.redirect(url);
  },
};
