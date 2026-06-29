/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

import { stylePreset, stylePresetMeta } from './constants/StylePresets';
import store from './store';
import history from './history';
import Root from './components/common/Root';

import './i18n';

const getBasePath = () => window.BASE_PATH || '';

const withBasePath = (href) => {
  if (!href.startsWith('/')) {
    return href;
  }

  return `${getBasePath()}${href}`;
};

const setMetaContent = (name, content) => {
  const meta = document.querySelector(`meta[name="${name}"]`);

  if (meta) {
    meta.setAttribute('content', content);
  }
};

const setLinkHref = (rel, href) => {
  const link = document.querySelector(`link[rel="${rel}"]`);

  if (link) {
    link.setAttribute('href', withBasePath(href));
  }
};

const addFontStylesheet = (href) => {
  if (!href || document.querySelector(`link[href="${href}"]`)) {
    return;
  }

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = href;

  document.head.append(stylesheet);
};

const applyStylePreset = () => {
  const meta = stylePresetMeta[stylePreset];

  document.body.dataset.stylePreset = stylePreset;
  document.title = meta.title;
  setMetaContent('theme-color', meta.themeColor);
  setMetaContent('description', meta.description);
  setLinkHref('icon', meta.iconHref);
  setLinkHref('apple-touch-icon', meta.appleTouchIconHref);
  setLinkHref('manifest', meta.manifestHref);
  addFontStylesheet(meta.fontStylesheetHref);
};

applyStylePreset();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root, { store, history }));
