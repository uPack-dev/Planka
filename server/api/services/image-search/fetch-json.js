/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { ProxyAgent } = require('undici');

let proxyAgent;

const getDispatcher = () => {
  if (!sails.config.custom.outgoingProxy) {
    return undefined;
  }

  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(sails.config.custom.outgoingProxy);
  }

  return proxyAgent;
};

module.exports = async (url, { method = 'GET', headers = {}, body, timeoutMs } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs || sails.config.custom.backgroundImageSearch.timeoutMs,
  );

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      body,
      signal: controller.signal,
      dispatcher: getDispatcher(),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = new Error(`Image search provider request failed with ${response.status}`);
    error.status = response.status;

    try {
      error.body = await response.text();
    } catch (bodyError) {
      sails.log.verbose(bodyError.message);
      /* empty */
    }

    throw error;
  }

  return response.json();
};
