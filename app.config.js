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
  const sentryPluginAvailable = hasExpoConfigPlugin('@sentry/react-native');

  const sentryOrg = process.env.SENTRY_ORG || process.env.EXPO_PUBLIC_SENTRY_ORG || base.extra?.sentryOrg || null;
  const sentryProject = process.env.SENTRY_PROJECT || process.env.EXPO_PUBLIC_SENTRY_PROJECT || base.extra?.sentryProject || null;
  const sentryAuthTokenAvailable = Boolean(process.env.SENTRY_AUTH_TOKEN);

  const basePlugins = Array.isArray(base.plugins) ? base.plugins : [];
  const pluginsWithoutPurchases = basePlugins.filter((plugin) =>
    Array.isArray(plugin) ? plugin[0] !== 'react-native-purchases' : plugin !== 'react-native-purchases',
  );
  const pluginsWithoutSentry = pluginsWithoutPurchases.filter((plugin) =>
    Array.isArray(plugin) ? plugin[0] !== '@sentry/react-native' : plugin !== '@sentry/react-native',
  );

  const plugins = [...pluginsWithoutSentry];
  if (nativeRevenueCatPluginEnabled && revenueCatExpoPluginAvailable) {
    const anchorIndex = plugins.findIndex((plugin) => plugin === 'expo-font');
    const insertIndex = anchorIndex >= 0 ? anchorIndex + 1 : plugins.length;
    plugins.splice(insertIndex, 0, 'react-native-purchases');
  }
  if (sentryPluginAvailable && sentryOrg && sentryProject && sentryAuthTokenAvailable) {
    plugins.push([
      '@sentry/react-native',
      {
        organization: sentryOrg,
        project: sentryProject,
      },
    ]);
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
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || base.extra?.sentryDsn || '',
  };

  return {
    ...config,
    ...base,
    plugins,
    extra,
  };
};
