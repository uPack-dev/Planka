/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    accessToken: {
      type: 'string',
      required: true,
    },
    fileId: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    fileNotFound: {},
    driveError: {},
  },

  async fn(inputs) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${inputs.fileId}?fields=id,name,mimeType,webViewLink,thumbnailLink,iconLink,capabilities/canShare`,
      {
        headers: {
          Authorization: `Bearer ${inputs.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw 'fileNotFound';
      }

      throw 'driveError';
    }

    return response.json();
  },
};
