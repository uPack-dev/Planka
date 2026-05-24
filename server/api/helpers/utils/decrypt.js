/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

module.exports = {
  inputs: {
    encryptedValue: {
      type: 'string',
      required: true,
    },
    key: {
      type: 'string',
      required: true,
    },
  },

  sync: true,

  fn(inputs) {
    const parts = inputs.encryptedValue.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const authTag = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(inputs.key, 'hex'), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  },
};
