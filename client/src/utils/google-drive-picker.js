/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from '../constants/Config';

let scriptLoaded = false;
let scriptLoading = null;

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

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

const fetchStatus = async () => {
  const response = await fetch(`${Config.BASE_PATH}/api/google-drive/status`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = new Error('Failed to get Google Drive status');
    error.code = 'GOOGLE_DRIVE_STATUS_FAILED';
    throw error;
  }

  return response.json();
};

const openOAuthPopup = () =>
  new Promise((resolve, reject) => {
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const baseUrl = `${window.location.origin}${Config.BASE_PATH}`;

    authWindow = window.open(
      `${baseUrl}/api/google-drive/authorize`,
      'google-drive-auth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!authWindow) {
      const error = new Error('Popup was blocked');
      error.code = 'GOOGLE_DRIVE_POPUP_BLOCKED';
      reject(error);
      return;
    }

    let checkClosed;

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data && event.data.type === 'google-drive-connected') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        resolve();
      }
      if (event.data && event.data.type === 'google-drive-error') {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        const error = new Error(event.data.error || 'OAuth failed');
        error.code = 'GOOGLE_DRIVE_OAUTH_FAILED';
        reject(error);
      }
    };

    window.addEventListener('message', handleMessage);

    checkClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        const error = new Error('OAuth window was closed');
        error.code = 'GOOGLE_DRIVE_OAUTH_CANCELLED';
        reject(error);
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
    if (response.status === 422) {
      const error = new Error('Google Drive is not connected');
      error.code = 'GOOGLE_DRIVE_NOT_CONNECTED';
      throw error;
    }
    if (response.status === 403) {
      const error = new Error('Google Drive integration is disabled');
      error.code = 'GOOGLE_DRIVE_DISABLED';
      throw error;
    }
    const error = new Error('Failed to get picker token');
    error.code = 'GOOGLE_DRIVE_TOKEN_FAILED';
    throw error;
  }

  return response.json();
};

const normalizePickedDocument = (doc) => {
  const isFolder = doc.type === 'folder' || doc.mimeType === FOLDER_MIME_TYPE;
  const url =
    doc.url ||
    (isFolder
      ? `https://drive.google.com/drive/folders/${doc.id}`
      : `https://drive.google.com/file/d/${doc.id}/view`);

  return {
    fileId: doc.id,
    name: doc.name,
    mimeType: doc.mimeType || (isFolder ? FOLDER_MIME_TYPE : null),
    webViewLink: url,
    url,
    embedUrl: isFolder ? null : doc.embedUrl || `https://drive.google.com/file/d/${doc.id}/preview`,
    iconUrl: doc.iconUrl || null,
    thumbnailUrl: doc.thumbnailUrl || null,
    resourceKey: doc.resourceKey || null,
    isFolder,
  };
};

const openPicker = async (apiKey, appId, clientId, accessToken) =>
  new Promise((resolve, reject) => {
    window.gapi.load('picker', {
      callback: () => {
        const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
        docsView.setIncludeFolders(true);
        docsView.setSelectFolderEnabled(true);
        docsView.setMode(window.google.picker.DocsViewMode.LIST);

        if (typeof docsView.setOwnedByMe === 'function') {
          docsView.setOwnedByMe(true);
        }

        const picker = new window.google.picker.PickerBuilder()
          .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setAppId(appId)
          .setOAuthToken(accessToken)
          .addView(docsView)
          .setDeveloperKey(apiKey)
          .setCallback((data) => {
            if (data.action === window.google.picker.Action.PICKED) {
              resolve(data.docs.map(normalizePickedDocument));
            } else if (data.action === window.google.picker.Action.CANCEL) {
              const error = new Error('Picker cancelled');
              error.code = 'GOOGLE_DRIVE_PICKER_CANCELLED';
              reject(error);
            }
          })
          .build();

        picker.setVisible(true);
      },
      onerror: () => {
        const error = new Error('Failed to load Google Picker');
        error.code = 'GOOGLE_DRIVE_PICKER_LOAD_FAILED';
        reject(error);
      },
    });
  });

export const ErrorCodes = {
  NOT_CONFIGURED: 'GOOGLE_DRIVE_NOT_CONFIGURED',
  DISABLED: 'GOOGLE_DRIVE_DISABLED',
  NOT_CONNECTED: 'GOOGLE_DRIVE_NOT_CONNECTED',
  POPUP_BLOCKED: 'GOOGLE_DRIVE_POPUP_BLOCKED',
  OAUTH_FAILED: 'GOOGLE_DRIVE_OAUTH_FAILED',
  OAUTH_CANCELLED: 'GOOGLE_DRIVE_OAUTH_CANCELLED',
  PICKER_CANCELLED: 'GOOGLE_DRIVE_PICKER_CANCELLED',
  PICKER_LOAD_FAILED: 'GOOGLE_DRIVE_PICKER_LOAD_FAILED',
  TOKEN_FAILED: 'GOOGLE_DRIVE_TOKEN_FAILED',
  STATUS_FAILED: 'GOOGLE_DRIVE_STATUS_FAILED',
  CONNECTION_FAILED: 'GOOGLE_DRIVE_CONNECTION_FAILED',
};

const openGoogleDrivePicker = async (t) => {
  const status = await fetchStatus();

  if (!status.configured) {
    const error = new Error(t('common.googleDriveIntegrationNotConfigured'));
    error.code = ErrorCodes.NOT_CONFIGURED;
    throw error;
  }

  if (status.enabled === false) {
    const error = new Error(t('common.googleDriveIntegrationDisabled'));
    error.code = ErrorCodes.DISABLED;
    throw error;
  }

  try {
    await loadGoogleApiScript();
  } catch (error) {
    const err = new Error(t('common.googleDrivePickerFailed'));
    err.code = ErrorCodes.PICKER_LOAD_FAILED;
    throw err;
  }

  let pickerConfig;
  try {
    pickerConfig = await fetchPickerToken();
  } catch (error) {
    if (error.code === ErrorCodes.NOT_CONNECTED || error.code === ErrorCodes.DISABLED) {
      if (error.code === ErrorCodes.DISABLED) {
        const err = new Error(t('common.googleDriveIntegrationDisabled'));
        err.code = ErrorCodes.DISABLED;
        throw err;
      }

      try {
        await openOAuthPopup();
        pickerConfig = await fetchPickerToken();
      } catch (authError) {
        if (authError.code === ErrorCodes.POPUP_BLOCKED) {
          const err = new Error(t('common.popupWasBlocked'));
          err.code = ErrorCodes.POPUP_BLOCKED;
          throw err;
        }
        if (authError.code === ErrorCodes.OAUTH_CANCELLED) {
          const err = new Error(t('common.googleDriveConnectionFailed'));
          err.code = ErrorCodes.OAUTH_CANCELLED;
          throw err;
        }
        const err = new Error(t('common.googleDriveConnectionFailed'));
        err.code = ErrorCodes.CONNECTION_FAILED;
        throw err;
      }
    } else {
      const err = new Error(t('common.googleDrivePickerFailed'));
      err.code = ErrorCodes.TOKEN_FAILED;
      throw err;
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
  ErrorCodes,
};