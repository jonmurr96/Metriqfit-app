const appJson = require('./app.json');

function parseBool(value, defaultValue) {
  if (typeof value !== 'string') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

module.exports = ({ config }) => {
  const base = appJson.expo || {};
  const nativeRevenueCatPluginEnabled = parseBool(
    process.env.EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED,
    false,
  );

  const basePlugins = Array.isArray(base.plugins) ? base.plugins : [];
  const pluginsWithoutPurchases = basePlugins.filter((plugin) =>
    Array.isArray(plugin) ? plugin[0] !== 'react-native-purchases' : plugin !== 'react-native-purchases',
  );

  const plugins = [...pluginsWithoutPurchases];
  if (nativeRevenueCatPluginEnabled) {
    const anchorIndex = plugins.findIndex((plugin) => plugin === 'expo-font');
    const insertIndex = anchorIndex >= 0 ? anchorIndex + 1 : plugins.length;
    plugins.splice(insertIndex, 0, 'react-native-purchases');
  }

  return {
    ...config,
    ...base,
    plugins,
  };
};
