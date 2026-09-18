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
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type HouseholdRow = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdMemberRow = Database["public"]["Tables"]["household_members"]["Row"];
