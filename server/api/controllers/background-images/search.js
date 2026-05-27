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
  QUERY_TOO_SHORT: {
    queryTooShort: 'Search query is too short',
  },
  PROVIDER_NOT_CONFIGURED: {
    providerNotConfigured: 'Provider is not configured',
  },
  IMAGE_SEARCH_FAILED: {
    imageSearchFailed: 'Image search failed',
  },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    q: {
      type: 'string',
      maxLength: 256,
      required: true,
    },
    provider: {
      type: 'string',
      isIn: ['auto', 'pexels', 'openverse', 'wikimedia', 'unsplash'],
      defaultsTo: 'auto',
    },
    language: {
      type: 'string',
      isIn: ['auto', 'en', 'ru', 'uk'],
      defaultsTo: 'auto',
    },
    orientation: {
      type: 'string',
      isIn: ['landscape', 'portrait', 'square', 'any'],
      defaultsTo: 'landscape',
    },
    page: {
      type: 'number',
      min: 1,
      defaultsTo: 1,
    },
    perPage: {
      type: 'number',
      min: 1,
      defaultsTo: 20,
    },
    minWidth: {
      type: 'number',
      min: 1,
    },
    minHeight: {
      type: 'number',
      min: 1,
    },
    fullHdOnly: {
      type: 'boolean',
      defaultsTo: true,
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
    queryTooShort: {
      responseType: 'unprocessableEntity',
    },
    providerNotConfigured: {
      responseType: 'unprocessableEntity',
    },
    imageSearchFailed: {
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

    const query = inputs.q.trim();
    if (query.length < 2) {
      throw Errors.QUERY_TOO_SHORT;
    }

    const config = sails.config.custom.backgroundImageSearch;

    try {
      return await imageSearch.search({
        query,
        provider: inputs.provider,
        language: inputs.language,
        orientation: inputs.orientation,
        page: Math.floor(inputs.page),
        perPage: Math.min(Math.floor(inputs.perPage), 40),
        minWidth: inputs.minWidth || config.minWidth,
        minHeight: inputs.minHeight || config.minHeight,
        fullHdOnly: inputs.fullHdOnly,
      });
    } catch (error) {
      if (error.code === 'providerNotConfigured') {
        throw Errors.PROVIDER_NOT_CONFIGURED;
      }

      sails.log.warn(error.stack || error.message);
      throw Errors.IMAGE_SEARCH_FAILED;
    }
  },
};
