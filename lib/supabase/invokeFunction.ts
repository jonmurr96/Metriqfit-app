import * as Sentry from '@sentry/react-native';

/**
 * Wraps supabase.functions.invoke to handle @supabase/functions-js v2.91+
 * behavior where non-2xx responses return data=null with the raw Response
 * object in error.context (instead of the parsed JSON body in data).
 *
 * Returns a normalized { data, error, parsedError } tuple where parsedError
 * contains the parsed JSON body from the Edge Function on failure.
 */
export async function invokeFunction<T = any>(
  invokeFn: () => Promise<{ data: T | null; error: any }>,
): Promise<{ data: T | null; parsedError: Record<string, any> | null; rawError: any }> {
  const { data, error } = await Sentry.startSpan(
    { name: 'Supabase Edge Function', op: 'supabase.function.invoke' },
    invokeFn,
  );

  if (!error) {
    return { data, parsedError: null, rawError: null };
  }

  // v2.91+: data is null on non-2xx; raw Response lives in error.context.
  // Try to parse the body from error.context first, then fall back to data.
  let parsedError: Record<string, any> | null = data as any ?? null;
  const contextResponse = error?.context;
  if (!parsedError && contextResponse && typeof contextResponse.json === 'function') {
    try {
      parsedError = await (contextResponse as Response).json();
    } catch {
      // Non-JSON body — leave parsedError as null
    }
  }

  return { data: null, parsedError, rawError: error };
}

/**
 * Extracts a human-readable error message from a failed Edge Function call,
 * checking parsedError (JSON body) before falling back to rawError.message.
 */
export function extractFunctionError(
  parsedError: Record<string, any> | null,
  rawError: any,
  fallback = 'An unexpected error occurred. Please try again.',
): string {
  return parsedError?.error || parsedError?.message || rawError?.message || fallback;
}

/**
 * Extracts the HTTP status code from a failed invocation.
 * In v2.91+, the raw Response is in rawError.context.
 */
export function extractFunctionStatus(rawError: any): number {
  return rawError?.context?.status || rawError?.status || rawError?.code || 0;
}
