#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJson(filePath) {
  const abs = path.join(root, filePath);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function parseEnvFile(filePath) {
  const abs = path.join(root, filePath);
  if (!fs.existsSync(abs)) return {};

  const result = {};
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function parseBool(value, defaultValue) {
  if (typeof value !== 'string') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function maskValue(value) {
  if (!value) return '(missing)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

const appJson = readJson('app.json');
const packageJson = readJson('package.json');
const env = {
  ...parseEnvFile('.env'),
  ...parseEnvFile('.env.local'),
  ...process.env,
};

const plugins = appJson?.expo?.plugins || [];
const hasRevenueCatPluginInAppJson = plugins.some((plugin) =>
  Array.isArray(plugin) ? plugin[0] === 'react-native-purchases' : plugin === 'react-native-purchases',
);
const appConfigPath = path.join(root, 'app.config.js');
const hasRevenueCatPluginInDynamicConfig = fs.existsSync(appConfigPath)
  && fs.readFileSync(appConfigPath, 'utf8').includes('react-native-purchases');
const hasRevenueCatPlugin = hasRevenueCatPluginInAppJson || hasRevenueCatPluginInDynamicConfig;
const hasDependency = Boolean(packageJson?.dependencies?.['react-native-purchases']);

const billingTestMode = parseBool(env.EXPO_PUBLIC_BILLING_TEST_MODE, true);
const sandboxEnabled = parseBool(env.EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED, false);
const nativePluginEnabled = parseBool(env.EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED, false);
const iosKey = env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const androidKey = env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

const warnings = [];
const failures = [];

if (!hasDependency) failures.push('Missing dependency: react-native-purchases');
if (!hasRevenueCatPluginInAppJson && hasRevenueCatPluginInDynamicConfig) {
  warnings.push('RevenueCat plugin is managed dynamically via app.config.js.');
}

if (nativePluginEnabled && !hasRevenueCatPlugin) {
  if (billingTestMode) {
    warnings.push('Expo plugin react-native-purchases is not configured in app.json (allowed in billing test mode).');
  } else {
    failures.push('Missing Expo plugin: react-native-purchases in app.json');
  }
}
if (sandboxEnabled && !nativePluginEnabled) {
  failures.push('Sandbox enabled but EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED=false.');
}

if (billingTestMode) {
  warnings.push('EXPO_PUBLIC_BILLING_TEST_MODE=true (mock billing path is active).');
}
if (!sandboxEnabled) {
  warnings.push('EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED=false (native sandbox path is disabled).');
}
if (sandboxEnabled && !iosKey) failures.push('Sandbox enabled but EXPO_PUBLIC_REVENUECAT_IOS_KEY is missing.');
if (sandboxEnabled && !androidKey) failures.push('Sandbox enabled but EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is missing.');

const lines = [];
lines.push('MetriqFit Billing Sandbox Validation');
lines.push('-----------------------------------');
lines.push(`Dependency react-native-purchases: ${hasDependency ? 'OK' : 'FAIL'}`);
lines.push(`Expo plugin configured: ${hasRevenueCatPlugin ? 'OK' : 'FAIL'}`);
lines.push(`Billing test mode: ${billingTestMode ? 'ON' : 'OFF'}`);
lines.push(`RevenueCat sandbox mode: ${sandboxEnabled ? 'ON' : 'OFF'}`);
lines.push(`Native plugin mode: ${nativePluginEnabled ? 'ON' : 'OFF'}`);
lines.push(`iOS API key: ${maskValue(iosKey)}`);
lines.push(`Android API key: ${maskValue(androidKey)}`);
lines.push('');

if (warnings.length) {
  lines.push('Warnings:');
  for (const warning of warnings) lines.push(`- ${warning}`);
  lines.push('');
}

if (failures.length) {
  lines.push('Failures:');
  for (const failure of failures) lines.push(`- ${failure}`);
  lines.push('');
}

if (!warnings.length && !failures.length) {
  lines.push('Status: READY for native RevenueCat sandbox validation.');
} else if (!failures.length) {
  lines.push('Status: PARTIALLY READY (no hard failures, but warnings present).');
} else {
  lines.push('Status: NOT READY (fix failures first).');
}

console.log(lines.join('\n'));

process.exit(failures.length ? 1 : 0);
