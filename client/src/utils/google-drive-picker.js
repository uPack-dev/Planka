/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from '../constants/Config';

let scriptLoaded = false;
let scriptLoading = null;

const loadGoogleApiScript = () => {
  if (scriptLoaded) {
    return Promise.resolve();
  }

  if (scriptLoading) {
    return scriptLoading;
  }

  scriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error('Failed to load Google API script'));
    };
    document.body.appendChild(script);
  });

  return scriptLoading;
};

let authWindow = null;

const openOAuthPopup = () =>
  new Promise((resolve, reject) => {
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    authWindow = window.open(
      `${window.location.origin}${Config.BASE_PATH}/api/google-drive/authorize`,
      'google-drive-auth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!authWindow) {
      reject(new Error('Popup was blocked'));
      return;
    }

    let checkClosed;

    const handleMessage = (event) => {
      if (event.data && event.data.type === 'google-drive-connected') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        resolve();
      }
    };

    window.addEventListener('message', handleMessage);

    checkClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('OAuth window was closed'));
      }
    }, 500);
  });

const fetchPickerToken = async () => {
  const response = await fetch(`${Config.BASE_PATH}/api/google-drive/picker-token`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to get picker token');
  }

  return response.json();
};

const openPicker = async (apiKey, appId, clientId, accessToken) =>
  new Promise((resolve, reject) => {
    window.gapi.load('auth');
    window.gapi.load('picker');

    window.gapi.load('picker', {
      callback: () => {
        const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
        view.setIncludeFolders(false);
        view.setSelectFolderEnabled(false);
        view.setMode(window.google.picker.DocsViewMode.LIST);

        const picker = new window.google.picker.PickerBuilder()
          .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setAppId(appId)
          .setOAuthToken(accessToken)
          .addView(view)
          .setDeveloperKey(apiKey)
          .setCallback((data) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const files = data.docs.map((doc) => ({
                fileId: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                webViewLink: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
                url: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
                embedUrl: doc.embedUrl || `https://drive.google.com/file/d/${doc.id}/preview`,
                iconUrl: doc.iconUrl,
                thumbnailUrl: doc.thumbnailUrl,
                resourceKey: null,
              }));
              resolve(files);
            } else if (data.action === window.google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();

        picker.setVisible(true);
      },
      onerror: () => {
        reject(new Error('Failed to load Google Picker'));
      },
    });
  });

const openGoogleDrivePicker = async (t) => {
  try {
    await loadGoogleApiScript();
  } catch (error) {
    throw new Error(t('common.googleDrivePickerFailed'));
  }

  let pickerConfig;
  try {
    pickerConfig = await fetchPickerToken();
  } catch (error) {
    if (error.message === 'Failed to get picker token') {
      try {
        await openOAuthPopup();
        pickerConfig = await fetchPickerToken();
      } catch (authError) {
        throw new Error(t('common.googleDriveConnectionFailed'));
      }
    } else {
      throw new Error(t('common.googleDrivePickerFailed'));
    }
  }

  return openPicker(
    pickerConfig.apiKey,
    pickerConfig.appId,
    pickerConfig.clientId,
    pickerConfig.accessToken,
  );
};

export default {
  openGoogleDrivePicker,
};
