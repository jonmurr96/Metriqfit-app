// Deno test: validates the snapshot harness itself.
// Run with:
//   deno test lib/spec/snapshot_test.ts --allow-read --allow-write --allow-env --no-check

import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import { assertSnapshot, canonicalSnapshot } from "./snapshot.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "snapshot_test_" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("canonicalSnapshot sorts keys deterministically", () => {
  const a = canonicalSnapshot({ b: 1, a: 2, c: { y: 1, x: 2 } });
  const b = canonicalSnapshot({ c: { x: 2, y: 1 }, a: 2, b: 1 });
  assertEquals(a, b);
});

Deno.test("canonicalSnapshot emits pretty-printed JSON with trailing newline", () => {
  const out = canonicalSnapshot({ a: 1, b: [2, 3] });
  assertEquals(
    out,
    `{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}\n`,
  );
});

Deno.test("canonicalSnapshot handles empty objects and arrays", () => {
  assertEquals(canonicalSnapshot({}), "{}\n");
  assertEquals(canonicalSnapshot([]), "[]\n");
});

Deno.test("assertSnapshot writes on first run, then reads identical bytes", async () => {
  await withTempDir(async (dir) => {
    const value = { goal: "lose_weight", days: ["mon", "wed", "fri"] };
    // first run — file doesn't exist → write
    await assertSnapshot("roundtrip", value, dir);
    const path = `${dir}/roundtrip.snap.json`;
    const written = await Deno.readTextFile(path);
    assertEquals(written, canonicalSnapshot(value));
    // second run — file exists, identical value → no throw
    await assertSnapshot("roundtrip", value, dir);
  });
});

Deno.test("assertSnapshot throws useful diff on mismatch", async () => {
  await withTempDir(async (dir) => {
    await assertSnapshot("mismatch", { goal: "lose_weight" }, dir);
    await assertRejects(
      async () => {
        await assertSnapshot("mismatch", { goal: "gain_muscle" }, dir);
      },
      Error,
      "snapshot mismatch",
    );
    // Verify the error contains both old and new values for readability.
    try {
      await assertSnapshot("mismatch", { goal: "gain_muscle" }, dir);
      throw new Error("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      assertStringIncludes(msg, "lose_weight");
      assertStringIncludes(msg, "gain_muscle");
      assertStringIncludes(msg, "UPDATE_SNAPSHOTS=1");
    }
  });
});

Deno.test("UPDATE_SNAPSHOTS=1 overwrites existing snapshot", async () => {
  await withTempDir(async (dir) => {
    await assertSnapshot("overwrite", { v: 1 }, dir);
    Deno.env.set("UPDATE_SNAPSHOTS", "1");
    try {
      await assertSnapshot("overwrite", { v: 2 }, dir);
    } finally {
      Deno.env.delete("UPDATE_SNAPSHOTS");
    }
    const path = `${dir}/overwrite.snap.json`;
    const written = await Deno.readTextFile(path);
    assertEquals(written, canonicalSnapshot({ v: 2 }));
  });
});

Deno.test("assertSnapshot creates missing snapshot directories", async () => {
  await withTempDir(async (dir) => {
    const nested = `${dir}/a/b/c`;
    await assertSnapshot("nested", { hello: "world" }, nested);
    const written = await Deno.readTextFile(`${nested}/nested.snap.json`);
    assertEquals(written, canonicalSnapshot({ hello: "world" }));
  });
});
