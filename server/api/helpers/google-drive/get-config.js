/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: false,

  inputs: {},

  async fn() {
    const config = await Config.qm.getOneMain();

    const enabled = config.googleDriveEnabled !== undefined ? config.googleDriveEnabled : false;
    const clientId = config.googleDriveClientId;
    const pickerApiKey = config.googleDrivePickerApiKey;
    const pickerAppId = config.googleDrivePickerAppId;
    const scopes = config.googleDriveScopes || 'https://www.googleapis.com/auth/drive.file';

    let clientSecret = null;
    if (config.googleDriveClientSecretEncrypted) {
      try {
        const key = sails.helpers.googleDrive.getEncryptionKey();
        clientSecret = sails.helpers.utils.decrypt(config.googleDriveClientSecretEncrypted, key);
      } catch (err) {
        sails.log.error('Failed to decrypt Google Drive Client Secret:', err);
      }
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