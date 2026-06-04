// Deterministic snapshot harness for the plan engine.
//
// Snapshots are stored as pretty-printed canonical JSON: keys are sorted
// recursively (matching the algorithm in UserState.ts canonicalJson) so two
// runs across machines/runtimes produce byte-identical output.
//
// Usage in tests:
//   await assertSnapshot("p01_user_state", state, "lib/personas/__snapshots__");
//
// Set UPDATE_SNAPSHOTS=1 to (re)write snapshots instead of comparing.

import { dirname, join } from "https://deno.land/std@0.220.0/path/mod.ts";

// -------- Canonical pretty-printed JSON --------
//
// Same key-ordering as UserState.canonicalJson, but human-readable (2-space
// indent) so diffs in PRs are reviewable. Crucially, encoding is identical
// across runtimes — we do not delegate to JSON.stringify with a replacer
// because object key order is not guaranteed by the spec.

function encodeIndented(value: unknown, indent: string, depth: number): string {
  // Treat undefined as null — matches JSON.stringify behavior for array slots.
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("non-finite number in canonical snapshot");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }

  const pad = indent.repeat(depth);
  const padInner = indent.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => `${padInner}${encodeIndented(v, indent, depth + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Drop keys whose value is undefined — matches JSON.stringify.
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    if (keys.length === 0) return "{}";
    const items = keys.map((k) =>
      `${padInner}${JSON.stringify(k)}: ${encodeIndented(obj[k], indent, depth + 1)}`
    );
    return `{\n${items.join(",\n")}\n${pad}}`;
  }

  throw new Error(`unsupported value in canonical snapshot: ${typeof value}`);
}

export function canonicalSnapshot(value: unknown): string {
  return encodeIndented(value, "  ", 0) + "\n";
}

// -------- Diff (minimal unified-style for readable assert failures) --------

function diff(expected: string, actual: string): string {
  const expLines = expected.split("\n");
  const actLines = actual.split("\n");
  const max = Math.max(expLines.length, actLines.length);
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const e = expLines[i];
    const a = actLines[i];
    if (e === a) {
      out.push(`  ${e ?? ""}`);
    } else {
      if (e !== undefined) out.push(`- ${e}`);
      if (a !== undefined) out.push(`+ ${a}`);
    }
  }
  return out.join("\n");
}

// -------- Filesystem helpers --------

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await Deno.stat(path);
    return info.isFile;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

async function ensureDir(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch (err) {
    if (!(err instanceof Deno.errors.AlreadyExists)) throw err;
  }
}

// -------- Public API --------

function shouldUpdate(): boolean {
  try {
    return Deno.env.get("UPDATE_SNAPSHOTS") === "1";
  } catch {
    // env permission denied — treat as not-updating
    return false;
  }
}

export async function assertSnapshot(
  name: string,
  value: unknown,
  snapshotDir: string,
): Promise<void> {
  const path = join(snapshotDir, `${name}.snap.json`);
  const next = canonicalSnapshot(value);

  const exists = await fileExists(path);
  if (!exists || shouldUpdate()) {
    await ensureDir(dirname(path));
    await Deno.writeTextFile(path, next);
    return;
  }

  const prev = await Deno.readTextFile(path);
  if (prev === next) return;

  const message =
    `snapshot mismatch for "${name}"\n` +
    `path: ${path}\n` +
    `--- expected\n+++ actual\n${diff(prev, next)}\n` +
    `(re-run with UPDATE_SNAPSHOTS=1 to accept)`;
  throw new Error(message);
}
