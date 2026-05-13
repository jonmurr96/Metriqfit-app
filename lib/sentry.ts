import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import type { Context, Contexts } from '@sentry/types';

type AppEnv = 'local' | 'staging' | 'prod' | string;
export type SentryIssueCategory =
  | 'crash'
  | 'unexpected_runtime_error'
  | 'backend_failure'
  | 'validation_business_rule_rejection'
  | 'network_timeout'
  | 'offline_degraded_experience';

export type SentryIssueSeverity = 'fatal' | 'error' | 'warning' | 'info';

let isInitialized = false;

const MAX_SCRUBBED_TEXT_LENGTH = 180;
const SENSITIVE_KEY_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /token/i,
  /secret/i,
  /password/i,
  /session/i,
  /refresh/i,
  /access/i,
  /image[_-]?payload/i,
  /image[_-]?base64/i,
  /image[_-]?url/i,
  /photo[_-]?url/i,
  /prompt/i,
  /query/i,
  /content/i,
  /notes?/i,
  /body/i,
  /attachment/i,
  /freeform/i,
];

function getAppEnv(): AppEnv {
  return (
    Constants.expoConfig?.extra?.appEnv
    || process.env.EXPO_PUBLIC_APP_ENV
    || 'local'
  );
}

function getRuntimeDsn(): string {
  return (
    Constants.expoConfig?.extra?.sentryDsn
    || process.env.EXPO_PUBLIC_SENTRY_DSN
    || process.env.SENTRY_DSN
    || ''
  );
}

function getRelease() {
  const version = Constants.expoConfig?.version || '0.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber
    || Constants.expoConfig?.android?.versionCode?.toString()
    || '0';
  const bundleId =
    Constants.expoConfig?.ios?.bundleIdentifier
    || Constants.expoConfig?.android?.package
    || Constants.expoConfig?.slug
    || 'metriqfit';
  return `${bundleId}@${version}+${buildNumber}`;
}

function getTraceSampleRate(appEnv: AppEnv) {
  if (appEnv === 'prod') return 0.15;
  if (appEnv === 'staging') return 0.4;
  return 1.0;
}

function getProfileSampleRate(appEnv: AppEnv) {
  if (appEnv === 'prod') return 0.05;
  if (appEnv === 'staging') return 0.2;
  return 0.5;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || error.name;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

function toLower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isSensitiveKey(keyPath: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(keyPath));
}

function isProbablyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('file://') || value.startsWith('data:');
}

function stripUrlNoise(value: string): string {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

export function sanitizeSentryValue(value: unknown, keyPath = ''): unknown {
  if (value == null) return value;

  if (typeof value === 'string') {
    if (isSensitiveKey(keyPath)) {
      return '[REDACTED]';
    }

    if (isProbablyUrl(value)) {
      return stripUrlNoise(value);
    }

    if (value.length > MAX_SCRUBBED_TEXT_LENGTH || value.includes('\n')) {
      const trimmed = value.slice(0, MAX_SCRUBBED_TEXT_LENGTH).trimEnd();
      return `${trimmed}… [len=${value.length}]`;
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeSentryValue(item, `${keyPath}[${index}]`));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeSentryValue(value.message, `${keyPath}.message`),
    };
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        sanitizeSentryValue(nestedValue, keyPath ? `${keyPath}.${key}` : key),
      ]),
    );
  }

  return String(value);
}

export function sanitizeSentryContext(context?: Record<string, unknown>) {
  if (!context) return undefined;
  return sanitizeSentryValue(context) as Record<string, unknown>;
}

function sanitizeErrorEvent(event: Sentry.Event) {
  if (event.request?.headers) {
    const headers = event.request.headers as Record<string, unknown>;
    delete headers.Authorization;
    delete headers.authorization;
    delete headers.Cookie;
    delete headers.cookie;
    delete headers['Set-Cookie'];
    delete headers['set-cookie'];
  }

  if (event.request?.url) {
    event.request.url = stripUrlNoise(String(event.request.url));
  }

  if (event.request?.data) {
    event.request.data = sanitizeSentryValue(event.request.data, 'request.data');
  }

  if (event.extra) {
    event.extra = sanitizeSentryValue(event.extra, 'extra') as Record<string, unknown>;
  }

  if (event.contexts) {
    event.contexts = sanitizeSentryValue(event.contexts, 'contexts') as Contexts;
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      message: typeof breadcrumb.message === 'string'
        ? sanitizeSentryValue(breadcrumb.message, 'breadcrumb.message') as string
        : breadcrumb.message,
      data: breadcrumb.data
        ? (sanitizeSentryValue(breadcrumb.data, 'breadcrumb.data') as Record<string, unknown>)
        : breadcrumb.data,
    }));
  }

  if (event.tags) {
    event.tags = sanitizeSentryValue(event.tags, 'tags') as Record<string, string>;
  }

  if (event.user) {
    event.user = sanitizeSentryValue(event.user, 'user') as Sentry.User;
  }
}

export interface SentryIssueClassification {
  category: SentryIssueCategory;
  severity: SentryIssueSeverity;
  shouldCapture: boolean;
  shouldAlert: boolean;
}

export function classifySentryIssue(
  error: unknown,
  context?: Record<string, unknown>,
): SentryIssueClassification {
  const explicitCategory = context?.category;
  const explicitSeverity = context?.severity;

  if (
    typeof explicitCategory === 'string'
    && typeof explicitSeverity === 'string'
  ) {
    return {
      category: explicitCategory as SentryIssueCategory,
      severity: explicitSeverity as SentryIssueSeverity,
      shouldCapture: explicitCategory !== 'validation_business_rule_rejection',
      shouldAlert: explicitCategory !== 'validation_business_rule_rejection',
    };
  }

  const message = getErrorMessage(error).toLowerCase();
  const status = toNumber(context?.status ?? context?.httpStatus ?? context?.code);
  const code = toLower(context?.code ?? context?.errorCode);

  if (
    context?.crash === true
    || context?.source === 'error_boundary'
    || error instanceof Error && ['ReferenceError', 'TypeError', 'RangeError', 'SyntaxError'].includes(error.name)
  ) {
    return {
      category: 'crash',
      severity: 'fatal',
      shouldCapture: true,
      shouldAlert: true,
    };
  }

  if (
    message.includes('network request failed')
    || message.includes('fetch failed')
    || message.includes('failed to fetch')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('network error')
    || code.includes('network')
    || status === 408
    || status === 504
  ) {
    return {
      category: 'network_timeout',
      severity: 'warning',
      shouldCapture: true,
      shouldAlert: false,
    };
  }

  if (
    message.includes('offline')
    || code.includes('offline')
    || context?.offline === true
  ) {
    return {
      category: 'offline_degraded_experience',
      severity: 'warning',
      shouldCapture: true,
      shouldAlert: false,
    };
  }

  if (
    status !== null && status >= 400 && status < 500
    || message.includes('validation')
    || message.includes('required')
    || message.includes('not allowed')
    || message.includes('must be')
    || message.includes('business rule')
    || message.includes('conflict')
    || message.includes('duplicate')
  ) {
    return {
      category: 'validation_business_rule_rejection',
      severity: 'info',
      shouldCapture: false,
      shouldAlert: false,
    };
  }

  if (
    status !== null && status >= 500
    || message.includes('non-2xx')
    || message.includes('database error')
    || message.includes('failed to save')
    || message.includes('failed to create')
    || message.includes('rpc')
    || message.includes('internal server error')
  ) {
    return {
      category: 'backend_failure',
      severity: 'error',
      shouldCapture: true,
      shouldAlert: true,
    };
  }

  return {
    category: 'unexpected_runtime_error',
    severity: 'error',
    shouldCapture: true,
    shouldAlert: true,
  };
}

export function initSentry() {
  if (isInitialized) return;

  const dsn = getRuntimeDsn();
  if (!dsn) {
    return;
  }

  const appEnv = getAppEnv();

  Sentry.init({
    dsn,
    environment: appEnv,
    release: getRelease(),
    enableNative: true,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true,
    enableAutoPerformanceTracing: true,
    enableNativeFramesTracking: true,
    enableStallTracking: true,
    enableUserInteractionTracing: true,
    enableCaptureFailedRequests: true,
    sendDefaultPii: false,
    tracesSampleRate: getTraceSampleRate(appEnv),
    profilesSampleRate: getProfileSampleRate(appEnv),
    debug: appEnv === 'local' && __DEV__,
    beforeBreadcrumb(breadcrumb) {
      return {
        ...breadcrumb,
        message: typeof breadcrumb.message === 'string'
          ? (sanitizeSentryValue(breadcrumb.message, 'breadcrumb.message') as string)
          : breadcrumb.message,
        data: breadcrumb.data
          ? (sanitizeSentryValue(breadcrumb.data, 'breadcrumb.data') as Record<string, unknown>)
          : breadcrumb.data,
      };
    },
    beforeSend(event) {
      sanitizeErrorEvent(event);
      return event;
    },
  });

  Sentry.setTag('release_channel', appEnv);
  Sentry.setTag('app_release', getRelease());

  isInitialized = true;
}

export function setSentryUserContext(input: {
  userId?: string | null;
  email?: string | null;
  unitSystem?: string | null;
  goalType?: string | null;
  appEnv?: string | null;
}) {
  if (!isInitialized) return;

  Sentry.setUser(
    input.userId
      ? {
          id: input.userId,
          email: input.email || undefined,
        }
      : null,
  );

  if (input.unitSystem) {
    Sentry.setTag('unit_system', input.unitSystem);
  }
  if (input.goalType) {
    Sentry.setTag('goal_type', input.goalType);
  }
  if (input.appEnv) {
    Sentry.setTag('app_env', input.appEnv);
  }
}

export function addSentryBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
) {
  if (!isInitialized) return;
  Sentry.addBreadcrumb({
    message: sanitizeSentryValue(message, 'breadcrumb.message') as string,
    category,
    data: sanitizeSentryContext(data),
    level: 'info',
  });
}

export async function withSentrySpan<T>(
  name: string,
  op: string,
  callback: () => Promise<T> | T,
): Promise<T> {
  if (!isInitialized) {
    return await callback();
  }

  return await Sentry.startSpan({ name, op }, callback);
}

export function captureSentryException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!isInitialized) return;

  const classification = classifySentryIssue(error, context);
  if (!classification.shouldCapture) {
    addSentryBreadcrumb('Suppressed Sentry issue', 'observability.sentry', {
      category: classification.category,
      severity: classification.severity,
      ...sanitizeSentryContext(context),
    });
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('issue_category', classification.category);
    scope.setTag('issue_severity', classification.severity);
    scope.setLevel(classification.severity);
    if (context) {
      scope.setContext('issue', sanitizeSentryContext(context) as Context);
    }
    Sentry.captureException(error);
  });
}

export function captureSentryIssue(
  error: unknown,
  context?: Record<string, unknown>,
) {
  captureSentryException(error, context);
}

export function captureSentryTestEvent(context?: Record<string, unknown>) {
  captureSentryIssue(
    new Error('MetriqFit Sentry test event'),
    {
      category: 'unexpected_runtime_error',
      severity: 'error',
      operation: 'observability.sentry_test',
      source: 'settings_observability',
      authorization: 'Bearer test-token-should-not-appear',
      cookie: 'session=test-cookie-should-not-appear',
      prompt: 'This is a long AI prompt body that should be summarized or redacted before it leaves the app. '.repeat(3),
      notes: 'Freeform nutrition note that should not be sent raw to Sentry.',
      imageUrl: 'https://example.com/private/photo.jpg?token=should-not-leak',
      imagePayload: 'data:image/png;base64,abcdef1234567890',
      content: 'Raw conversation text should be minimized in observability events.',
      ...context,
    },
  );
}
