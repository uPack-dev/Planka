/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    userId: {
      type: 'string',
      required: true,
    },
    fileId: {
      type: 'string',
      required: true,
    },
    resourceKey: {
      type: 'string',
      allowNull: true,
    },
  },

  exits: {
    credentialNotFound: {},
    cannotShare: {},
    driveError: {},
  },

  async fn(inputs) {
    const accessToken = await sails.helpers.googleDrive
      .getAccessTokenForUser(inputs.userId)
      .intercept('credentialNotFound', () => 'credentialNotFound');

    const file = await sails.helpers.googleDrive.getFile
      .with({
        accessToken,
        fileId: inputs.fileId,
        resourceKey: inputs.resourceKey,
      })
      .intercept('fileNotFound', () => 'driveError')
      .intercept('driveError', () => 'driveError');

    if (!file.ownedByMe || !file.capabilities || !file.capabilities.canShare) {
      throw 'cannotShare';
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (inputs.resourceKey) {
      headers['X-Goog-Drive-Resource-Keys'] = `${inputs.fileId}=${inputs.resourceKey}`;
    }

    const permResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${inputs.fileId}/permissions?fields=permissions(id,type,role,allowFileDiscovery)`,
      {
        headers,
      },
    );

    if (!permResponse.ok) {
      throw 'driveError';
    }

    const permData = await permResponse.json();
    const permissions = permData.permissions || [];

    const existingAnyoneReader = permissions.find(
      (p) => p.type === 'anyone' && p.role === 'reader',
    );

    if (existingAnyoneReader) {
      return {
        permissionId: existingAnyoneReader.id,
        permissionCreatedByPlanka: false,
        originalPermissionExisted: true,
      };
    }

    const createHeaders = {
      ...headers,
      'Content-Type': 'application/json',
    };

    const createResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${inputs.fileId}/permissions?sendNotificationEmail=false`,
      {
        method: 'POST',
        headers: createHeaders,
        body: JSON.stringify({
          type: 'anyone',
          role: 'reader',
          allowFileDiscovery: false,
        }),
      },
    );

    if (!createResponse.ok) {
      throw 'driveError';
    }

    const created = await createResponse.json();

    return {
      permissionId: created.id,
      permissionCreatedByPlanka: true,
      originalPermissionExisted: false,
    };
  },
};