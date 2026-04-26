import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface RequestBody {
  userId: string;
  streakType: "fitness" | "workout" | "nutrition" | "hydration" | "weigh_in";
  activityDate: string; // ISO date string (YYYY-MM-DD)
  useFreezeToken?: boolean;
}

interface StreakUpdateResult {
  success: boolean;
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  status: "continued" | "broken" | "frozen" | "started";
  freeze_tokens_remaining: number;
  message: string;
}

function buildEmptyStreak(userId: string, streakType: RequestBody["streakType"]) {
  return {
    user_id: userId,
    streak_type: streakType,
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
    freeze_tokens: 0,
  };
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

function dateDiff(date1: Date, date2: Date): number {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: RequestBody = await req.json();
    const { userId, streakType, activityDate, useFreezeToken = false } = body;

    if (!userId || !streakType || !activityDate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get current streak data, creating an empty row on demand for first-time users
    let { data: streak, error: fetchError } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .eq("streak_type", streakType)
      .single();

    if (fetchError?.code === "PGRST116" || !streak) {
      const { data: createdStreak, error: insertError } = await supabase
        .from("user_streaks")
        .insert(buildEmptyStreak(userId, streakType))
        .select("*")
        .single();

      if (insertError) {
        throw insertError;
      }

      streak = createdStreak;
      fetchError = null;
    }

    if (fetchError || !streak) {
      throw fetchError ?? new Error("Streak not found");
    }

    const activityDateObj = parseDate(activityDate);
    const lastActivityDate = streak.last_activity_date
      ? parseDate(streak.last_activity_date)
      : null;

    let currentStreak = streak.current_streak;
    let longestStreak = streak.longest_streak;
    let freezeTokens = streak.freeze_tokens;
    let status: "continued" | "broken" | "frozen" | "started" = "continued";
    let message = "";

    // Check if this is the first activity
    if (!lastActivityDate) {
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      status = "started";
      message = `Started ${streakType} streak!`;
    } else {
      const daysSinceLastActivity = dateDiff(activityDateObj, lastActivityDate);

      if (daysSinceLastActivity === 0) {
        // Same day activity - no change to streak
        message = `Streak maintained at ${currentStreak} days`;
      } else if (daysSinceLastActivity === 1) {
        // Consecutive day - increment streak
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
        status = "continued";
        message = `Streak continued! ${currentStreak} days`;

        // Award freeze token every 7 days
        if (currentStreak % 7 === 0) {
          freezeTokens = Math.min(freezeTokens + 1, 10); // Max 10 tokens
        }
      } else {
        // Streak broken (more than 1 day gap)
        // Check if user wants to use freeze token
        if (useFreezeToken && freezeTokens > 0) {
          // Use freeze token to preserve streak
          freezeTokens -= 1;
          status = "frozen";
          message = `Streak preserved with freeze token! ${currentStreak} days. ${freezeTokens} tokens remaining.`;

          // Log freeze usage
          await supabase.from("user_streak_freezes").insert({
            user_id: userId,
            streak_type: streakType,
            frozen_date: activityDate,
          });
        } else {
          // Streak broken, reset to 1
          currentStreak = 1;
          status = "broken";
          message = `Streak broken. Starting fresh at 1 day. Previous best: ${longestStreak} days.`;
        }
      }
    }

    // Update streak in database
    const { error: updateError } = await supabase
      .from("user_streaks")
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: activityDate,
        freeze_tokens: freezeTokens,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("streak_type", streakType);

    if (updateError) throw updateError;

    // Check for streak milestone achievements
    const milestoneReached = checkStreakMilestone(currentStreak);

    const result: StreakUpdateResult = {
      success: true,
      streak_type: streakType,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      status,
      freeze_tokens_remaining: freezeTokens,
      message,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in update-streak function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function checkStreakMilestone(streakLength: number): string | null {
  const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
  if (milestones.includes(streakLength)) {
    return `${streakLength}_day_streak`;
  }
  return null;
}
