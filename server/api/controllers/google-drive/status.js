/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    if (!sails.config.custom.googleDriveIntegrationEnabled) {
      return {
        connected: false,
      };
    }

    const credential = await GoogleDriveCredential.qm.getOneByUserId(currentUser.id);

    return {
      connected: !!credential,
    };
  },
};
