/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const StylePresets = {
  ORIGINAL: 'original',
  UPACK_WORKSPACE: 'upack-workspace',
  TOP_COMMANDOS: 'top-commandos',
};

export const DEFAULT_STYLE_PRESET = StylePresets.ORIGINAL;

const STYLE_PRESET_VALUES = new Set(Object.values(StylePresets));

const normalizeStylePreset = (value) => {
  if (STYLE_PRESET_VALUES.has(value)) {
    return value;
  }

  return DEFAULT_STYLE_PRESET;
};

export const stylePreset = normalizeStylePreset(import.meta.env.VITE_STYLE_PRESET);

export const isUpackWorkspaceStyle = stylePreset === StylePresets.UPACK_WORKSPACE;
export const isTopCommandosStyle = stylePreset === StylePresets.TOP_COMMANDOS;

export const stylePresetMeta = {
  [StylePresets.ORIGINAL]: {
    title: 'PLANKA',
    description: 'PLANKA is the kanban-style project mastering tool for everyone',
    themeColor: '#000000',
    iconHref: '/favicon.ico',
    appleTouchIconHref: '/logo192.png',
    manifestHref: '/manifest.json',
  },
  [StylePresets.UPACK_WORKSPACE]: {
    title: 'uPack Workspace',
    description: 'Workspace для управління проектами',
    themeColor: '#275F88',
    iconHref: '/favicon-upack-workspace.ico',
    appleTouchIconHref: '/logo192-upack-workspace.png',
    manifestHref: '/manifest-upack-workspace.json',
    fontStylesheetHref:
      'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap',
  },
  [StylePresets.TOP_COMMANDOS]: {
    title: 'TOP COMMANDOS',
    description: 'Команда профессионалов с созидательным мышлением и сильной экспертизой',
    themeColor: '#4A72AE',
    iconHref: '/favicon.ico',
    appleTouchIconHref: '/logo192.png',
    manifestHref: '/manifest-top-commandos.json',
  },
};
