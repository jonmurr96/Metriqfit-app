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

  const extra = {
    ...(base.extra || {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || base.extra?.supabaseUrl || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || base.extra?.supabaseAnonKey || '',
    authGoogleEnabled:
      process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED || base.extra?.authGoogleEnabled || 'true',
    authAppleEnabled:
      process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED || base.extra?.authAppleEnabled || 'false',
  };

  return {
    ...config,
    ...base,
    plugins,
    extra,
  };
};
