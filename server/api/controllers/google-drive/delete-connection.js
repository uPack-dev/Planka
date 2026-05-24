/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    if (!sails.config.custom.googleDriveIntegrationEnabled) {
      return this.res.forbidden();
    }

    await GoogleDriveCredential.qm.deleteOneByUserId(currentUser.id);

    return {
      item: null,
    };
  },
};
