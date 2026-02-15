const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const originalResolveRequest = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Ensure web runtime uses CommonJS tslib entry to satisfy packages expecting `tslib.default`.
    if (moduleName === 'tslib' || moduleName.startsWith('tslib/')) {
      return {
        filePath: require.resolve('tslib/tslib.js'),
        type: 'sourceFile',
      };
    }

    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }

    return resolve(context, moduleName, platform);
  },
};

module.exports = config;
