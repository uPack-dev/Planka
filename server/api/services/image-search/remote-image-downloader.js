/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/* eslint-disable no-bitwise, no-underscore-dangle */

const crypto = require('crypto');
const dns = require('dns');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const path = require('path');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { fileTypeFromFile } = require('file-type');
const sharp = require('sharp');
const { rimraf } = require('rimraf');

const { RASTER_MIME_TYPES } = require('./validate-image-result');

const MAX_REDIRECTS = 3;

class SizeLimitStream extends Transform {
  constructor(maxBytes) {
    super();
    this.maxBytes = maxBytes;
    this.bytes = 0;
  }

  _transform(chunk, encoding, callback) {
    this.bytes += chunk.length;

    if (this.bytes > this.maxBytes) {
      const error = new Error('Remote image exceeds maximum download size');
      error.code = 'maxDownloadSizeExceeded';
      callback(error);
      return;
    }

    callback(null, chunk);
  }
}

const ipv4ToInt = (address) =>
  address.split('.').reduce((result, octet) => result * 256 + parseInt(octet, 10), 0) >>> 0;

const isIpv4InRange = (address, baseAddress, mask) => {
  const addressInt = ipv4ToInt(address);
  const baseAddressInt = ipv4ToInt(baseAddress);
  const maskInt = mask === 0 ? 0 : (0xffffffff << (32 - mask)) >>> 0;

  return (addressInt & maskInt) === (baseAddressInt & maskInt);
};

const isPrivateIpv4 = (address) =>
  [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ].some(([baseAddress, mask]) => isIpv4InRange(address, baseAddress, mask));

const isPrivateIpv6 = (address) => {
  const lowerAddress = address.toLowerCase();

  if (lowerAddress === '::' || lowerAddress === '::1') {
    return true;
  }

  if (lowerAddress.startsWith('::ffff:')) {
    return isPrivateIpv4(lowerAddress.slice(7));
  }

  const firstHextet = parseInt(lowerAddress.split(':')[0], 16);

  if (!Number.isFinite(firstHextet)) {
    return true;
  }

  return (
    (firstHextet & 0xfe00) === 0xfc00 ||
    (firstHextet & 0xffc0) === 0xfe80 ||
    (firstHextet & 0xff00) === 0xff00
  );
};

const isPrivateIp = (address) => {
  if (net.isIP(address) === 4) {
    return isPrivateIpv4(address);
  }

  if (net.isIP(address) === 6) {
    return isPrivateIpv6(address);
  }

  return true;
};

const createPrivateAddressError = () => {
  const error = new Error('Remote image host resolved to a private address');
  error.code = 'privateAddress';

  return error;
};

const createSafeLookup = () => (hostname, options, callback) => {
  dns.lookup(hostname, options, (error, address, family) => {
    if (error) {
      callback(error);
      return;
    }

    if (Array.isArray(address)) {
      if (address.some((entry) => isPrivateIp(entry.address))) {
        callback(createPrivateAddressError());
        return;
      }

      callback(null, address);
      return;
    }

    if (isPrivateIp(address)) {
      callback(createPrivateAddressError());
      return;
    }

    callback(null, address, family);
  });
};

const assertAllowedProtocol = (url) => {
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error('Remote image URL protocol is not allowed');
    error.code = 'invalidProtocol';
    throw error;
  }
};

const getDeclaredMimeType = (headers) => {
  const contentType = headers['content-type'];

  if (!contentType) {
    return null;
  }

  return contentType.split(';')[0].trim().toLowerCase();
};

const getImageDimensions = async (filePath) => {
  const metadata = await sharp(filePath, {
    animated: true,
  }).metadata();

  let { width, pageHeight: height = metadata.height } = metadata;
  if (metadata.orientation && metadata.orientation > 4) {
    [width, height] = [height, width];
  }

  return { width, height };
};

const downloadToTempFile = (url, options, redirectsRemaining = MAX_REDIRECTS) =>
  new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      assertAllowedProtocol(parsedUrl);
    } catch (error) {
      reject(error);
      return;
    }

    const tempFilePath = path.join(
      os.tmpdir(),
      `planka-remote-background-${process.pid}-${Date.now()}-${crypto
        .randomBytes(8)
        .toString('hex')}`,
    );

    const request = (parsedUrl.protocol === 'https:' ? https : http).get(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        headers: {
          Accept: 'image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5',
          'User-Agent': `PLANKA/${sails.config.custom.version}`,
        },
        lookup: createSafeLookup(),
        timeout: options.timeoutMs,
      },
      async (response) => {
        const { statusCode, headers } = response;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          response.resume();

          if (redirectsRemaining === 0) {
            await rimraf(tempFilePath);
            reject(new Error('Remote image redirected too many times'));
            return;
          }

          let redirectUrl;
          try {
            redirectUrl = new URL(headers.location, parsedUrl).toString();
            assertAllowedProtocol(new URL(redirectUrl));
          } catch (error) {
            await rimraf(tempFilePath);
            reject(error);
            return;
          }

          downloadToTempFile(redirectUrl, options, redirectsRemaining - 1).then(resolve, reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          await rimraf(tempFilePath);
          reject(new Error(`Remote image returned HTTP ${statusCode}`));
          return;
        }

        const contentLength = parseInt(headers['content-length'], 10);
        if (Number.isFinite(contentLength) && contentLength > options.maxDownloadBytes) {
          response.resume();
          await rimraf(tempFilePath);
          reject(new Error('Remote image exceeds maximum download size'));
          return;
        }

        const declaredMimeType = getDeclaredMimeType(headers);
        if (
          declaredMimeType &&
          (!declaredMimeType.startsWith('image/') || declaredMimeType === 'image/svg+xml')
        ) {
          response.resume();
          await rimraf(tempFilePath);
          reject(new Error('Remote URL did not return an allowed image content type'));
          return;
        }

        const sizeLimiter = new SizeLimitStream(options.maxDownloadBytes);

        try {
          await pipeline(response, sizeLimiter, fs.createWriteStream(tempFilePath));
          resolve({
            fd: tempFilePath,
            size: sizeLimiter.bytes,
            type: declaredMimeType || 'application/octet-stream',
          });
        } catch (error) {
          await rimraf(tempFilePath);
          reject(error);
        }
      },
    );

    request.on('timeout', () => {
      request.destroy(new Error('Remote image download timed out'));
    });

    request.on('error', async (error) => {
      await rimraf(tempFilePath);
      reject(error);
    });
  });

module.exports = async (
  url,
  { minWidth, minHeight, requireMinSize, timeoutMs, maxDownloadBytes },
) => {
  const file = await downloadToTempFile(url, {
    timeoutMs,
    maxDownloadBytes,
  });

  try {
    const fileType = await fileTypeFromFile(file.fd);

    if (!fileType || !RASTER_MIME_TYPES.has(fileType.mime)) {
      throw new Error('Remote file is not a supported raster image');
    }

    const dimensions = await getImageDimensions(file.fd);

    if (
      requireMinSize &&
      (!dimensions.width ||
        !dimensions.height ||
        dimensions.width < minWidth ||
        dimensions.height < minHeight)
    ) {
      const error = new Error('Remote image is smaller than the minimum required size');
      error.code = 'imageTooSmall';
      throw error;
    }

    return {
      ...file,
      type: fileType.mime,
      filename: `remote-background.${fileType.ext}`,
      mimeType: fileType.mime,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    await rimraf(file.fd);
    throw error;
  }
};
