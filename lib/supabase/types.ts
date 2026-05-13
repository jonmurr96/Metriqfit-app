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
          thread_id: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          context_snapshot: Json | null
          attachments: Json | null
          tokens_input: number | null
          tokens_output: number | null
          model: string | null
          intent_mode: string | null
          intent_confidence: number | null
          tool_calls_json: Json | null
          web_used: boolean
          approval_required: boolean
          proposal_id: string | null
          receipt_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          thread_id?: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          context_snapshot?: Json | null
          attachments?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          model?: string | null
          intent_mode?: string | null
          intent_confidence?: number | null
          tool_calls_json?: Json | null
          web_used?: boolean
          approval_required?: boolean
          proposal_id?: string | null
          receipt_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          thread_id?: string | null
          role?: 'user' | 'assistant' | 'system'
          content?: string
          context_snapshot?: Json | null
          attachments?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          model?: string | null
          intent_mode?: string | null
          intent_confidence?: number | null
          tool_calls_json?: Json | null
          web_used?: boolean
          approval_required?: boolean
          proposal_id?: string | null
          receipt_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_messages_proposal_id_fkey"
            columns: ["proposal_id"]
            referencedRelation: "ai_coach_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_messages_receipt_id_fkey"
            columns: ["receipt_id"]
            referencedRelation: "ai_coach_tool_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_messages_thread_id_fkey"
            columns: ["thread_id"]
            referencedRelation: "ai_coach_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_coach_threads: {
        Row: {
          id: string
          user_id: string
          title: string
          title_source: 'auto' | 'user' | 'model'
          last_message_preview: string | null
          last_intent_mode: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          title_source?: 'auto' | 'user' | 'model'
          last_message_preview?: string | null
          last_intent_mode?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          title_source?: 'auto' | 'user' | 'model'
          last_message_preview?: string | null
          last_intent_mode?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_threads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_coach_action_proposals: {
        Row: {
          id: string
          user_id: string
          thread_id: string
          source_message_id: string | null
          tool_name: string
          tool_input_json: Json
          risk_level: 'low' | 'medium' | 'high'
          status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired'
          summary: string
          receipt_json: Json | null
          created_at: string
          updated_at: string
          approved_at: string | null
          rejected_at: string | null
          executed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          thread_id: string
          source_message_id?: string | null
          tool_name: string
          tool_input_json?: Json
          risk_level: 'low' | 'medium' | 'high'
          status?: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired'
          summary: string
          receipt_json?: Json | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          rejected_at?: string | null
          executed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          thread_id?: string
          source_message_id?: string | null
          tool_name?: string
          tool_input_json?: Json
          risk_level?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired'
          summary?: string
          receipt_json?: Json | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          rejected_at?: string | null
          executed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_action_proposals_source_message_id_fkey"
            columns: ["source_message_id"]
            referencedRelation: "ai_coach_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_action_proposals_thread_id_fkey"
            columns: ["thread_id"]
            referencedRelation: "ai_coach_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_action_proposals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_coach_tool_receipts: {
        Row: {
          id: string
          user_id: string
          thread_id: string
          proposal_id: string | null
          tool_name: string
          mutation_level: 'none' | 'low' | 'medium' | 'high'
          summary: string
          metadata_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          thread_id: string
          proposal_id?: string | null
          tool_name: string
          mutation_level: 'none' | 'low' | 'medium' | 'high'
          summary: string
          metadata_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          thread_id?: string
          proposal_id?: string | null
          tool_name?: string
          mutation_level?: 'none' | 'low' | 'medium' | 'high'
          summary?: string
          metadata_json?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_tool_receipts_proposal_id_fkey"
            columns: ["proposal_id"]
            referencedRelation: "ai_coach_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_tool_receipts_thread_id_fkey"
            columns: ["thread_id"]
            referencedRelation: "ai_coach_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_tool_receipts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_coach_memory_items: {
        Row: {
          id: string
          user_id: string
          source_message_id: string | null
          thread_id: string | null
          proposal_id: string | null
          memory_type: 'goal' | 'constraint' | 'preference' | 'commitment' | 'summary' | 'intervention'
          title: string
          body: string
          status: 'active' | 'resolved' | 'dismissed'
          priority: number
          metadata_json: Json | null
          origin_type: 'derived' | 'conversation' | 'tool' | 'profile'
          scope: 'global' | 'nutrition' | 'workout' | 'settings' | 'conversation'
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          source_message_id?: string | null
          thread_id?: string | null
          proposal_id?: string | null
          memory_type: 'goal' | 'constraint' | 'preference' | 'commitment' | 'summary' | 'intervention'
          title: string
          body: string
          status?: 'active' | 'resolved' | 'dismissed'
          priority?: number
          metadata_json?: Json | null
          origin_type?: 'derived' | 'conversation' | 'tool' | 'profile'
          scope?: 'global' | 'nutrition' | 'workout' | 'settings' | 'conversation'
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          source_message_id?: string | null
          thread_id?: string | null
          proposal_id?: string | null
          memory_type?: 'goal' | 'constraint' | 'preference' | 'commitment' | 'summary' | 'intervention'
          title?: string
          body?: string
          status?: 'active' | 'resolved' | 'dismissed'
          priority?: number
          metadata_json?: Json | null
          origin_type?: 'derived' | 'conversation' | 'tool' | 'profile'
          scope?: 'global' | 'nutrition' | 'workout' | 'settings' | 'conversation'
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_memory_items_proposal_id_fkey"
            columns: ["proposal_id"]
            referencedRelation: "ai_coach_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_memory_items_source_message_id_fkey"
            columns: ["source_message_id"]
            referencedRelation: "ai_coach_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_memory_items_thread_id_fkey"
            columns: ["thread_id"]
            referencedRelation: "ai_coach_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_coach_memory_items_user_id_fkey"
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
          recipe_url_imports: number
          menu_scans: number
          meal_builder_runs: number
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
          recipe_url_imports?: number
          menu_scans?: number
          meal_builder_runs?: number
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
          recipe_url_imports?: number
          menu_scans?: number
          meal_builder_runs?: number
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
          source_provider: string
          source_id: string | null
          body_part: string | null
          target_muscle: string | null
          instruction_steps: unknown
          gif_url: string | null
          poster_url: string | null
          is_reference_only: boolean
          has_media: boolean
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
          source_provider?: string
          source_id?: string | null
          body_part?: string | null
          target_muscle?: string | null
          instruction_steps?: unknown
          gif_url?: string | null
          poster_url?: string | null
          is_reference_only?: boolean
          has_media?: boolean
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
          source_provider?: string
          source_id?: string | null
          body_part?: string | null
          target_muscle?: string | null
          instruction_steps?: unknown
          gif_url?: string | null
          poster_url?: string | null
          is_reference_only?: boolean
          has_media?: boolean
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
          created_by_user_id: string | null
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
          created_by_user_id?: string | null
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
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          generation_version: number
          planner_mode: 'deterministic' | 'ai' | 'hybrid'
          warnings_json: Json | null
          error_step: string | null
          error_code: string | null
          error_context: Json | null
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
          generation_version?: number
          planner_mode?: 'deterministic' | 'ai' | 'hybrid'
          warnings_json?: Json | null
          error_step?: string | null
          error_code?: string | null
          error_context?: Json | null
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
          generation_version?: number
          planner_mode?: 'deterministic' | 'ai' | 'hybrid'
          warnings_json?: Json | null
          error_step?: string | null
          error_code?: string | null
          error_context?: Json | null
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
          meal_times: Json | null
          notification_preferences: Json | null
          display_preferences: Json | null
          push_token: string | null
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
          meal_times?: Json | null
          notification_preferences?: Json | null
          display_preferences?: Json | null
          push_token?: string | null
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
          meal_times?: Json | null
          notification_preferences?: Json | null
          display_preferences?: Json | null
          push_token?: string | null
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
          sets_target: number
          reps_min: number | null
          reps_max: number | null
          rest_seconds: number | null
          plan_exercise_id: string | null
          technique_snapshot_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_id: string
          order_index: number
          notes?: string | null
          sets_target?: number
          reps_min?: number | null
          reps_max?: number | null
          rest_seconds?: number | null
          plan_exercise_id?: string | null
          technique_snapshot_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_id?: string
          order_index?: number
          notes?: string | null
          sets_target?: number
          reps_min?: number | null
          reps_max?: number | null
          rest_seconds?: number | null
          plan_exercise_id?: string | null
          technique_snapshot_json?: Json
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
          },
          {
            foreignKeyName: "session_exercises_plan_exercise_id_fkey"
            columns: ["plan_exercise_id"]
            referencedRelation: "user_workout_plan_exercises"
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
          source_type: 'manual' | 'url_import' | 'menu_import' | 'ai_generated'
          source_url: string | null
          source_domain: string | null
          import_status: 'parsed' | 'needs_review' | 'failed'
          import_confidence: number | null
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
          source_type?: 'manual' | 'url_import' | 'menu_import' | 'ai_generated'
          source_url?: string | null
          source_domain?: string | null
          import_status?: 'parsed' | 'needs_review' | 'failed'
          import_confidence?: number | null
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
          source_type?: 'manual' | 'url_import' | 'menu_import' | 'ai_generated'
          source_url?: string | null
          source_domain?: string | null
          import_status?: 'parsed' | 'needs_review' | 'failed'
          import_confidence?: number | null
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
      recipe_import_events: {
        Row: {
          id: string
          user_id: string
          normalized_url_hash: string
          source_url: string
          source_domain: string | null
          parser_path: 'jsonld' | 'html_heuristic' | 'ai_fallback'
          parse_warnings_json: Json
          parse_result_json: Json | null
          error_message: string | null
          elapsed_ms: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          normalized_url_hash: string
          source_url: string
          source_domain?: string | null
          parser_path?: 'jsonld' | 'html_heuristic' | 'ai_fallback'
          parse_warnings_json?: Json
          parse_result_json?: Json | null
          error_message?: string | null
          elapsed_ms?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          normalized_url_hash?: string
          source_url?: string
          source_domain?: string | null
          parser_path?: 'jsonld' | 'html_heuristic' | 'ai_fallback'
          parse_warnings_json?: Json
          parse_result_json?: Json | null
          error_message?: string | null
          elapsed_ms?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_import_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      menu_scan_sessions: {
        Row: {
          id: string
          user_id: string
          input_type: 'text' | 'photo'
          goal_context_json: Json
          constraints_json: Json
          ranked_items_json: Json
          selected_item_json: Json | null
          explanations_json: Json
          applied_plan_meal_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          input_type: 'text' | 'photo'
          goal_context_json?: Json
          constraints_json?: Json
          ranked_items_json?: Json
          selected_item_json?: Json | null
          explanations_json?: Json
          applied_plan_meal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          input_type?: 'text' | 'photo'
          goal_context_json?: Json
          constraints_json?: Json
          ranked_items_json?: Json
          selected_item_json?: Json | null
          explanations_json?: Json
          applied_plan_meal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_scan_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_scan_sessions_applied_plan_meal_id_fkey"
            columns: ["applied_plan_meal_id"]
            referencedRelation: "user_nutrition_plan_meals"
            referencedColumns: ["id"]
          }
        ]
      }
      pantry_items: {
        Row: {
          id: string
          user_id: string
          name: string
          food_item_id: string | null
          quantity_value: number
          quantity_unit: string
          location: string | null
          expires_at: string | null
          reorder_threshold: number
          estimated_cost_per_unit: number | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          food_item_id?: string | null
          quantity_value?: number
          quantity_unit?: string
          location?: string | null
          expires_at?: string | null
          reorder_threshold?: number
          estimated_cost_per_unit?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          food_item_id?: string | null
          quantity_value?: number
          quantity_unit?: string
          location?: string | null
          expires_at?: string | null
          reorder_threshold?: number
          estimated_cost_per_unit?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_items_food_item_id_fkey"
            columns: ["food_item_id"]
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          }
        ]
      }
      pantry_transactions: {
        Row: {
          id: string
          user_id: string
          pantry_item_id: string | null
          transaction_type: 'add' | 'consume' | 'waste' | 'adjust'
          quantity_delta: number
          quantity_unit: string
          source_type: string
          source_ref_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pantry_item_id?: string | null
          transaction_type: 'add' | 'consume' | 'waste' | 'adjust'
          quantity_delta: number
          quantity_unit?: string
          source_type?: string
          source_ref_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pantry_item_id?: string | null
          transaction_type?: 'add' | 'consume' | 'waste' | 'adjust'
          quantity_delta?: number
          quantity_unit?: string
          source_type?: string
          source_ref_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_transactions_pantry_item_id_fkey"
            columns: ["pantry_item_id"]
            referencedRelation: "pantry_items"
            referencedColumns: ["id"]
          }
        ]
      }
      grocery_lists: {
        Row: {
          id: string
          user_id: string
          title: string
          week_start_date: string | null
          source: string
          budget_limit: number | null
          total_estimated_cost: number | null
          status: 'draft' | 'active' | 'completed' | 'archived'
          metadata_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          week_start_date?: string | null
          source?: string
          budget_limit?: number | null
          total_estimated_cost?: number | null
          status?: 'draft' | 'active' | 'completed' | 'archived'
          metadata_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          week_start_date?: string | null
          source?: string
          budget_limit?: number | null
          total_estimated_cost?: number | null
          status?: 'draft' | 'active' | 'completed' | 'archived'
          metadata_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      grocery_list_items: {
        Row: {
          id: string
          list_id: string
          item_name: string
          food_item_id: string | null
          required_quantity: number
          on_hand_quantity: number
          to_buy_quantity: number
          quantity_unit: string
          estimated_unit_cost: number | null
          estimated_total_cost: number | null
          substitution_suggestions_json: Json
          leftovers_json: Json
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          item_name: string
          food_item_id?: string | null
          required_quantity?: number
          on_hand_quantity?: number
          to_buy_quantity?: number
          quantity_unit?: string
          estimated_unit_cost?: number | null
          estimated_total_cost?: number | null
          substitution_suggestions_json?: Json
          leftovers_json?: Json
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          item_name?: string
          food_item_id?: string | null
          required_quantity?: number
          on_hand_quantity?: number
          to_buy_quantity?: number
          quantity_unit?: string
          estimated_unit_cost?: number | null
          estimated_total_cost?: number | null
          substitution_suggestions_json?: Json
          leftovers_json?: Json
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_list_id_fkey"
            columns: ["list_id"]
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_items_food_item_id_fkey"
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
          plan_type: 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime'
          status: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period'
          started_at: string | null
          expires_at: string | null
          trial_ends_at: string | null
          cancelled_at: string | null
          auto_renew: boolean
          platform: 'ios' | 'android' | 'web' | 'stripe' | null
          original_purchase_date: string | null
          product_id: string | null
          legacy_plan_type: 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime' | null
          grandfathered_into_tier: 'premium' | 'elite' | null
          grandfathered_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          revenuecat_customer_id?: string | null
          plan_type?: 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime'
          status?: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period'
          started_at?: string | null
          expires_at?: string | null
          trial_ends_at?: string | null
          cancelled_at?: string | null
          auto_renew?: boolean
          platform?: 'ios' | 'android' | 'web' | 'stripe' | null
          original_purchase_date?: string | null
          product_id?: string | null
          legacy_plan_type?: 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime' | null
          grandfathered_into_tier?: 'premium' | 'elite' | null
          grandfathered_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          revenuecat_customer_id?: string | null
          plan_type?: 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime'
          status?: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period'
          started_at?: string | null
          expires_at?: string | null
          trial_ends_at?: string | null
          cancelled_at?: string | null
          auto_renew?: boolean
          platform?: 'ios' | 'android' | 'web' | 'stripe' | null
          original_purchase_date?: string | null
          product_id?: string | null
          legacy_plan_type?: 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime' | null
          grandfathered_into_tier?: 'premium' | 'elite' | null
          grandfathered_until?: string | null
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
          selected_variant_id: string | null
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
          selected_variant_id?: string | null
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
          selected_variant_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_plan_meals_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "user_nutrition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nutrition_plan_meals_selected_variant_id_fkey"
            columns: ["selected_variant_id"]
            referencedRelation: "user_nutrition_plan_meal_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      user_nutrition_plan_meal_variants: {
        Row: {
          id: string
          plan_meal_id: string
          variant_type: 'default' | 'alternative' | 'user_custom'
          name: string
          description: string | null
          target_calories: number | null
          target_protein: number | null
          target_carbs: number | null
          target_fat: number | null
          prep_time_min: number | null
          source: 'ai' | 'rule' | 'user'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_meal_id: string
          variant_type?: 'default' | 'alternative' | 'user_custom'
          name: string
          description?: string | null
          target_calories?: number | null
          target_protein?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          prep_time_min?: number | null
          source?: 'ai' | 'rule' | 'user'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_meal_id?: string
          variant_type?: 'default' | 'alternative' | 'user_custom'
          name?: string
          description?: string | null
          target_calories?: number | null
          target_protein?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          prep_time_min?: number | null
          source?: 'ai' | 'rule' | 'user'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_plan_meal_variants_plan_meal_id_fkey"
            columns: ["plan_meal_id"]
            referencedRelation: "user_nutrition_plan_meals"
            referencedColumns: ["id"]
          }
        ]
      }
      user_nutrition_plan_meal_variant_items: {
        Row: {
          id: string
          variant_id: string
          food_item_id: string | null
          item_name: string
          quantity_value: number
          quantity_unit: string
          grams: number | null
          calories: number | null
          protein: number | null
          carbs: number | null
          fat: number | null
          fiber: number | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          food_item_id?: string | null
          item_name: string
          quantity_value: number
          quantity_unit: string
          grams?: number | null
          calories?: number | null
          protein?: number | null
          carbs?: number | null
          fat?: number | null
          fiber?: number | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          food_item_id?: string | null
          item_name?: string
          quantity_value?: number
          quantity_unit?: string
          grams?: number | null
          calories?: number | null
          protein?: number | null
          carbs?: number | null
          fat?: number | null
          fiber?: number | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_plan_meal_variant_items_variant_id_fkey"
            columns: ["variant_id"]
            referencedRelation: "user_nutrition_plan_meal_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nutrition_plan_meal_variant_items_food_item_id_fkey"
            columns: ["food_item_id"]
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          }
        ]
      }
      user_nutrition_plans: {
        Row: {
          id: string
          user_id: string
          generation_run_id: string | null
          lifecycle_state: string
          replaces_plan_id: string | null
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
          lifecycle_state?: string
          replaces_plan_id?: string | null
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
          lifecycle_state?: string
          replaces_plan_id?: string | null
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
          },
          {
            foreignKeyName: "user_nutrition_plans_replaces_plan_id_fkey"
            columns: ["replaces_plan_id"]
            referencedRelation: "user_nutrition_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      user_plan_consistency_daily: {
        Row: {
          id: string
          user_id: string
          log_date: string
          nutrition_score: number
          workout_score: number
          hydration_score: number
          overall_score: number
          nutrition_status_json: Json | null
          workout_status_json: Json | null
          hydration_status_json: Json | null
          recommendation_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          nutrition_score?: number
          workout_score?: number
          hydration_score?: number
          overall_score?: number
          nutrition_status_json?: Json | null
          workout_status_json?: Json | null
          hydration_status_json?: Json | null
          recommendation_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          nutrition_score?: number
          workout_score?: number
          hydration_score?: number
          overall_score?: number
          nutrition_status_json?: Json | null
          workout_status_json?: Json | null
          hydration_status_json?: Json | null
          recommendation_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plan_consistency_daily_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_plan_grocery_weeks: {
        Row: {
          id: string
          plan_id: string
          week_start_date: string
          items_json: Json
          prep_batches_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          week_start_date: string
          items_json?: Json
          prep_batches_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          week_start_date?: string
          items_json?: Json
          prep_batches_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plan_grocery_weeks_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "user_nutrition_plans"
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
          day_type_targets_json: Json | null
          target_diagnostics_json: Json | null
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
          day_type_targets_json?: Json | null
          target_diagnostics_json?: Json | null
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
          day_type_targets_json?: Json | null
          target_diagnostics_json?: Json | null
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
          day_type: string
          estimated_duration_min: number | null
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
          day_type?: string
          estimated_duration_min?: number | null
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
          day_type?: string
          estimated_duration_min?: number | null
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
      user_workout_plan_schedule: {
        Row: {
          id: string
          plan_id: string
          plan_day_id: string | null
          scheduled_date: string
          session_type: 'workout' | 'rest' | 'active_recovery' | 'conditioning'
          status: 'planned' | 'completed' | 'missed' | 'rescheduled' | 'skipped'
          original_date: string | null
          completed_session_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          plan_day_id?: string | null
          scheduled_date: string
          session_type: 'workout' | 'rest' | 'active_recovery' | 'conditioning'
          status?: 'planned' | 'completed' | 'missed' | 'rescheduled' | 'skipped'
          original_date?: string | null
          completed_session_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          plan_day_id?: string | null
          scheduled_date?: string
          session_type?: 'workout' | 'rest' | 'active_recovery' | 'conditioning'
          status?: 'planned' | 'completed' | 'missed' | 'rescheduled' | 'skipped'
          original_date?: string | null
          completed_session_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_plan_schedule_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "user_workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plan_schedule_plan_day_id_fkey"
            columns: ["plan_day_id"]
            referencedRelation: "user_workout_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plan_schedule_completed_session_id_fkey"
            columns: ["completed_session_id"]
            referencedRelation: "workout_sessions"
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
          source_model: string
          program_template_v2_id: string | null
          program_family_key: string | null
          progression_model: string | null
          training_style_tags: string[]
          goal_tags: string[]
          weekly_layout_json: Json | null
          lifecycle_state: string
          replaces_plan_id: string | null
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
          source_model?: string
          program_template_v2_id?: string | null
          program_family_key?: string | null
          progression_model?: string | null
          training_style_tags?: string[]
          goal_tags?: string[]
          weekly_layout_json?: Json | null
          lifecycle_state?: string
          replaces_plan_id?: string | null
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
          source_model?: string
          program_template_v2_id?: string | null
          program_family_key?: string | null
          progression_model?: string | null
          training_style_tags?: string[]
          goal_tags?: string[]
          weekly_layout_json?: Json | null
          lifecycle_state?: string
          replaces_plan_id?: string | null
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
            foreignKeyName: "user_workout_plans_program_template_v2_id_fkey"
            columns: ["program_template_v2_id"]
            referencedRelation: "workout_program_templates_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workout_plans_replaces_plan_id_fkey"
            columns: ["replaces_plan_id"]
            referencedRelation: "user_workout_plans"
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
      apply_workout_plan_preview: {
        Args: {
          preview_plan_id: string
        }
        Returns: string
      }
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
      discard_workout_plan_preview: {
        Args: {
          preview_plan_id: string
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
