#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), 'utf8');
}

function parseEnvFile(filePath) {
  const abs = path.join(root, filePath);
  if (!fs.existsSync(abs)) return {};

  const env = {};
  for (const line of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
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
    env[key] = value;
  }

  return env;
}

function parseBool(value, defaultValue) {
  if (typeof value !== 'string') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function isUrl(value) {
  return /^https?:\/\//.test(String(value || ''));
}

function maskValue(value) {
  if (!value) return '(missing)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

const env = {
  ...parseEnvFile('.env'),
  ...parseEnvFile('.env.local'),
  ...process.env,
};

const appJson = readJson('app.json');
const easJson = readJson('eas.json');
const appConfig = readText('app.config.js');
const accountService = readText('services/accountService.ts');
const securityScreen = readText('app/settings/security.tsx');
const helpScreen = readText('app/settings/help.tsx');

const warnings = [];
const failures = [];

const productionEnv = easJson?.build?.production?.env || {};
const submitIos = easJson?.submit?.production?.ios || {};
const runtimeVersionPolicy = appJson?.expo?.runtimeVersion?.policy;

if (productionEnv.EXPO_PUBLIC_APP_ENV !== 'prod') {
  failures.push('Production EAS profile must set EXPO_PUBLIC_APP_ENV=prod.');
}

if (String(productionEnv.EXPO_PUBLIC_BILLING_TEST_MODE) !== 'false') {
  failures.push('Production EAS profile must set EXPO_PUBLIC_BILLING_TEST_MODE=false.');
}

if (String(productionEnv.EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED) !== 'true') {
  failures.push('Production EAS profile must enable RevenueCat native plugin.');
}

if (!env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) {
  failures.push('Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY.');
}

if (!env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) {
  warnings.push('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY is missing.');
}

if (runtimeVersionPolicy !== 'appVersion') {
  failures.push('app.json runtimeVersion.policy must be "appVersion".');
}

if (!appJson?.expo?.ios?.infoPlist?.NSMicrophoneUsageDescription) {
  failures.push('app.json ios.infoPlist.NSMicrophoneUsageDescription is missing.');
}

const supportEmail = env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@metriqfit.com';
const privacyUrl = env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://metriqfit.com/privacy';
const termsUrl = env.EXPO_PUBLIC_TERMS_URL || 'https://metriqfit.com/terms';

if (!supportEmail.includes('@')) {
  failures.push('Support email is not configured.');
}

if (!isUrl(privacyUrl)) {
  failures.push('Privacy policy URL is invalid.');
}

if (!isUrl(termsUrl)) {
  failures.push('Terms of service URL is invalid.');
}

if (!/supportEmail/.test(appConfig) || !/privacyPolicyUrl/.test(appConfig) || !/termsUrl/.test(appConfig)) {
  failures.push('Dynamic app config is missing support/legal URL wiring.');
}

for (const [key, value] of Object.entries(submitIos)) {
  const stringValue = String(value || '');
  const envMatch = /^\$\{(.+)\}$/.exec(stringValue);

  if (envMatch) {
    const envKey = envMatch[1];
    if (!env[envKey]) {
      failures.push(`Missing required submit secret ${envKey} for ${key}.`);
    }
    continue;
  }

  if (/YOUR_|your-|placeholder/i.test(stringValue)) {
    failures.push(`submit.production.ios.${key} still contains a placeholder.`);
  }
}

if (!accountService.includes('exportMyData') || !securityScreen.includes('Export my data')) {
  failures.push('Data export flow is missing from settings.');
}

if (!accountService.includes('deleteMyAccount') || !securityScreen.includes('Delete account')) {
  failures.push('Delete account flow is missing from settings.');
}

if (!helpScreen.includes('Privacy policy') || !helpScreen.includes('Terms of service')) {
  failures.push('Help & Legal screen is missing privacy/terms entries.');
}

const lines = [];
lines.push('MetriqFit Release Readiness Validation');
lines.push('-------------------------------------');
lines.push(`Support email: ${supportEmail}`);
lines.push(`Privacy URL: ${privacyUrl}`);
lines.push(`Terms URL: ${termsUrl}`);
lines.push(`RevenueCat iOS key: ${maskValue(env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '')}`);
lines.push(`RevenueCat Android key: ${maskValue(env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '')}`);
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

lines.push(failures.length ? 'Status: NOT READY' : 'Status: READY');
console.log(lines.join('\n'));

process.exit(failures.length ? 1 : 0);

