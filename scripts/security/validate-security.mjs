#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';

const root = process.cwd();

const ALLOWED_TEXT_PATHS = new Set([
  'scripts/security/validate-security.mjs',
  'docs/security/masvs-audit.md',
  'supabase/migrations/093_security_hardening_privileged_rpcs.sql',
]);

const ALLOWED_VERIFY_JWT_FALSE_FUNCTIONS = new Set([
  'migrate-workout-plans-v2',
  'remediate-workout-mappings',
]);

const SECRET_FILE_PATTERNS = [
  /firebase-adminsdk.*\.json$/i,
  /service[-_]?account.*\.json$/i,
  /google-services-key\.json$/i,
  /\.pem$/i,
  /\.p8$/i,
  /\.p12$/i,
];

const FORBIDDEN_TEXT_PATTERNS = [
  {
    id: 'private-key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/,
    message: 'Private key material is present in the repository.',
  },
  {
    id: 'supabase-service-role-jwt',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    message: 'A JWT-looking token is present. Confirm this is not a Supabase service-role key.',
  },
  {
    id: 'service-role-bypass-header',
    pattern: /\bx-(?:service-role|bypass)\b/i,
    message: 'Service-role bypass headers must not exist in client or Edge Function code.',
  },
  {
    id: 'client-admin-create-user',
    pattern: /admin_create_email_user\s*\(/,
    message: 'Client/runtime code must not call admin_create_email_user.',
  },
  {
    id: 'mock-billing-entitlement-write',
    pattern: /Mock billing.*writes subscription state without charging/i,
    message: 'Mock billing must not grant or describe entitlement writes.',
  },
  {
    id: 'expo-public-access-token',
    pattern: /EXPO_PUBLIC_ACCESS_TOKEN\b/,
    message: 'Expo access tokens are build/deploy secrets and must not use the EXPO_PUBLIC_ prefix.',
  },
  {
    id: 'serialized-sentry-auth-token',
    pattern: /\bsentryAuthToken\b/,
    message: 'Sentry auth tokens must stay in build environment variables and must not be serialized through Expo config.',
  },
  {
    id: 'anon-bearer-edge-function',
    pattern: /Authorization\s*:\s*`Bearer\s+\$\{[^}]*anon[^}]*\}`/i,
    message: 'Edge Function calls must use the signed-in user access token as Bearer auth, not the public anon key.',
  },
];

function decodeJwtPayload(value) {
  const [, payload] = value.split('.');
  if (!payload) return null;
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function gitScannableFiles() {
  const output = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root });
  return output.toString('utf8').split('\0').filter(Boolean);
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function isTextCandidate(file) {
  if (file.includes('/node_modules/') || file.startsWith('node_modules/')) return false;
  if (file === 'package-lock.json' || file === 'deno.lock') return false;
  if (/\.(png|jpg|jpeg|webp|gif|pdf|tgz|zip|a|so|dylib|xcassets)$/i.test(file)) return false;
  return true;
}

function isAllowedOccurrence(file, patternId) {
  if (ALLOWED_TEXT_PATHS.has(file)) return true;
  if (file.startsWith('supabase/migrations/') && patternId === 'client-admin-create-user') return true;
  return false;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const failures = [];
const warnings = [];
const files = gitScannableFiles();

for (const file of files) {
  if (!SECRET_FILE_PATTERNS.some((pattern) => pattern.test(file))) continue;
  if (fs.existsSync(path.join(root, file))) {
    failures.push(`${file}: secret-bearing file pattern is tracked.`);
  } else {
    warnings.push(`${file}: deleted secret-bearing path still exists in git index until the deletion is staged/committed.`);
  }
}

for (const file of files.filter(isTextCandidate)) {
  let text = '';
  try {
    text = readText(file);
  } catch {
    continue;
  }

  for (const check of FORBIDDEN_TEXT_PATTERNS) {
    const match = check.pattern.exec(text);
    if (!match) continue;
    if (isAllowedOccurrence(file, check.id)) continue;
    if (check.id === 'supabase-service-role-jwt') {
      const payload = decodeJwtPayload(match[0]);
      if (payload?.role === 'anon') continue;
    }

    const line = lineNumberForIndex(text, match.index);
    failures.push(`${file}:${line}: ${check.message}`);
  }
}

if (fs.existsSync(path.join(root, 'supabase/config.toml'))) {
  const config = readText('supabase/config.toml');
  const disabled = [];
  let currentFunction = null;
  for (const line of config.split(/\r?\n/)) {
    const sectionMatch = /^\[functions\.([^\]]+)\]/.exec(line.trim());
    if (sectionMatch) {
      currentFunction = sectionMatch[1];
      continue;
    }
    if (currentFunction && /^verify_jwt\s*=\s*false\b/.test(line.trim())) {
      disabled.push(currentFunction);
    }
  }
  if (disabled.length) {
    const unexpected = disabled.filter((name) => !ALLOWED_VERIFY_JWT_FALSE_FUNCTIONS.has(name));
    const expected = disabled.filter((name) => ALLOWED_VERIFY_JWT_FALSE_FUNCTIONS.has(name));
    if (unexpected.length) {
      failures.push(`Unexpected Supabase functions with verify_jwt=false: ${unexpected.join(', ')}`);
    }
    if (expected.length) {
      warnings.push(`Admin Supabase functions with verify_jwt=false must remain secret-gated: ${expected.join(', ')}`);
    }
  }
}

for (const file of files.filter((candidate) => /^supabase\/functions\/[^/]+\/index\.ts$/.test(candidate))) {
  let text = '';
  try {
    text = readText(file);
  } catch {
    continue;
  }

  if (!text.includes('SUPABASE_SERVICE_ROLE_KEY')) continue;

  const functionName = file.split('/')[2];
  const hasUserAuthCheck = /auth\.getUser\s*\(/.test(text);
  const isAllowedAdminFunction = ALLOWED_VERIFY_JWT_FALSE_FUNCTIONS.has(functionName);
  if (!hasUserAuthCheck && !isAllowedAdminFunction) {
    failures.push(`${file}: service-role Edge Function must authenticate the caller with auth.getUser().`);
  }
  if (isAllowedAdminFunction && !/ADMIN_SECRET/.test(text)) {
    failures.push(`${file}: admin service-role Edge Function must require an admin secret.`);
  }
}

console.log('MetriqFit security validation');
console.log('----------------------------');

if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log('');
}

if (failures.length) {
  console.log('Failures:');
  for (const failure of failures) console.log(`- ${failure}`);
  console.log('');
  console.log('Status: NOT READY');
  process.exit(1);
}

console.log('Status: READY');
