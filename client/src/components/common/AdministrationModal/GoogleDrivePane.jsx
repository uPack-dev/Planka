/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Header,
  Tab,
  TextArea,
  Message,
  Icon,
} from 'semantic-ui-react';
import { Input } from '../../../lib/custom-ui';

import Config from '../../../constants/Config';
import { useForm } from '../../../hooks';

import styles from './SmtpPane.module.scss';

const DEFAULT_SCOPES = 'https://www.googleapis.com/auth/drive.file';

const buildFormData = (config) => ({
  enabled: config?.enabled ?? false,
  enableCheckbox: config?.enabled ?? false,
  clientId: config?.clientId || '',
  clientSecret: '',
  pickerApiKey: config?.pickerApiKey || '',
  pickerAppId: config?.pickerAppId || '',
  scopes: config?.scopes || DEFAULT_SCOPES,
});

const GoogleDrivePane = React.memo(() => {
  const [t] = useTranslation();

  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [testError, setTestError] = useState(null);

  const isSecretTouchedRef = useRef(false);

  const [data, handleFieldChange, setData] = useForm(() => buildFormData(null));

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${Config.BASE_PATH}/api/google-drive/config`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const responseData = await response.json();
        setConfig(responseData.item);
      }
    } catch (error) {
      setSaveError(error.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!config) {
      return;
    }

    isSecretTouchedRef.current = false;
    setData(buildFormData(config));
  }, [config, setData]);

  const defaultData = useMemo(() => buildFormData(config), [config]);

  const handleCheckboxChange = useCallback(
    (_, checkboxData) => {
      const newEnabled = checkboxData.checked;
      setData((prev) => ({
        ...prev,
        enableCheckbox: newEnabled,
        enabled: newEnabled,
      }));
    },
    [setData],
  );

  const cleanData = useMemo(
    () => ({
      enabled: data.enableCheckbox,
      clientId: data.clientId.trim() || null,
      clientSecret: data.clientSecret || null,
      pickerApiKey: data.pickerApiKey.trim() || null,
      pickerAppId: data.pickerAppId.trim() || null,
      scopes: data.scopes.trim() || DEFAULT_SCOPES,
    }),
    [data],
  );

  const isConfigured = config && config.configured;

  const isModified = useMemo(() => {
    const currentData = {
      enabled: data.enableCheckbox,
      clientId: data.clientId,
      pickerApiKey: data.pickerApiKey,
      pickerAppId: data.pickerAppId,
      scopes: data.scopes,
    };
    const currentDefault = {
      enabled: defaultData.enableCheckbox,
      clientId: defaultData.clientId,
      pickerApiKey: defaultData.pickerApiKey,
      pickerAppId: defaultData.pickerAppId,
      scopes: defaultData.scopes,
    };
    return !dequal(currentData, currentDefault) || isSecretTouchedRef.current;
  }, [data, defaultData]);

  const handleSubmit = useCallback(async () => {
    setSaveError(null);
    setTestError(null);
    setTestResult(null);
    setIsSaving(true);
    try {
      const body = {
        enabled: cleanData.enabled,
        clientId: cleanData.clientId,
        pickerApiKey: cleanData.pickerApiKey,
        pickerAppId: cleanData.pickerAppId,
        scopes: cleanData.scopes,
      };
      if (isSecretTouchedRef.current && cleanData.clientSecret) {
        body.clientSecret = cleanData.clientSecret;
      }

      const response = await fetch(`${Config.BASE_PATH}/api/google-drive/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (response.ok) {
        isSecretTouchedRef.current = false;
        await fetchConfig();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSaveError(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      setSaveError(error.message);
    }
    setIsSaving(false);
  }, [cleanData, fetchConfig]);

  const handleTestClick = useCallback(async () => {
    setTestError(null);
    setTestResult(null);
    setIsTesting(true);
    try {
      const response = await fetch(`${Config.BASE_PATH}/api/google-drive/config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: cleanData.clientId || config?.clientId,
          clientSecret: cleanData.clientSecret || undefined,
          pickerApiKey: cleanData.pickerApiKey || config?.pickerApiKey,
          pickerAppId: cleanData.pickerAppId || config?.pickerAppId,
          scopes: cleanData.scopes || config?.scopes,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setTestResult(result.item);
      } else {
        setTestError(result.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      setTestError(error.message);
    }
    setIsTesting(false);
  }, [cleanData, config]);

  const handleCopyRedirectUri = useCallback(() => {
    if (config?.redirectUri) {
      navigator.clipboard.writeText(config.redirectUri).catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = config.redirectUri;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    }
  }, [config]);

  const handleSecretChange = useCallback(
    (event, { value, ...props }) => {
      isSecretTouchedRef.current = true;
      handleFieldChange(event, { value, ...props });
    },
    [handleFieldChange],
  );

  if (isLoading) {
    return (
      <Tab.Pane attached={false} className={styles.wrapper}>
        {t('common.loading')}
      </Tab.Pane>
    );
  }

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {saveError && (
        <Message visible negative>
          <Message.Content>{saveError}</Message.Content>
        </Message>
      )}
      {isConfigured && (
        <Message visible info>
          <Icon name="check circle" />
          <Message.Content>{t('common.googleDriveIntegrationConfigured')}</Message.Content>
        </Message>
      )}
      <Form onSubmit={handleSubmit}>
        <Checkbox
          name="enableCheckbox"
          checked={data.enableCheckbox}
          label={t('common.googleDriveIntegration')}
          className={styles.checkbox}
          onChange={handleCheckboxChange}
        />
        <div className={styles.text}>{t('common.googleDriveClientId')}</div>
        <Input
          fluid
          name="clientId"
          value={data.clientId}
          maxLength={512}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <div className={styles.text}>{t('common.googleDriveClientSecret')}</div>
        <Input
          fluid
          name="clientSecret"
          value={data.clientSecret}
          maxLength={512}
          className={styles.field}
          placeholder={config?.configured && !isSecretTouchedRef.current ? '●●●●●●●●' : undefined}
          onChange={handleSecretChange}
        />
        <div className={styles.text}>{t('common.googleDrivePickerApiKey')}</div>
        <Input
          fluid
          name="pickerApiKey"
          value={data.pickerApiKey}
          maxLength={512}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <div className={styles.text}>{t('common.googleDrivePickerAppId')}</div>
        <Input
          fluid
          name="pickerAppId"
          value={data.pickerAppId}
          maxLength={128}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <div className={styles.text}>{t('common.googleDriveRedirectUri')}</div>
        <Input
          fluid
          readOnly
          value={config?.redirectUri || ''}
          className={styles.field}
          action={<Button type="button" icon="copy" onClick={handleCopyRedirectUri} />}
        />
        <div className={styles.text}>{t('common.googleDriveScopes')}</div>
        <Input
          fluid
          name="scopes"
          value={data.scopes}
          maxLength={512}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <div className={styles.controls}>
          <Button
            positive
            disabled={!isModified || isSaving}
            loading={isSaving}
            content={t('action.save')}
          />
          {isConfigured && (
            <Button
              type="button"
              content={t('action.testGoogleDriveConfiguration')}
              loading={isTesting}
              disabled={isTesting}
              onClick={handleTestClick}
            />
          )}
        </div>
      </Form>
      {testError && (
        <Message visible negative style={{ marginTop: 12 }}>
          <Message.Content>{testError}</Message.Content>
        </Message>
      )}
      {testResult && (
        <>
          <Divider horizontal>
            <Header as="h4">
              {t('common.testLog', {
                context: 'title',
              })}
            </Header>
          </Divider>
          <TextArea
            readOnly
            as={TextareaAutosize}
            value={JSON.stringify(testResult, null, 2)}
            className={styles.testLog}
          />
        </>
      )}
    </Tab.Pane>
  );
});

export default GoogleDrivePane;