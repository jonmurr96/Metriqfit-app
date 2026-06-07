import { assertEquals, assertRejects } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { writeV3Plans } from "./v3-writers.ts";

const SPEC: any = {
  workout: { split_family: "full_body" },
  nutrition: {
    meals_per_day: 3,
    training_day: { slots: [], kcal: 2200, protein_g: 160, carbs_g: 240, fat_g: 70 },
    rest_day: { slots: [], kcal: 2000, protein_g: 160, carbs_g: 190, fat_g: 75 },
    hard_exclude_tags: [],
    weekly_food_minimums: [],
  },
};

const PLAN: any = {
  workout_weeks: [{
    week_index: 1,
    workout_days: [{
      weekday: "mon",
      focus: "full_body",
      estimated_minutes: 45,
      exercises: [{
        exercise_id: "ex_1",
        exercise_name: "Bench Press",
        order: 1,
        sets: 3,
        rest_seconds: 90,
        prescription_unit: "reps",
        reps_min: 8,
        reps_max: 10,
      }],
    }],
  }],
  workout_days: [],
  nutrition_days: [{
    weekday: "mon",
    is_training_day: true,
    meals: [{
      slot: "breakfast",
      target_kcal: 500,
      target_protein_g: 40,
      target_carb_g: 60,
      target_fat_g: 12,
      items: [{
        food_id: "food_1",
        food_name: "Greek Yogurt",
        grams: 200,
        kcal: 118,
        protein_g: 20,
        carb_g: 7,
        fat_g: 1,
      }],
      variants: [],
    }],
  }],
};

class FakeSupabase {
  rows: Record<string, any[]> = {};
  deletes: Array<{ table: string; id: string }> = [];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  failInsertTable: string | null = null;
  private idCounter = 0;

  from(table: string) {
    const db = this;
    return {
      insert(row: Record<string, unknown>) {
        if (db.failInsertTable === table) {
          return {
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: `forced ${table} failure` } }),
            }),
            then: (resolve: (value: { data: null; error: { message: string } }) => void) =>
              resolve({ data: null, error: { message: `forced ${table} failure` } }),
          };
        }
        const id = `${table}_${++db.idCounter}`;
        db.rows[table] ||= [];
        db.rows[table].push({ ...row, id });
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id }, error: null }),
          }),
          then: (resolve: (value: { data: { id: string }; error: null }) => void) =>
            resolve({ data: { id }, error: null }),
        };
      },
      select(_columns: string) {
        const builder: any = {
          eq: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          in: (_column: string, ids: string[]) => Promise.resolve({
            data: ids.map((id) => ({ id })),
            error: null,
          }),
        };
        return builder;
      },
      delete() {
        return {
          eq(column: string, id: string) {
            if (column === "id") db.deletes.push({ table, id });
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  }

  rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    return Promise.resolve({ error: null });
  }
}

Deno.test("writeV3Plans stages inactive workout and nutrition plans before atomic promotion", async () => {
  const supabase = new FakeSupabase();
  const result = await writeV3Plans(supabase as any, "user_1", "run_1", SPEC, PLAN, { activate: true });

  assertEquals(supabase.rows.user_workout_plans[0].is_active, false);
  assertEquals(supabase.rows.user_workout_plans[0].lifecycle_state, "preview");
  assertEquals(supabase.rows.user_nutrition_plans[0].is_active, false);
  assertEquals(supabase.rows.user_nutrition_plans[0].lifecycle_state, "preview");
  assertEquals(supabase.rpcCalls.length, 1);
  assertEquals(supabase.rpcCalls[0].name, "promote_generated_plans");
  assertEquals(supabase.rpcCalls[0].args.p_workout_plan_id, result.workoutPlanId);
  assertEquals(supabase.rpcCalls[0].args.p_nutrition_plan_id, result.nutritionPlanId);
});

Deno.test("writeV3Plans cleans staged rows and skips promotion when required content fails", async () => {
  const supabase = new FakeSupabase();
  supabase.failInsertTable = "user_nutrition_plan_meal_variant_items";

  await assertRejects(
    () => writeV3Plans(supabase as any, "user_1", "run_1", SPEC, PLAN, { activate: true }),
    Error,
    "failed to write item",
  );

  assertEquals(supabase.rpcCalls.length, 0);
  assertEquals(
    supabase.deletes.map((entry) => entry.table).sort(),
    ["user_nutrition_plans", "user_workout_plans"],
  );
});
