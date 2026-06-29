/*!
 * Copyright (c) 2025 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const STYLE_PRESET_VALUES = new Set(['original', 'upack-workspace', 'top-commandos']);

const normalizeStylePreset = (value) => {
  if (STYLE_PRESET_VALUES.has(value)) {
    return value;
  }

  return 'original';
};

module.exports = {
  exits: {
    success: {
      responseType: 'view',
      viewTemplatePath: 'index',
    },
  },

  fn() {
    const stylePreset = normalizeStylePreset(
      process.env.STYLE_PRESET || process.env.VITE_STYLE_PRESET,
    );

    return {
      basePath: sails.config.custom.baseUrlPath,
      stylePresetJson: JSON.stringify(stylePreset),
    };
  },
};
