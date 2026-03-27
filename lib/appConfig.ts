import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;

export const APP_ENV = String(
  extra.appEnv || process.env.EXPO_PUBLIC_APP_ENV || 'local',
);

export const SUPPORT_EMAIL = String(
  extra.supportEmail || 'support@metriqfit.com',
);

export const PRIVACY_POLICY_URL = String(
  extra.privacyPolicyUrl || 'https://metriqfit.com/privacy',
);

export const TERMS_OF_SERVICE_URL = String(
  extra.termsUrl || 'https://metriqfit.com/terms',
);

export const IS_PRODUCTION_APP_ENV = APP_ENV === 'prod';

export function getAppVersionInfo() {
  const version = Constants.expoConfig?.version || 'dev';
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  const androidBuild = Constants.expoConfig?.android?.versionCode;
  const build =
    Platform.OS === 'ios'
      ? iosBuild
      : Platform.OS === 'android'
        ? String(androidBuild || '')
        : '';

  const display = [
    `v${version}`,
    build ? `Build ${build}` : null,
    !IS_PRODUCTION_APP_ENV ? APP_ENV : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    version,
    build: build || null,
    environment: APP_ENV,
    display,
  };
}
