const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix tslib module resolution for web
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Force tslib to use the main CommonJS entry point instead of the ESM modules version
    if (moduleName === 'tslib' || moduleName.startsWith('tslib/')) {
      return {
        filePath: require.resolve('tslib'),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
