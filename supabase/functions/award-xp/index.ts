import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface RequestBody {
  userId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}

interface XPEventConfig {
  baseXP: number;
  dailyCap: number;
  eliteBonus: number;
}

// XP values by event type
const XP_CONFIG: Record<string, XPEventConfig> = {
  workout_completed: { baseXP: 100, dailyCap: 200, eliteBonus: 0.2 },
  workout_on_time: { baseXP: 25, dailyCap: 25, eliteBonus: 0 },
  all_sets_completed: { baseXP: 25, dailyCap: 25, eliteBonus: 0 },
  pr_achieved: { baseXP: 50, dailyCap: 300, eliteBonus: 0.5 }, // Compound lifts award more
  meal_logged: { baseXP: 15, dailyCap: 60, eliteBonus: 0.2 },
  daily_calories_met: { baseXP: 50, dailyCap: 50, eliteBonus: 0 },
  daily_macros_met: { baseXP: 75, dailyCap: 75, eliteBonus: 0 },
  water_goal_hit: { baseXP: 25, dailyCap: 25, eliteBonus: 0 },
  weight_logged: { baseXP: 20, dailyCap: 20, eliteBonus: 0 },
  progress_photo: { baseXP: 30, dailyCap: 30, eliteBonus: 0 },
  seven_day_streak: { baseXP: 200, dailyCap: 200, eliteBonus: 0 },
  thirty_day_streak: { baseXP: 1000, dailyCap: 1000, eliteBonus: 0 },
  perfect_week: { baseXP: 300, dailyCap: 300, eliteBonus: 0.5 },
  app_checkin: { baseXP: 10, dailyCap: 10, eliteBonus: 0 },
  ai_coach_interaction: { baseXP: 5, dailyCap: 20, eliteBonus: 0 },
  plan_regeneration: { baseXP: 50, dailyCap: 50, eliteBonus: 0 },
};

// Level thresholds (XP required to reach each level)
const LEVEL_THRESHOLDS = [
  0, 500, 1200, 2000, 3000, 4200, 5600, 7200, 9000, 11000,
  13500, 16200, 19200, 22500, 26000, 30000, 34500, 39500, 45000, 51000,
  58000, 65500, 73500, 82000, 91000, 101000, 112000, 124000, 137000, 151000,
];

function getLevelFromXP(totalXP: number): { level: number; levelName: string; tierName: string; xpForNextLevel: number; xpNeeded: number } {
  let level = 1;
  for (let i = 1; i <= 30; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i - 1]) {
      level = i;
    } else {
      break;
    }
  }

  // Get tier name
  let tierName = "Rookie";
  if (level <= 5) tierName = "Rookie";
  else if (level <= 10) tierName = "Builder";
  else if (level <= 15) tierName = "Athlete";
  else if (level <= 20) tierName = "Elite";
  else if (level <= 25) tierName = "Legend";
  else tierName = "Master";

  const tierLevel = ((level - 1) % 5) + 1;
  const levelName = `${tierName} ${tierLevel}`;

  // Calculate XP needed for next level
  const nextLevelIndex = level < 30 ? level : 29;
  const xpForNextLevel = LEVEL_THRESHOLDS[nextLevelIndex];
  const xpNeeded = level < 30 ? xpForNextLevel - totalXP : 0;

  return { level, levelName, tierName, xpForNextLevel, xpNeeded };
}

function isElitePlan(planType: unknown) {
  return String(planType || "").toLowerCase().startsWith("elite");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
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
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: "Missing eventType" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get event config
    const config = XP_CONFIG[eventType];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown event type: ${eventType}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is Elite subscriber
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

    // Calculate base XP
    let xpAmount = config.baseXP;

    // Apply Elite bonus
    if (isElite && config.eliteBonus > 0) {
      xpAmount = Math.round(xpAmount * (1 + config.eliteBonus));
    }

    // Adjust for special cases
    if (eventType === "pr_achieved" && metadata.exerciseType === "compound") {
      xpAmount = 150; // Compound lifts get more XP
    } else if (eventType === "pr_achieved") {
      xpAmount = 50; // Accessory lifts
    }

    // Check daily cap for this event type
    const today = new Date().toISOString().split("T")[0];
    const { data: todayEvents } = await supabase
      .from("user_xp_events")
      .select("final_xp")
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const todayXPForEvent = todayEvents?.reduce((sum, e) => sum + e.final_xp, 0) || 0;

    if (todayXPForEvent >= config.dailyCap) {
      // Already hit daily cap, award 0 XP
      return new Response(
        JSON.stringify({
          xp_awarded: 0,
          level_up: false,
          reason: "daily_cap_reached",
          message: `You've reached your daily XP cap for ${eventType}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Apply daily cap limit
    const remainingCap = config.dailyCap - todayXPForEvent;
    xpAmount = Math.min(xpAmount, remainingCap);

    // Apply multipliers
    let multiplier = 1.0;

    // Daily Double: +50% if workout + nutrition both completed same day
    if (metadata.dailyDouble) {
      multiplier += 0.5;
    }

    // Triple Threat: +100% if workout + nutrition + water all completed
    if (metadata.tripleTheat) {
      multiplier += 1.0;
    }

    // Consistency Bonus: +10% per consecutive day (max +50%)
    if (metadata.currentStreak && typeof metadata.currentStreak === "number") {
      const streakBonus = Math.min(metadata.currentStreak * 0.1, 0.5);
      multiplier += streakBonus;
    }

    const finalXP = Math.round(xpAmount * multiplier);

    // Get current XP level
    const { data: xpLevel } = await supabase
      .from("user_xp_levels")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!xpLevel) {
      return new Response(
        JSON.stringify({ error: "User XP level not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const newTotalXP = xpLevel.total_xp_earned + finalXP;
    const oldLevelInfo = getLevelFromXP(xpLevel.total_xp_earned);
    const newLevelInfo = getLevelFromXP(newTotalXP);

    const leveledUp = newLevelInfo.level > oldLevelInfo.level;

    // Calculate XP within current level (for progress bar)
    const xpWithinLevel = newTotalXP - LEVEL_THRESHOLDS[newLevelInfo.level - 1];

    // Update user XP level
    const { error: updateError } = await supabase
      .from("user_xp_levels")
      .update({
        current_level: newLevelInfo.level,
        current_xp: xpWithinLevel,
        total_xp_earned: newTotalXP,
        ...(leveledUp ? { level_up_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    // Log XP event
    const { error: logError } = await supabase
      .from("user_xp_events")
      .insert({
        user_id: userId,
        event_type: eventType,
        xp_amount: xpAmount,
        multiplier: multiplier,
        final_xp: finalXP,
        metadata: metadata,
      });

    if (logError) throw logError;

    // Check for achievements unlocked (will be implemented in separate function)
    const achievementsUnlocked: unknown[] = [];

    return new Response(
      JSON.stringify({
        xp_awarded: finalXP,
        level_up: leveledUp,
        old_level: oldLevelInfo.level,
        new_level: newLevelInfo.level,
        old_level_name: oldLevelInfo.levelName,
        new_level_name: newLevelInfo.levelName,
        total_xp: newTotalXP,
        xp_for_next_level: newLevelInfo.xpForNextLevel,
        xp_needed: newLevelInfo.xpNeeded,
        achievements_unlocked: achievementsUnlocked,
        multiplier: multiplier,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in award-xp function:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
