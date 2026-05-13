import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface RequestBody {
  userId?: string;
  eventType?: string; // Optional: filter achievements by event type
  metadata?: Record<string, unknown>;
}

interface Achievement {
  id: string;
  external_id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  xp_reward: number;
  tier: string;
  rarity: string;
  unlock_condition: {
    type: string;
    threshold: number;
    metadata?: Record<string, unknown>;
  };
}

interface UnlockedAchievement extends Achievement {
  unlocked_at: string;
  progress_percentage: number;
}

function isElitePlan(planType: unknown) {
  return String(planType || "").toLowerCase().startsWith("elite");
}

async function checkWorkoutCountAchievements(
  supabase: any,
  userId: string,
  threshold: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .not("finished_at", "is", null);

  if (error) throw error;
  return (data?.length || 0) >= threshold;
}

async function checkMealCountAchievements(
  supabase: any,
  userId: string,
  threshold: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId);

  if (error) throw error;
  return (data?.length || 0) >= threshold;
}

async function checkStreakLengthAchievements(
  supabase: any,
  userId: string,
  threshold: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .order("current_streak", { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxStreak = data?.[0]?.current_streak || 0;
  return maxStreak >= threshold;
}

async function checkPRCountAchievements(
  supabase: any,
  userId: string,
  threshold: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_prs")
    .select("id", { count: "exact" })
    .eq("user_id", userId);

  if (error) throw error;
  return (data?.length || 0) >= threshold;
}

async function checkWorkoutsPerWeekAchievements(
  supabase: any,
  userId: string,
  threshold: number
): Promise<boolean> {
  // Check last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .gte("finished_at", sevenDaysAgo.toISOString());

  if (error) throw error;
  return (data?.length || 0) >= threshold;
}

async function checkTripleThreatDayAchievements(
  supabase: any,
  userId: string
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  // Check if workout completed today
  const { data: workouts } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .gte("finished_at", `${today}T00:00:00Z`)
    .lt("finished_at", `${today}T23:59:59Z`)
    .limit(1);

  // Check if 3+ meals logged today
  const { data: meals } = await supabase
    .from("meal_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("date", today);

  // Check if water goal hit today
  const { data: targets } = await supabase
    .from("user_targets")
    .select("water_ml")
    .eq("user_id", userId)
    .single();

  const { data: waterLogs } = await supabase
    .from("water_logs")
    .select("amount_ml")
    .eq("user_id", userId)
    .eq("date", today);

  const totalWater = waterLogs?.reduce(
    (sum: number, log: { amount_ml?: number | null }) => sum + (log.amount_ml || 0),
    0,
  ) || 0;
  const waterGoalMet = totalWater >= (targets?.water_ml || 0) * 0.8; // 80% threshold

  return (workouts?.length || 0) > 0 && (meals?.length || 0) >= 3 && waterGoalMet;
}

async function evaluateUnlockCondition(
  supabase: any,
  userId: string,
  achievement: Achievement
): Promise<boolean> {
  const { type, threshold } = achievement.unlock_condition;

  switch (type) {
    case "workout_count":
      return await checkWorkoutCountAchievements(supabase, userId, threshold);

    case "meal_count":
      return await checkMealCountAchievements(supabase, userId, threshold);

    case "streak_length":
      return await checkStreakLengthAchievements(supabase, userId, threshold);

    case "pr_count":
      return await checkPRCountAchievements(supabase, userId, threshold);

    case "workouts_per_week":
      return await checkWorkoutsPerWeekAchievements(supabase, userId, threshold);

    case "triple_threat_day":
      return await checkTripleThreatDayAchievements(supabase, userId);

    default:
      return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const body: RequestBody = await req.json();
    const { eventType, metadata = {} } = body;
    const userId = body.userId || authData.user.id;

    if (userId !== authData.user.id) {
      return new Response(
        JSON.stringify({ error: "User mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get all achievement definitions
    const { data: allAchievements, error: fetchError } = await supabase
      .from("achievement_definitions")
      .select("*")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    // Get already unlocked achievements for this user
    const { data: unlockedAchievements } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const unlockedIds = new Set(
      unlockedAchievements?.map((a) => a.achievement_id) || []
    );

    // Check user subscription tier
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status, expires_at, trial_ends_at")
      .eq("user_id", userId)
      .in("status", ["active", "trial", "grace_period"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();
    const expiresAt = subscription?.expires_at ? new Date(String(subscription.expires_at)).getTime() : null;
    const trialEndsAt = subscription?.trial_ends_at ? new Date(String(subscription.trial_ends_at)).getTime() : null;
    const isTrialing = subscription?.status === "trial" && trialEndsAt !== null && trialEndsAt > now;
    const isCurrent = Boolean(subscription && (subscription.status === "active" || subscription.status === "grace_period" || isTrialing) && (expiresAt === null || expiresAt > now || isTrialing));
    const isElite = isCurrent && isElitePlan(subscription?.plan_type);

    // Filter achievements to check
    const achievementsToCheck = allAchievements.filter((achievement: Achievement) => {
      // Skip already unlocked
      if (unlockedIds.has(achievement.id)) return false;

      // Skip Elite-only achievements if user is not Elite
      if (achievement.tier === "elite" && !isElite) return false;

      return true;
    });

    // Evaluate each achievement
    const newlyUnlocked: UnlockedAchievement[] = [];

    for (const achievement of achievementsToCheck) {
      const unlocked = await evaluateUnlockCondition(supabase, userId, achievement);

      if (unlocked) {
        // Insert into user_achievements
        const { error: insertError } = await supabase
          .from("user_achievements")
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            progress_percentage: 100,
            metadata: {},
          });

        if (!insertError) {
          newlyUnlocked.push({
            ...achievement,
            unlocked_at: new Date().toISOString(),
            progress_percentage: 100,
          });
        }
      }
    }

    // Award XP for each newly unlocked achievement
    for (const achievement of newlyUnlocked) {
      // Log XP event
      await supabase.from("user_xp_events").insert({
        user_id: userId,
        event_type: "achievement_unlocked",
        xp_amount: achievement.xp_reward,
        multiplier: 1.0,
        final_xp: achievement.xp_reward,
        metadata: {
          achievement_id: achievement.id,
          achievement_name: achievement.name,
        },
      });

      // Update user XP level
      const { data: xpLevel } = await supabase
        .from("user_xp_levels")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (xpLevel) {
        const newTotalXP = xpLevel.total_xp_earned + achievement.xp_reward;

        await supabase
          .from("user_xp_levels")
          .update({
            current_xp: newTotalXP,
            total_xp_earned: newTotalXP,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }
    }

    return new Response(
      JSON.stringify({
        achievements_unlocked: newlyUnlocked.length,
        achievements: newlyUnlocked,
        total_xp_awarded: newlyUnlocked.reduce((sum, a) => sum + a.xp_reward, 0),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-achievements function:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
