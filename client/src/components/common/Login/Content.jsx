/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, Divider, Form, Grid, Header, Message, TextArea } from 'semantic-ui-react';
import { useDidUpdate, usePrevious, useToggle } from '../../../lib/hooks';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';
import { isUsername } from '../../../utils/validator';
import AccessTokenSteps from '../../../constants/AccessTokenSteps';
import { isUpackWorkspaceStyle } from '../../../constants/StylePresets';
import TermsModal from './TermsModal';

import plankaLogo from '../../../assets/images/logo.png';
import upackLogo from '../../../assets/images/logo.svg';
import upackCoverAvif from '../../../assets/images/login-upack-cover.avif';
import upackCoverJpg from '../../../assets/images/login-upack-cover.jpg';
import upackCoverWebp from '../../../assets/images/login-upack-cover.webp';

import styles from './Content.module.scss';

const coverKeywords = [
  {
    text: 'розвиток',
    left: '12%',
    top: '8%',
    rotate: '15deg',
    duration: '7.2s',
    delay: '0s',
    floatX: '10px',
    floatY: '12px',
  },
  {
    text: '↗',
    left: '43%',
    top: '7%',
    rotate: '-7deg',
    duration: '6.4s',
    delay: '-1.6s',
    floatX: '8px',
    floatY: '14px',
    isIcon: true,
  },
  {
    text: 'партнерство',
    left: '84%',
    top: '7%',
    rotate: '-12deg',
    duration: '7.8s',
    delay: '-0.8s',
    floatX: '12px',
    floatY: '10px',
  },
  {
    text: 'сайти',
    left: '8%',
    top: '25%',
    rotate: '13deg',
    duration: '6.9s',
    delay: '-2.2s',
    floatX: '7px',
    floatY: '16px',
  },
  {
    text: '&',
    left: '91%',
    top: '24%',
    rotate: '19deg',
    duration: '6.2s',
    delay: '-1.1s',
    floatX: '8px',
    floatY: '10px',
  },
  {
    text: 'бренд',
    left: '88%',
    top: '39%',
    rotate: '0deg',
    duration: '7.3s',
    delay: '-3.1s',
    floatX: '12px',
    floatY: '8px',
  },
  {
    text: 'автоматизація',
    left: '12%',
    top: '57%',
    rotate: '-13deg',
    duration: '8s',
    delay: '-1.9s',
    floatX: '14px',
    floatY: '12px',
  },
  {
    text: '#',
    left: '24%',
    top: '74%',
    rotate: '20deg',
    duration: '6.5s',
    delay: '-0.6s',
    floatX: '9px',
    floatY: '12px',
  },
  {
    text: 'дизайн',
    left: '72%',
    top: '70%',
    rotate: '-22deg',
    duration: '7.4s',
    delay: '-2.7s',
    floatX: '12px',
    floatY: '9px',
  },
  {
    text: 'SMM',
    left: '45%',
    top: '88%',
    rotate: '-22deg',
    duration: '6.8s',
    delay: '-3.4s',
    floatX: '10px',
    floatY: '11px',
  },
  {
    text: 'аналіз',
    left: '10%',
    top: '92%',
    rotate: '7deg',
    duration: '7.6s',
    delay: '-2.9s',
    floatX: '10px',
    floatY: '8px',
  },
  {
    text: 'креатив',
    left: '88%',
    top: '90%',
    rotate: '15deg',
    duration: '7.1s',
    delay: '-0.3s',
    floatX: '13px',
    floatY: '12px',
  },
];

const createMessage = (error, isDebug) => {
  if (!error) {
    return error;
  }

  switch (error.message) {
    case 'Invalid credentials':
      return {
        type: 'error',
        content: 'common.invalidCredentials',
      };
    case 'Invalid email or username':
      return {
        type: 'error',
        content: 'common.invalidEmailOrUsername',
      };
    case 'Invalid password':
      return {
        type: 'error',
        content: 'common.invalidPassword',
      };
    case 'Use single sign-on':
      return {
        type: 'error',
        content: 'common.useSingleSignOn',
      };
    case 'Admin login required to initialize instance':
      return {
        type: 'error',
        content: 'common.adminLoginRequiredToInitializeInstance',
      };
    case 'Email already in use':
      return {
        type: 'error',
        content: 'common.emailAlreadyInUse',
      };
    case 'Username already in use':
      return {
        type: 'error',
        content: 'common.usernameAlreadyInUse',
      };
    case 'Active users limit reached':
      return {
        type: 'error',
        content: 'common.activeUsersLimitReached',
      };
    case 'Failed to fetch':
      return {
        type: 'warning',
        content: 'common.noInternetConnection',
      };
    case 'Network request failed':
      return {
        type: 'warning',
        content: 'common.serverConnectionFailed',
      };
    default:
      return {
        type: 'warning',
        content: isDebug ? error.message : 'common.unknownError',
      };
  }
};

const Content = React.memo(() => {
  const bootstrap = useSelector(selectors.selectBootstrap);

  const {
    data: defaultData,
    isSubmitting,
    isSubmittingWithOidc,
    error,
    debugLogs,
    step,
  } = useSelector(selectors.selectAuthenticateForm);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const wasSubmitting = usePrevious(isSubmitting);

  const [data, handleFieldChange, setData] = useForm(() => {
    const initialData = {
      emailOrUsername: '',
      password: '',
      ...defaultData,
    };

    if (bootstrap.isDemoMode) {
      const params = new URLSearchParams(window.location.hash.slice(1));

      Object.keys(initialData).forEach((fieldName) => {
        const value = params.get(fieldName);

        if (value !== null) {
          initialData[fieldName] = value;
        }
      });
    }

    return initialData;
  });

  const withOidc = !!bootstrap.oidc;
  const isOidcEnforced = withOidc && bootstrap.oidc.isEnforced;
  const isOidcDebug = withOidc && bootstrap.oidc.debug;

  const message = useMemo(() => createMessage(error, isOidcDebug), [error, isOidcDebug]);
  const [focusPasswordFieldState, focusPasswordField] = useToggle();

  const [emailOrUsernameFieldRef, handleEmailOrUsernameFieldRef] = useNestedRef('inputRef');
  const [passwordFieldRef, handlePasswordFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      emailOrUsername: data.emailOrUsername.trim(),
    };

    if (!isEmail(cleanData.emailOrUsername) && !isUsername(cleanData.emailOrUsername)) {
      emailOrUsernameFieldRef.current.select();
      return;
    }

    if (!cleanData.password) {
      passwordFieldRef.current.focus();
      return;
    }

    dispatch(entryActions.authenticate(cleanData));
  }, [dispatch, data, emailOrUsernameFieldRef, passwordFieldRef]);

  const handleAuthenticateWithOidcClick = useCallback(() => {
    dispatch(entryActions.authenticateWithOidc());
  }, [dispatch]);

  const handleMessageDismiss = useCallback(() => {
    dispatch(entryActions.clearAuthenticateError());
  }, [dispatch]);

  useEffect(() => {
    if (!isOidcEnforced) {
      emailOrUsernameFieldRef.current.focus();
    }
  }, [isOidcEnforced, emailOrUsernameFieldRef]);

  useDidUpdate(() => {
    if (wasSubmitting && !isSubmitting && error) {
      switch (error.message) {
        case 'Invalid credentials':
        case 'Invalid email or username':
          emailOrUsernameFieldRef.current.select();

          break;
        case 'Invalid password':
          setData((prevData) => ({
            ...prevData,
            password: '',
          }));
          focusPasswordField();

          break;
        default:
      }
    }
  }, [isSubmitting, wasSubmitting, error]);

  useDidUpdate(() => {
    passwordFieldRef.current.focus();
  }, [focusPasswordFieldState]);

  const loginTitle =
    bootstrap.instanceName ||
    (isUpackWorkspaceStyle ? 'Workspace для управління проектами' : 'PLANKA');

  return (
    <div className={classNames(styles.wrapper, styles.fullHeight)}>
      <Grid verticalAlign="middle" className={styles.grid}>
        <Grid.Column computer={6} tablet={16} mobile={16} className={styles.gridItem}>
          <div className={styles.login}>
            <div className={styles.form}>
              <div className={styles.logoWrapper}>
                <img
                  src={isUpackWorkspaceStyle ? upackLogo : plankaLogo}
                  alt=""
                  className={styles.logo}
                />
              </div>
              <Header
                as="h1"
                textAlign="center"
                content={loginTitle}
                className={styles.formTitle}
              />
              <Header
                as="h2"
                textAlign="center"
                content={t('common.logIn', {
                  context: 'title',
                })}
                className={styles.formSubtitle}
              />
              {message && (
                <Message
                  {...{
                    [message.type]: true,
                  }}
                  visible
                  content={t(message.content)}
                  onDismiss={handleMessageDismiss}
                />
              )}
              {!isOidcEnforced && (
                <>
                  <Form size="large" onSubmit={handleSubmit}>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputLabel}>{t('common.emailOrUsername')}</div>
                      <Input
                        fluid
                        ref={handleEmailOrUsernameFieldRef}
                        name="emailOrUsername"
                        value={data.emailOrUsername}
                        maxLength={256}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <div className={styles.inputLabel}>{t('common.password')}</div>
                      <Input.Password
                        fluid
                        ref={handlePasswordFieldRef}
                        name="password"
                        value={data.password}
                        maxLength={256}
                        readOnly={isSubmitting}
                        className={styles.input}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <Form.Button
                      fluid
                      primary
                      icon="right arrow"
                      labelPosition="right"
                      content={t('action.logIn')}
                      loading={isSubmitting}
                      disabled={isSubmitting || isSubmittingWithOidc}
                    />
                  </Form>
                  {withOidc && (
                    <Divider horizontal content={t('common.or')} className={styles.divider} />
                  )}
                </>
              )}
              {withOidc && (
                <>
                  <Button
                    fluid
                    primary={isOidcDebug ? undefined : isOidcEnforced}
                    color={isOidcDebug ? 'orange' : undefined}
                    icon={isOidcEnforced ? 'right arrow' : undefined}
                    labelPosition={isOidcEnforced ? 'right' : undefined}
                    content={isOidcDebug ? t('action.debugSso') : t('action.logInWithSso')}
                    loading={isSubmittingWithOidc}
                    disabled={isSubmitting || isSubmittingWithOidc}
                    onClick={handleAuthenticateWithOidcClick}
                  />
                  {debugLogs && (
                    <TextArea
                      readOnly
                      as={TextareaAutosize}
                      value={debugLogs.join('\n')}
                      className={styles.debugLog}
                    />
                  )}
                </>
              )}
            </div>
            <div className={styles.poweredBy}>
              <p className={styles.poweredByText}>
                <Trans i18nKey="common.poweredByPlanka">
                  {'Powered by '}
                  <a href="https://github.com/plankanban/planka" target="_blank" rel="noreferrer">
                    PLANKA
                  </a>
                </Trans>
              </p>
            </div>
          </div>
        </Grid.Column>
        <Grid.Column
          computer={10}
          only="computer"
          className={classNames(styles.gridItem, styles.cover)}
        >
          {isUpackWorkspaceStyle ? (
            <div className={styles.coverScene} aria-hidden="true">
              <div className={styles.coverStage}>
                <div className={styles.coverImage}>
                  <picture>
                    <source srcSet={upackCoverAvif} type="image/avif" />
                    <source srcSet={upackCoverWebp} type="image/webp" />
                    <img src={upackCoverJpg} alt="" />
                  </picture>
                </div>
                {coverKeywords.map((keyword) => (
                  <div
                    key={keyword.text}
                    className={classNames(styles.keywordBadge, {
                      [styles.keywordBadgeIcon]: keyword.isIcon,
                    })}
                    style={{
                      '--keyword-left': keyword.left,
                      '--keyword-top': keyword.top,
                      '--keyword-rotate': keyword.rotate,
                      '--keyword-duration': keyword.duration,
                      '--keyword-delay': keyword.delay,
                      '--keyword-float-x': keyword.floatX,
                      '--keyword-float-y': keyword.floatY,
                    }}
                  >
                    <span className={styles.keywordBadgeInner}>{keyword.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.coverOverlay} />
          )}
        </Grid.Column>
      </Grid>
      {step === AccessTokenSteps.ACCEPT_TERMS && <TermsModal />}
    </div>
  );
});

export default Content;
