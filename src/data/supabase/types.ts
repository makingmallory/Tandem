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
