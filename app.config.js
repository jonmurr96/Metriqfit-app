const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

function parseBool(value, defaultValue) {
  if (typeof value !== 'string') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function hasExpoConfigPlugin(packageName) {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageRoot = path.dirname(packageJsonPath);
    return fs.existsSync(path.join(packageRoot, 'app.plugin.js'));
  } catch {
    return false;
  }
}

module.exports = ({ config }) => {
  const base = appJson.expo || {};
  const nativeRevenueCatPluginEnabled = parseBool(
    process.env.EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED,
    false,
  );
  const revenueCatExpoPluginAvailable = hasExpoConfigPlugin('react-native-purchases');

  const basePlugins = Array.isArray(base.plugins) ? base.plugins : [];
  const pluginsWithoutPurchases = basePlugins.filter((plugin) =>
    Array.isArray(plugin) ? plugin[0] !== 'react-native-purchases' : plugin !== 'react-native-purchases',
  );

  const plugins = [...pluginsWithoutPurchases];
  if (nativeRevenueCatPluginEnabled && revenueCatExpoPluginAvailable) {
    const anchorIndex = plugins.findIndex((plugin) => plugin === 'expo-font');
    const insertIndex = anchorIndex >= 0 ? anchorIndex + 1 : plugins.length;
    plugins.splice(insertIndex, 0, 'react-native-purchases');
  }

  const extra = {
    ...(base.extra || {}),
    appEnv: process.env.EXPO_PUBLIC_APP_ENV || base.extra?.appEnv || 'local',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || base.extra?.supabaseUrl || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || base.extra?.supabaseAnonKey || '',
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || base.extra?.supportEmail || 'support@metriqfit.com',
    privacyPolicyUrl:
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || base.extra?.privacyPolicyUrl || 'https://metriqfit.com/privacy',
    termsUrl:
      process.env.EXPO_PUBLIC_TERMS_URL || base.extra?.termsUrl || 'https://metriqfit.com/terms',
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
