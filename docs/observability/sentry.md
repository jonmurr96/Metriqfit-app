# Sentry Observability Policy

## Privacy And Scrubbing

- Scrub auth headers, cookies, and tokens before sending events.
- Do not send raw AI/user freeform text when a summary or length is enough.
- Do not send raw nutrition or health notes unless they are already normalized.
- Do not send image payloads. Send counts, labels, or short derived summaries.
- Prefer identifiers, timestamps, statuses, and compact summaries over full payloads.

## Error Taxonomy

- `crash`
  - Root-boundary and fatal runtime failures.
  - Severity: `fatal`
  - Alert: yes
- `unexpected_runtime_error`
  - Unhandled app logic failure that is not a validation issue.
  - Severity: `error`
  - Alert: yes
- `backend_failure`
  - Supabase, edge function, or downstream service failure.
  - Severity: `error`
  - Alert: yes
- `validation_business_rule_rejection`
  - Known business-rule failure or validation rejection.
  - Severity: `info`
  - Alert: no
- `network_timeout`
  - Fetch timeout, 408/504, or transient network failure.
  - Severity: `warning`
  - Alert: no unless it spikes
- `offline_degraded_experience`
  - Offline or degraded app state that should be visible but not noisy.
  - Severity: `warning`
  - Alert: no unless it becomes persistent

## Alert Rules

- Page on:
  - crash spikes
  - repeated backend failures
  - auth or session regressions
  - photo scan / AI Coach / check-in failures that repeat across a release
- Log only:
  - validation/business-rule rejections
  - offline/degraded states
  - one-off network timeouts unless they cluster
- Escalate if:
  - the same route fails repeatedly
  - a release’s crash-free rate drops
  - a high-signal mutation path starts failing after deploy
- Keep low-value noise out of paging so the feed stays actionable.

## Manual Validation

Use the dev-only Settings action:

- Open Settings
- Tap `Send Sentry Test Event`
- Confirm the event arrives in Sentry
- Verify the event tags include `issue_category`, `issue_severity`, `release_channel`, and `app_release`
- Verify the payload redacts auth, cookie, prompt, notes, image, and content fields

## Release Health

- Release health is enabled through Sentry session tracking in the app bootstrap.
- Group data by release, environment, and channel so crash-free rate is meaningful.
- Compare adoption and crash-free sessions across builds before rolling forward.
- Use release health alongside individual errors, not instead of them.
