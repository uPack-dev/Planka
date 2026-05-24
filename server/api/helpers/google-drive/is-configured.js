/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: false,

  inputs: {},

  async fn() {
    const config = await sails.helpers.googleDrive.getConfig();
    return !!(
      config.enabled &&
      config.clientId &&
      config.clientSecret &&
      config.pickerApiKey &&
      config.pickerAppId
    );
  },
};
