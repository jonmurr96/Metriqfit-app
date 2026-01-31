export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ai_coach_feedback: {
        Row: {
          id: string
          message_id: string
          user_id: string
          rating: number | null
          is_helpful: boolean | null
          feedback_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          rating?: number | null
          is_helpful?: boolean | null
          feedback_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          rating?: number | null
          is_helpful?: boolean | null
          feedback_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_feedback_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "ai_coach_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_feedback_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_coach_messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          context_snapshot: Json | null
          attachments: Json | null
          tokens_input: number | null
          tokens_output: number | null
          model: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          context_snapshot?: Json | null
          attachments?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          model?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          context_snapshot?: Json | null
          attachments?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          model?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_usage_daily: {
        Row: {
          id: string
          user_id: string
          usage_date: string
          coach_messages: number
          plan_regenerations: number
          food_photo_scans: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          usage_date?: string
          coach_messages?: number
          plan_regenerations?: number
          food_photo_scans?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          usage_date?: string
          coach_messages?: number
          plan_regenerations?: number
          food_photo_scans?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      exercises: {
        Row: {
          id: string
          external_id: string
          name: string
          category: string
          equipment_required: string[]
          primary_muscle: string | null
          secondary_muscles: string[]
          pattern: string | null
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null
          instructions: string | null
          video_url: string | null
          image_url: string | null
          is_compound: boolean
          created_at: string
        }
        Insert: {
          id?: string
          external_id: string
          name: string
          category: string
          equipment_required?: string[]
          primary_muscle?: string | null
          secondary_muscles?: string[]
          pattern?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          instructions?: string | null
          video_url?: string | null
          image_url?: string | null
          is_compound?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          name?: string
          category?: string
          equipment_required?: string[]
          primary_muscle?: string | null
          secondary_muscles?: string[]
          pattern?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          instructions?: string | null
          video_url?: string | null
          image_url?: string | null
          is_compound?: boolean
          created_at?: string
        }
        Relationships: []
      }
      food_favorites: {
        Row: {
          id: string
          user_id: string
          food_item_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_item_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_item_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_favorites_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_favorites_food_item_id_fkey"
            columns: ["food_item_id"]
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          }
        ]
      }
      food_items: {
        Row: {
          id: string
          name: string
          brand: string | null
          category: string | null
          calories_per_100g: number
          protein_per_100g: number
          carbs_per_100g: number
          fat_per_100g: number
          fiber_per_100g: number | null
          sugar_per_100g: number | null
          sodium_per_100g: number | null
          serving_size_g: number | null
          serving_description: string | null
          barcode: string | null
          source: 'internal' | 'usda_fdc' | 'openfoodfacts' | 'manual'
          image_url: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          category?: string | null
          calories_per_100g: number
          protein_per_100g: number
          carbs_per_100g: number
          fat_per_100g: number
          fiber_per_100g?: number | null
          sugar_per_100g?: number | null
          sodium_per_100g?: number | null
          serving_size_g?: number | null
          serving_description?: string | null
          barcode?: string | null
          source?: 'internal' | 'usda_fdc' | 'openfoodfacts' | 'manual'
          image_url?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          category?: string | null
          calories_per_100g?: number
          protein_per_100g?: number
          carbs_per_100g?: number
          fat_per_100g?: number
          fiber_per_100g?: number | null
          sugar_per_100g?: number | null
          sodium_per_100g?: number | null
          serving_size_g?: number | null
          serving_description?: string | null
          barcode?: string | null
          source?: 'internal' | 'usda_fdc' | 'openfoodfacts' | 'manual'
          image_url?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_log_items: {
        Row: {
          id: string
          meal_log_id: string
          food_item_id: string
          grams: number
          calories: number
          protein: number
          carbs: number
          fat: number
          created_at: string
        }
        Insert: {
          id?: string
          meal_log_id: string
          food_item_id: string
          grams: number
          calories: number
          protein: number
          carbs: number
          fat: number
          created_at?: string
        }
        Update: {
          id?: string
          meal_log_id?: string
          food_item_id?: string
          grams?: number
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_items_meal_log_id_fkey"
            columns: ["meal_log_id"]
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_items_food_item_id_fkey"
            columns: ["food_item_id"]
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          }
        ]
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          logged_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          logged_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          logged_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      onboarding_answers: {
        Row: {
          id: string
          user_id: string
          answers: Json
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          answers: Json
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          answers?: Json
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_answers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      plan_generation_runs: {
        Row: {
          id: string
          user_id: string
          plan_type: 'workout' | 'nutrition' | 'both'
          status: 'pending' | 'success' | 'failed' | 'validation_failed'
          input_context: Json | null
          ai_response: Json | null
          validation_errors: Json | null
          tokens_used: number | null
          duration_ms: number | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: 'workout' | 'nutrition' | 'both'
          status: 'pending' | 'success' | 'failed' | 'validation_failed'
          input_context?: Json | null
          ai_response?: Json | null
          validation_errors?: Json | null
          tokens_used?: number | null
          duration_ms?: number | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: 'workout' | 'nutrition' | 'both'
          status?: 'pending' | 'success' | 'failed' | 'validation_failed'
          input_context?: Json | null
          ai_response?: Json | null
          validation_errors?: Json | null
          tokens_used?: number | null
          duration_ms?: number | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_generation_runs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          date_of_birth: string | null
          sex: 'male' | 'female' | 'other' | null
          height_cm: number | null
          current_weight_kg: number | null
          unit_system: 'imperial' | 'metric'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          date_of_birth?: string | null
          sex?: 'male' | 'female' | 'other' | null
          height_cm?: number | null
          current_weight_kg?: number | null
          unit_system?: 'imperial' | 'metric'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          date_of_birth?: string | null
          sex?: 'male' | 'female' | 'other' | null
          height_cm?: number | null
          current_weight_kg?: number | null
          unit_system?: 'imperial' | 'metric'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      promo_code_redemptions: {
        Row: {
          id: string
          promo_code_id: string
          user_id: string
          subscription_id: string | null
          redeemed_at: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          user_id: string
          subscription_id?: string | null
          redeemed_at?: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          user_id?: string
          subscription_id?: string | null
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: 'percent' | 'fixed' | 'trial_extension' | null
          discount_value: number | null
          trial_days_extension: number | null
          max_uses: number | null
          current_uses: number
          valid_from: string
          valid_until: string | null
          applicable_plans: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          discount_type?: 'percent' | 'fixed' | 'trial_extension' | null
          discount_value?: number | null
          trial_days_extension?: number | null
          max_uses?: number | null
          current_uses?: number
          valid_from?: string
          valid_until?: string | null
          applicable_plans?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: 'percent' | 'fixed' | 'trial_extension' | null
          discount_value?: number | null
          trial_days_extension?: number | null
          max_uses?: number | null
          current_uses?: number
          valid_from?: string
          valid_until?: string | null
          applicable_plans?: string[]
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          id: string
          session_id: string
          exercise_id: string
          order_index: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          order_index: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string
          order_index?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      step_logs: {
        Row: {
          id: string
          user_id: string
          steps: number
          logged_date: string
          source: 'manual' | 'healthkit' | 'google_fit'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          steps: number
          logged_date?: string
          source?: 'manual' | 'healthkit' | 'google_fit'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          steps?: number
          logged_date?: string
          source?: 'manual' | 'healthkit' | 'google_fit'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_events: {
        Row: {
          id: string
          subscription_id: string
          user_id: string
          event_type: 'created' | 'renewed' | 'cancelled' | 'expired' | 'reactivated' | 'trial_started' | 'trial_ended' | 'upgraded' | 'downgraded' | 'refunded' | 'grace_period_started' | 'grace_period_ended'
          previous_status: string | null
          new_status: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          user_id: string
          event_type: 'created' | 'renewed' | 'cancelled' | 'expired' | 'reactivated' | 'trial_started' | 'trial_ended' | 'upgraded' | 'downgraded' | 'refunded' | 'grace_period_started' | 'grace_period_ended'
          previous_status?: string | null
          new_status?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          user_id?: string
          event_type?: 'created' | 'renewed' | 'cancelled' | 'expired' | 'reactivated' | 'trial_started' | 'trial_ended' | 'upgraded' | 'downgraded' | 'refunded' | 'grace_period_started' | 'grace_period_ended'
          previous_status?: string | null
          new_status?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          instructions: string | null
          serving_size: number
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          instructions?: string | null
          serving_size?: number
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          instructions?: string | null
          serving_size?: number
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          food_item_id: string
          quantity_grams: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          food_item_id: string
          quantity_grams: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          food_item_id?: string
          quantity_grams?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_food_item_id_fkey"
            columns: ["food_item_id"]
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          revenuecat_customer_id: string | null
          plan_type: 'free' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime'
          status: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period'
          started_at: string | null
          expires_at: string | null
          trial_ends_at: string | null
          cancelled_at: string | null
          auto_renew: boolean
          platform: 'ios' | 'android' | 'web' | 'stripe' | null
          original_purchase_date: string | null
          product_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          revenuecat_customer_id?: string | null
          plan_type?: 'free' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime'
          status?: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period'
          started_at?: string | null
          expires_at?: string | null
          trial_ends_at?: string | null
          cancelled_at?: string | null
          auto_renew?: boolean
          platform?: 'ios' | 'android' | 'web' | 'stripe' | null
          original_purchase_date?: string | null
          product_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          revenuecat_customer_id?: string | null
          plan_type?: 'free' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime'
          status?: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period'
          started_at?: string | null
          expires_at?: string | null
          trial_ends_at?: string | null
          cancelled_at?: string | null
          auto_renew?: boolean
          platform?: 'ios' | 'android' | 'web' | 'stripe' | null
          original_purchase_date?: string | null
          product_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_measurements: {
        Row: {
          id: string
          user_id: string
          weight_kg: number
          body_fat_percentage: number | null
          waist_cm: number | null
          chest_cm: number | null
          arms_cm: number | null
          thighs_cm: number | null
          hips_cm: number | null
          notes: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight_kg: number
          body_fat_percentage?: number | null
          waist_cm?: number | null
          chest_cm?: number | null
          arms_cm?: number | null
          thighs_cm?: number | null
          hips_cm?: number | null
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight_kg?: number
          body_fat_percentage?: number | null
          waist_cm?: number | null
          chest_cm?: number | null
          arms_cm?: number | null
          thighs_cm?: number | null
          hips_cm?: number | null
          notes?: string | null
          logged_at?: string
          created_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "user_measurements_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_nutrition_plan_meals: {
        Row: {
          id: string
          plan_id: string
          meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          day_of_week: number | null
          name: string
          description: string | null
          target_calories: number | null
          target_protein: number | null
          target_carbs: number | null
          target_fat: number | null
          recipe_url: string | null
          prep_time_min: number | null
          is_user_modified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          day_of_week?: number | null
          name: string
          description?: string | null
          target_calories?: number | null
          target_protein?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          recipe_url?: string | null
          prep_time_min?: number | null
          is_user_modified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          day_of_week?: number | null
          name?: string
          description?: string | null
          target_calories?: number | null
          target_protein?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          recipe_url?: string | null
          prep_time_min?: number | null
          is_user_modified?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_plan_meals_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "user_nutrition_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      user_nutrition_plans: {
        Row: {
          id: string
          user_id: string
          generation_run_id: string | null
          version: number
          is_active: boolean
          name: string
          description: string | null
          meal_structure: Json
          macro_distribution: Json | null
          dietary_preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          generation_run_id?: string | null
          version?: number
          is_active?: boolean
          name: string
          description?: string | null
          meal_structure?: Json
          macro_distribution?: Json | null
          dietary_preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          generation_run_id?: string | null
          version?: number
          is_active?: boolean
          name?: string
          description?: string | null
          meal_structure?: Json
          macro_distribution?: Json | null
          dietary_preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_plans_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nutrition_plans_generation_run_id_fkey"
            columns: ["generation_run_id"]
            referencedRelation: "plan_generation_runs"
            referencedColumns: ["id"]
          }
        ]
      }
      user_prs: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          weight_lb: number
          reps: number
          estimated_1rm: number | null
          achieved_at: string
          set_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          weight_lb: number
          reps: number
          estimated_1rm?: number | null
          achieved_at?: string
          set_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string
          weight_lb?: number
          reps?: number
          estimated_1rm?: number | null
          achieved_at?: string
          set_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_prs_exercise_id_fkey"
            columns: ["exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_prs_set_id_fkey"
            columns: ["set_id"]
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          }
        ]
      }
      user_targets: {
        Row: {
          id: string
          user_id: string
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          fiber_g: number | null
          water_ml: number
          computation_method: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          fiber_g?: number | null
          water_ml?: number
          computation_method?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          fiber_g?: number | null
          water_ml?: number
          computation_method?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_targets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_workout_plan_days: {
        Row: {
          id: string
          plan_id: string
          day_number: number
          scheduled_date: string | null
          name: string
          focus: string | null
          is_completed: boolean
          completed_at: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          day_number: number
          scheduled_date?: string | null
          name: string
          focus?: string | null
          is_completed?: boolean
          completed_at?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          day_number?: number
          scheduled_date?: string | null
          name?: string
          focus?: string | null
          is_completed?: boolean
          completed_at?: string | null
          session_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "user_workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plan_days_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      user_workout_plan_exercises: {
        Row: {
          id: string
          plan_day_id: string
          exercise_id: string
          order_index: number
          sets_target: number
          reps_min: number
          reps_max: number
          rest_seconds: number | null
          tempo: string | null
          user_notes: string | null
          is_user_modified: boolean
          original_exercise_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_day_id: string
          exercise_id: string
          order_index: number
          sets_target?: number
          reps_min?: number
          reps_max?: number
          rest_seconds?: number | null
          tempo?: string | null
          user_notes?: string | null
          is_user_modified?: boolean
          original_exercise_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_day_id?: string
          exercise_id?: string
          order_index?: number
          sets_target?: number
          reps_min?: number
          reps_max?: number
          rest_seconds?: number | null
          tempo?: string | null
          user_notes?: string | null
          is_user_modified?: boolean
          original_exercise_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_plan_exercises_plan_day_id_fkey"
            columns: ["plan_day_id"]
            referencedRelation: "user_workout_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plan_exercises_original_exercise_id_fkey"
            columns: ["original_exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      user_workout_plans: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          generation_run_id: string | null
          version: number
          is_active: boolean
          name: string
          description: string | null
          start_date: string
          end_date: string | null
          days_per_week: number
          current_week: number | null
          total_weeks: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          generation_run_id?: string | null
          version?: number
          is_active?: boolean
          name: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          days_per_week?: number
          current_week?: number | null
          total_weeks?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          generation_run_id?: string | null
          version?: number
          is_active?: boolean
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          days_per_week?: number
          current_week?: number | null
          total_weeks?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_plans_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plans_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plans_generation_run_id_fkey"
            columns: ["generation_run_id"]
            referencedRelation: "plan_generation_runs"
            referencedColumns: ["id"]
          }
        ]
      }
      water_logs: {
        Row: {
          id: string
          user_id: string
          amount_ml: number
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_ml: number
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount_ml?: number
          logged_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          template_day_id: string | null
          plan_day_id: string | null
          name: string
          started_at: string
          finished_at: string | null
          duration_seconds: number | null
          notes: string | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_day_id?: string | null
          plan_day_id?: string | null
          name: string
          started_at?: string
          finished_at?: string | null
          duration_seconds?: number | null
          notes?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_day_id?: string | null
          plan_day_id?: string | null
          name?: string
          started_at?: string
          finished_at?: string | null
          duration_seconds?: number | null
          notes?: string | null
          rating?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_template_day_id_fkey"
            columns: ["template_day_id"]
            referencedRelation: "workout_template_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_workout_sessions_plan_day"
            columns: ["plan_day_id"]
            referencedRelation: "user_workout_plan_days"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_sets: {
        Row: {
          id: string
          session_exercise_id: string
          set_number: number
          reps: number
          weight_lb: number | null
          rpe: number | null
          is_warmup: boolean
          is_pr: boolean
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          session_exercise_id: string
          set_number: number
          reps: number
          weight_lb?: number | null
          rpe?: number | null
          is_warmup?: boolean
          is_pr?: boolean
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_exercise_id?: string
          set_number?: number
          reps?: number
          weight_lb?: number | null
          rpe?: number | null
          is_warmup?: boolean
          is_pr?: boolean
          logged_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_template_days: {
        Row: {
          id: string
          template_id: string
          day_number: number
          name: string
          focus: string | null
          estimated_duration_min: number | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          day_number: number
          name: string
          focus?: string | null
          estimated_duration_min?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          day_number?: number
          name?: string
          focus?: string | null
          estimated_duration_min?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_days_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_template_exercises: {
        Row: {
          id: string
          template_day_id: string
          exercise_id: string
          order_index: number
          sets_target: number
          reps_min: number
          reps_max: number
          rest_seconds: number | null
          tempo: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_day_id: string
          exercise_id: string
          order_index: number
          sets_target?: number
          reps_min?: number
          reps_max?: number
          rest_seconds?: number | null
          tempo?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_day_id?: string
          exercise_id?: string
          order_index?: number
          sets_target?: number
          reps_min?: number
          reps_max?: number
          rest_seconds?: number | null
          tempo?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_template_day_id_fkey"
            columns: ["template_day_id"]
            referencedRelation: "workout_template_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_templates: {
        Row: {
          id: string
          external_id: string
          name: string
          description: string | null
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null
          duration_weeks: number | null
          days_per_week: number
          equipment_required: string[]
          goal_tags: string[]
          target_audience: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id: string
          name: string
          description?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          duration_weeks?: number | null
          days_per_week: number
          equipment_required?: string[]
          goal_tags?: string[]
          target_audience?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          name?: string
          description?: string | null
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
          duration_weeks?: number | null
          days_per_week?: number
          equipment_required?: string[]
          goal_tags?: string[]
          target_audience?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_estimated_1rm: {
        Args: {
          weight: number
          reps: number
        }
        Returns: number
      }
      check_ai_quota: {
        Args: {
          p_user_id: string
          p_usage_type: string
          p_is_elite?: boolean
        }
        Returns: boolean
      }
      get_ai_usage_summary: {
        Args: {
          p_user_id: string
        }
        Returns: {
          usage_type: string
          used: number
          limit_free: number
          remaining: number
        }[]
      }
      get_subscription_details: {
        Args: {
          p_user_id: string
        }
        Returns: {
          subscription_id: string
          plan_type: string
          status: string
          is_elite: boolean
          is_trialing: boolean
          days_remaining: number | null
          trial_days_remaining: number | null
          auto_renew: boolean
        }[]
      }
      increment_ai_usage: {
        Args: {
          p_user_id: string
          p_usage_type: string
        }
        Returns: Database['public']['Tables']['ai_usage_daily']['Row']
      }
      is_elite_user: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      redeem_promo_code: {
        Args: {
          p_user_id: string
          p_code: string
        }
        Returns: {
          success: boolean
          message: string
          discount_type: string | null
          discount_value: number | null
          trial_days_extension: number | null
        }[]
      }
      upsert_subscription: {
        Args: {
          p_user_id: string
          p_plan_type: string
          p_status: string
          p_expires_at?: string | null
          p_trial_ends_at?: string | null
          p_revenuecat_customer_id?: string | null
          p_platform?: string | null
          p_product_id?: string | null
        }
        Returns: Database['public']['Tables']['subscriptions']['Row']
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
