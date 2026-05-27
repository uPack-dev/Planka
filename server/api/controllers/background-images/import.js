/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const imageSearch = require('../../services/image-search');

const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  IMPORT_TOKEN_REQUIRED: {
    importTokenRequired: 'Import token is required',
  },
  IMPORT_TOKEN_INVALID: {
    importTokenInvalid: 'Import token is invalid or expired',
  },
  REMOTE_IMAGE_DOWNLOAD_FAILED: {
    remoteImageDownloadFailed: 'Remote image download failed',
  },
  IMAGE_TOO_SMALL: {
    imageTooSmall: 'Image is smaller than the minimum required size',
  },
  FILE_IS_NOT_IMAGE: {
    fileIsNotImage: 'File is not image',
  },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    provider: {
      type: 'string',
      isIn: ['pexels', 'openverse', 'wikimedia', 'unsplash'],
    },
    resultId: {
      type: 'string',
      maxLength: 256,
    },
    importToken: {
      type: 'string',
      maxLength: 512,
      required: true,
    },
    target: {
      type: 'string',
      isIn: ['background', 'cover', 'both'],
      defaultsTo: 'background',
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
    importTokenRequired: {
      responseType: 'unprocessableEntity',
    },
    importTokenInvalid: {
      responseType: 'unprocessableEntity',
    },
    remoteImageDownloadFailed: {
      responseType: 'unprocessableEntity',
    },
    imageTooSmall: {
      responseType: 'unprocessableEntity',
    },
    fileIsNotImage: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    if (!inputs.importToken) {
      throw Errors.IMPORT_TOKEN_REQUIRED;
    }

    let result;
    try {
      result = imageSearch.resolveImportToken(inputs.importToken);
    } catch (error) {
      sails.log.verbose(error.message);
      throw Errors.IMPORT_TOKEN_INVALID;
    }

    if (
      (inputs.provider && inputs.provider !== result.provider) ||
      (inputs.resultId && inputs.resultId !== result.id)
    ) {
      throw Errors.IMPORT_TOKEN_INVALID;
    }

    let file;
    try {
      file = await imageSearch.download(result);
    } catch (error) {
      if (error.code === 'imageTooSmall') {
        throw Errors.IMAGE_TOO_SMALL;
      }

      sails.log.warn(error.stack || error.message);
      throw Errors.REMOTE_IMAGE_DOWNLOAD_FAILED;
    }

    const values = await sails.helpers.backgroundImages
      .processUploadedFile(file)
      .intercept('fileIsNotImage', () => Errors.FILE_IS_NOT_IMAGE);

    const backgroundImage = await sails.helpers.backgroundImages.createOne.with({
      values: {
        ...values,
        project,
        target: inputs.target,
        source: imageSearch.toSourceMetadata(result, file),
      },
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: sails.helpers.backgroundImages.presentOne(backgroundImage),
    };
  },
};
