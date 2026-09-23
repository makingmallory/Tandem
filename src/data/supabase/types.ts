export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chores: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          description: string | null;
          icon_key: "paw" | "trash" | "sparkle" | "bed" | "laundry" | "utensils" | "plants" | "bathtub" | "toilet" | "vacuum" | "broom" | "dishes" | "groceries" | "car" | "package" | "home" | "checklist";
          accent_key: "rose" | "sky" | "amber" | "lavender" | "mint" | "peach" | "teal";
          recurrence_type: "daily" | "interval_days" | "weekly" | "interval_weeks" | "monthly";
          interval_count: number;
          anchor_date: string;
          weekdays: number[] | null;
          day_of_month: number | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          description?: string | null;
          icon_key: "paw" | "trash" | "sparkle" | "bed" | "laundry" | "utensils" | "plants" | "bathtub" | "toilet" | "vacuum" | "broom" | "dishes" | "groceries" | "car" | "package" | "home" | "checklist";
          accent_key: "rose" | "sky" | "amber" | "lavender" | "mint" | "peach" | "teal";
          recurrence_type: "daily" | "interval_days" | "weekly" | "interval_weeks" | "monthly";
          interval_count?: number;
          anchor_date?: string;
          weekdays?: number[] | null;
          day_of_month?: number | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          icon_key?: "paw" | "trash" | "sparkle" | "bed" | "laundry" | "utensils" | "plants" | "bathtub" | "toilet" | "vacuum" | "broom" | "dishes" | "groceries" | "car" | "package" | "home" | "checklist";
          accent_key?: "rose" | "sky" | "amber" | "lavender" | "mint" | "peach" | "teal";
          recurrence_type?: "daily" | "interval_days" | "weekly" | "interval_weeks" | "monthly";
          interval_count?: number;
          anchor_date?: string;
          weekdays?: number[] | null;
          day_of_month?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chores_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chores_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chore_occurrences: {
        Row: {
          id: string;
          household_id: string;
          chore_id: string;
          scheduled_date: string;
          original_scheduled_date: string;
          status: "scheduled" | "completed" | "skipped";
          is_rescheduled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          chore_id: string;
          scheduled_date: string;
          original_scheduled_date: string;
          status?: "scheduled" | "completed" | "skipped";
          is_rescheduled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          scheduled_date?: string;
          original_scheduled_date?: string;
          status?: "scheduled" | "completed" | "skipped";
          is_rescheduled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chore_occurrences_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chore_occurrences_chore_household_fkey";
            columns: ["chore_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "chores";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      occurrence_completions: {
        Row: {
          id: string;
          occurrence_id: string;
          household_id: string;
          user_id: string;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          occurrence_id: string;
          household_id: string;
          user_id: string;
          completed_at?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "occurrence_completions_occurrence_household_fkey";
            columns: ["occurrence_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "chore_occurrences";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "occurrence_completions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_events: {
        Row: {
          id: string;
          household_id: string;
          actor_user_id: string | null;
          event_type: "chore_completed" | "chore_uncompleted" | "chore_skipped" | "chore_rescheduled";
          chore_id: string | null;
          occurrence_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          actor_user_id?: string | null;
          event_type: "chore_completed" | "chore_uncompleted" | "chore_skipped" | "chore_rescheduled";
          chore_id?: string | null;
          occurrence_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_chore_id_fkey";
            columns: ["chore_id"];
            isOneToOne: false;
            referencedRelation: "chores";
            referencedColumns: ["id"];
          },
        ];
      };
      chore_reminders: {
        Row: {
          id: string; household_id: string; chore_id: string; user_id: string;
          enabled: boolean; selected: boolean; reminder_type: "due_time"; offset_value: number; offset_unit: "day" | "week" | "month"; local_time: string; timezone: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; household_id: string; chore_id: string; user_id: string;
          enabled?: boolean; selected?: boolean; reminder_type?: "due_time"; offset_value?: number; offset_unit?: "day" | "week" | "month"; local_time: string; timezone: string;
          created_at?: string; updated_at?: string;
        };
        Update: { enabled?: boolean; selected?: boolean; offset_value?: number; offset_unit?: "day" | "week" | "month"; local_time?: string; timezone?: string; updated_at?: string };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string; user_id: string; endpoint: string; p256dh: string; auth: string;
          device_label: string | null; user_agent: string | null; created_at: string; last_seen_at: string;
        };
        Insert: {
          id?: string; user_id: string; endpoint: string; p256dh: string; auth: string;
          device_label?: string | null; user_agent?: string | null; created_at?: string; last_seen_at?: string;
        };
        Update: { p256dh?: string; auth?: string; device_label?: string | null; user_agent?: string | null; last_seen_at?: string };
        Relationships: [];
      };
      reminder_deliveries: {
        Row: {
          id: string; reminder_id: string; occurrence_id: string; user_id: string; scheduled_for: string;
          status: "pending" | "sent" | "suppressed" | "failed"; attempted_at: string | null;
          delivered_at: string | null; error_message: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; reminder_id: string; occurrence_id: string; user_id: string; scheduled_for: string;
          status?: "pending" | "sent" | "suppressed" | "failed"; attempted_at?: string | null;
          delivered_at?: string | null; error_message?: string | null; created_at?: string; updated_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_household: {
        Args: { household_name: string };
        Returns: Array<{ id: string; name: string; invite_code: string }>;
      };
      join_household: {
        Args: { household_invite_code: string };
        Returns: Array<{ id: string; name: string; invite_code: string }>;
      };
      create_chore_with_occurrences: {
        Args: {
          p_household_id: string;
          p_name: string;
          p_description: string | null;
          p_icon_key: string;
          p_accent_key: string;
          p_recurrence_type: string;
          p_interval_count: number;
          p_anchor_date: string;
          p_weekdays: number[] | null;
          p_day_of_month: number | null;
          p_occurrence_dates: string[];
        };
        Returns: Database["public"]["Tables"]["chores"]["Row"][];
      };
      update_chore_with_occurrences: {
        Args: {
          p_chore_id: string;
          p_household_id: string;
          p_name: string;
          p_description: string | null;
          p_icon_key: string;
          p_accent_key: string;
          p_recurrence_type: string;
          p_interval_count: number;
          p_anchor_date: string;
          p_weekdays: number[] | null;
          p_day_of_month: number | null;
          p_regeneration_date: string;
          p_occurrence_dates: string[];
        };
        Returns: Database["public"]["Tables"]["chores"]["Row"][];
      };
      set_chore_active_with_occurrences: {
        Args: {
          p_chore_id: string;
          p_household_id: string;
          p_is_active: boolean;
          p_regeneration_date: string;
          p_occurrence_dates: string[];
        };
        Returns: Database["public"]["Tables"]["chores"]["Row"][];
      };
      complete_occurrence: {
        Args: { p_occurrence_id: string; p_household_id: string };
        Returns: Database["public"]["Tables"]["occurrence_completions"]["Row"][];
      };
      undo_occurrence_completion: {
        Args: { p_occurrence_id: string; p_household_id: string };
        Returns: Database["public"]["Tables"]["chore_occurrences"]["Row"][];
      };
      skip_occurrence: {
        Args: { p_occurrence_id: string; p_household_id: string };
        Returns: Database["public"]["Tables"]["chore_occurrences"]["Row"][];
      };
      reschedule_occurrence: {
        Args: { p_occurrence_id: string; p_household_id: string; p_scheduled_date: string };
        Returns: Database["public"]["Tables"]["chore_occurrences"]["Row"][];
      };
      upsert_chore_reminder: {
        Args: { p_household_id: string; p_chore_id: string; p_enabled: boolean; p_reminder_type: string; p_local_time: string; p_timezone: string };
        Returns: Database["public"]["Tables"]["chore_reminders"]["Row"][];
      };
      upsert_chore_reminder_v2: {
        Args: { p_household_id: string; p_chore_id: string; p_enabled: boolean; p_reminder_type: string; p_timezone: string; p_reminders: Json };
        Returns: Database["public"]["Tables"]["chore_reminders"]["Row"][];
      };
      register_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_device_label: string; p_user_agent: string };
        Returns: Database["public"]["Tables"]["push_subscriptions"]["Row"][];
      };
      remove_push_subscription: {
        Args: { p_endpoint: string };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type HouseholdRow = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdMemberRow = Database["public"]["Tables"]["household_members"]["Row"];
export type ChoreRow = Database["public"]["Tables"]["chores"]["Row"];
export type ChoreOccurrenceRow = Database["public"]["Tables"]["chore_occurrences"]["Row"];
export type OccurrenceCompletionRow = Database["public"]["Tables"]["occurrence_completions"]["Row"];
export type ActivityEventRow = Database["public"]["Tables"]["activity_events"]["Row"];
export type ChoreReminderRow = Database["public"]["Tables"]["chore_reminders"]["Row"];
export type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type ReminderDeliveryRow = Database["public"]["Tables"]["reminder_deliveries"]["Row"];
