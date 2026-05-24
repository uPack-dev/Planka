/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  sync: false,

  inputs: {},

  async fn() {
    const config = await Config.qm.getOneMain();

    const enabled =
      config.googleDriveEnabled !== undefined
        ? config.googleDriveEnabled
        : process.env.GOOGLE_DRIVE_INTEGRATION_ENABLED === 'true';
    const clientId = config.googleDriveClientId || process.env.GOOGLE_DRIVE_CLIENT_ID;
    const pickerApiKey = config.googleDrivePickerApiKey || process.env.GOOGLE_DRIVE_PICKER_API_KEY;
    const pickerAppId = config.googleDrivePickerAppId || process.env.GOOGLE_DRIVE_PICKER_APP_ID;
    const scopes =
      config.googleDriveScopes ||
      process.env.GOOGLE_DRIVE_SCOPES ||
      'https://www.googleapis.com/auth/drive.file';

    let clientSecret = null;
    if (config.googleDriveClientSecretEncrypted) {
      try {
        const secret = sails.config.session.secret || process.env.SECRET_KEY || 'default-secret';
        const key =
          process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY &&
          process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY.length === 64
            ? process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY
            : crypto.createHash('sha256').update(secret).digest('hex');

        clientSecret = sails.helpers.utils.decrypt(config.googleDriveClientSecretEncrypted, key);
      } catch (err) {
        sails.log.error('Failed to decrypt Google Drive Client Secret:', err);
      }
    } else if (process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
      clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    }

    return {
      enabled,
      clientId,
      clientSecret,
      pickerApiKey,
      pickerAppId,
      scopes,
    };
  },
};
