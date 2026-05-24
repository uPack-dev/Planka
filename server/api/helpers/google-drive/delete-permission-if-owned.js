/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    attachment: {
      type: 'ref',
      required: true,
    },
    userId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const { attachment } = inputs;

    const isGoogleDrive =
      attachment.type === 'link' && attachment.data && attachment.data.provider === 'googleDrive';

    if (!isGoogleDrive) {
      return false;
    }

    if (!attachment.data.permissionCreatedByPlanka) {
      return false;
    }

    if (!attachment.data.permissionId || !attachment.data.fileId) {
      return false;
    }

    const result = await sails.sendNativeQuery(
      `SELECT id FROM attachment WHERE id != $1 AND type = 'link' AND data->>'provider' = 'googleDrive' AND data->>'fileId' = $2 AND data->>'permissionId' = $3 AND CAST(data->>'permissionCreatedByPlanka' AS boolean) = true`,
      [attachment.id, attachment.data.fileId, attachment.data.permissionId],
    );

    if (result.rows.length > 0) {
      return false;
    }

    let accessToken;
    try {
      accessToken = await sails.helpers.googleDrive.getAccessTokenForUser(inputs.userId);
    } catch (error) {
      sails.log.warn(
        `Could not get access token for Google Drive permission cleanup: ${error.message || error}`,
      );
      return false;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${attachment.data.fileId}/permissions/${attachment.data.permissionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        sails.log.warn(
          `Failed to delete Google Drive permission: ${response.status} ${response.statusText}`,
        );
      }

      return true;
    } catch (error) {
      sails.log.warn(`Error deleting Google Drive permission: ${error.message || error}`);
      return false;
    }
  },
};
