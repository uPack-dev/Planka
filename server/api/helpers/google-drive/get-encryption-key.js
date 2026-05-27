/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  sync: true,

  inputs: {},

  fn() {
    if (
      process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY &&
      process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY.length === 64
    ) {
      return process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY;
    }

    const secret = sails.config.session.secret || process.env.SECRET_KEY;

    if (!secret || secret === 'default-secret') {
      throw new Error('SECRET_KEY is required to encrypt Google Drive credentials');
    }

    return crypto.createHash('sha256').update(secret).digest('hex');
  },
};
