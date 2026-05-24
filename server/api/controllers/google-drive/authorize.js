/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  async fn() {
    const config = await sails.helpers.googleDrive.getConfig();
    if (!config.enabled) {
      return this.res.forbidden();
    }

    let userId = null;
    const { accessToken } = this.req.cookies;

    if (accessToken) {
      try {
        const payload = sails.helpers.utils.verifyJwtToken(accessToken);
        userId = payload.subject;
      } catch (error) {
        // Not authenticated
      }
    }

    if (!userId) {
      return this.res.forbidden();
    }

    const state = JSON.stringify({
      userId,
      nonce: crypto.randomBytes(16).toString('hex'),
      issuedAt: Date.now(),
      purpose: 'googleDriveOAuth',
    });

    const signature = crypto
      .createHmac(
        'sha256',
        sails.config.session.secret || process.env.SECRET_KEY || 'default-secret',
      )
      .update(state)
      .digest('hex');

    const statePayload = JSON.stringify({ state, signature });
    const stateEncoded = Buffer.from(statePayload).toString('base64url');

    const url = await sails.helpers.googleDrive.getAuthUrl(stateEncoded);

    return this.res.redirect(url);
  },
};
