/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { ProjectBackgroundTypes } from '../../../../constants/Enums';

export const BackgroundTargets = {
  BACKGROUND: 'background',
  COVER: 'cover',
};

export const DEFAULT_COLOR = '#1E88E5';

export const FIELD_NAMES_BY_TARGET = {
  [BackgroundTargets.BACKGROUND]: {
    type: 'backgroundType',
    gradient: 'backgroundGradient',
    imageId: 'backgroundImageId',
    color: 'backgroundColor',
  },
  [BackgroundTargets.COVER]: {
    type: 'coverBackgroundType',
    gradient: 'coverBackgroundGradient',
    imageId: 'coverBackgroundImageId',
    color: 'coverBackgroundColor',
  },
};

export const normalizeHexColor = (value) => {
  const color = value.trim();

  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
    return null;
  }

  const hex = color.slice(1);

  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
      .toUpperCase()}`;
  }

  return color.toUpperCase();
};

export const getBackgroundForTarget = (project, target) => {
  const fields = FIELD_NAMES_BY_TARGET[target];

  return {
    type: project[fields.type],
    gradient: project[fields.gradient],
    imageId: project[fields.imageId],
    color: project[fields.color],
  };
};

export const buildClearBackgroundData = (target) => {
  const fields = FIELD_NAMES_BY_TARGET[target];

  return {
    [fields.type]: null,
    [fields.gradient]: null,
    [fields.imageId]: null,
    [fields.color]: null,
  };
};

export const buildBackgroundData = (target, type, value) => {
  const fields = FIELD_NAMES_BY_TARGET[target];

  switch (type) {
    case ProjectBackgroundTypes.GRADIENT:
      return {
        [fields.type]: type,
        [fields.gradient]: value,
        [fields.imageId]: null,
        [fields.color]: null,
      };
    case ProjectBackgroundTypes.IMAGE:
      return {
        [fields.type]: type,
        [fields.gradient]: null,
        [fields.imageId]: value,
        [fields.color]: null,
      };
    case ProjectBackgroundTypes.COLOR:
      return {
        [fields.type]: type,
        [fields.gradient]: null,
        [fields.imageId]: null,
        [fields.color]: value,
      };
    default:
      return buildClearBackgroundData(target);
  }
};

export const buildBackgroundDataFromBackground = (target, background) => {
  switch (background.type) {
    case ProjectBackgroundTypes.GRADIENT:
      return buildBackgroundData(target, background.type, background.gradient);
    case ProjectBackgroundTypes.IMAGE:
      return buildBackgroundData(target, background.type, background.imageId);
    case ProjectBackgroundTypes.COLOR:
      return buildBackgroundData(target, background.type, background.color);
    default:
      return buildClearBackgroundData(target);
  }
};
