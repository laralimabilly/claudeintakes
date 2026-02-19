export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      founder_locations: {
        Row: {
          city: string | null
          confidence: string | null
          country: string | null
          country_name: string | null
          created_at: string
          display_name: string | null
          founder_id: string
          geocode_source: string | null
          geocoded_at: string | null
          id: string
          is_hybrid_ok: boolean | null
          is_remote_ok: boolean | null
          is_remote_only: boolean | null
          lat: number | null
          lng: number | null
          raw_input: string
          region: string | null
          timezone_offset: number | null
          updated_at: string
          willing_to_relocate: boolean | null
        }
        Insert: {
          city?: string | null
          confidence?: string | null
          country?: string | null
          country_name?: string | null
          created_at?: string
          display_name?: string | null
          founder_id: string
          geocode_source?: string | null
          geocoded_at?: string | null
          id?: string
          is_hybrid_ok?: boolean | null
          is_remote_ok?: boolean | null
          is_remote_only?: boolean | null
          lat?: number | null
          lng?: number | null
          raw_input: string
          region?: string | null
          timezone_offset?: number | null
          updated_at?: string
          willing_to_relocate?: boolean | null
        }
        Update: {
          city?: string | null
          confidence?: string | null
          country?: string | null
          country_name?: string | null
          created_at?: string
          display_name?: string | null
          founder_id?: string
          geocode_source?: string | null
          geocoded_at?: string | null
          id?: string
          is_hybrid_ok?: boolean | null
          is_remote_ok?: boolean | null
          is_remote_only?: boolean | null
          lat?: number | null
          lng?: number | null
          raw_input?: string
          region?: string | null
          timezone_offset?: number | null
          updated_at?: string
          willing_to_relocate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_locations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_matches: {
        Row: {
          a_interested: boolean | null
          b_interested: boolean | null
          compatibility_level: string | null
          created_at: string
          founder_id: string
          id: string
          intro_sent_at: string | null
          matched_founder_id: string
          notified_at: string | null
          score_advantages: number | null
          score_communication: number | null
          score_geo: number | null
          score_skills: number | null
          score_stage: number | null
          score_values: number | null
          score_vision: number | null
          status: string | null
          total_score: number
          updated_at: string
        }
        Insert: {
          a_interested?: boolean | null
          b_interested?: boolean | null
          compatibility_level?: string | null
          created_at?: string
          founder_id: string
          id?: string
          intro_sent_at?: string | null
          matched_founder_id: string
          notified_at?: string | null
          score_advantages?: number | null
          score_communication?: number | null
          score_geo?: number | null
          score_skills?: number | null
          score_stage?: number | null
          score_values?: number | null
          score_vision?: number | null
          status?: string | null
          total_score: number
          updated_at?: string
        }
        Update: {
          a_interested?: boolean | null
          b_interested?: boolean | null
          compatibility_level?: string | null
          created_at?: string
          founder_id?: string
          id?: string
          intro_sent_at?: string | null
          matched_founder_id?: string
          notified_at?: string | null
          score_advantages?: number | null
          score_communication?: number | null
          score_geo?: number | null
          score_skills?: number | null
          score_stage?: number | null
          score_values?: number | null
          score_vision?: number | null
          status?: string | null
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_matches_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_matches_matched_founder_id_fkey"
            columns: ["matched_founder_id"]
            isOneToOne: false
            referencedRelation: "founder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_profiles: {
        Row: {
          admin_notes: string | null
          background: string | null
          call_summary: string | null
          cofounder_type: string | null
          commitment_level: string | null
          core_skills: string[] | null
          created_at: string
          deal_breakers: string[] | null
          email: string | null
          embedding: string | null
          equity_thoughts: string | null
          excitement_reason: string | null
          id: string
          idea_description: string | null
          location_preference: string | null
          match_frequency_preference: string | null
          match_sent_at: string | null
          matched: boolean
          name: string | null
          non_negotiables: string[] | null
          notes_updated_at: string | null
          phone_number: string
          preferred_contact: string | null
          previous_founder: boolean | null
          problem_solving: string | null
          seeking_skills: string[] | null
          seriousness_score: number | null
          stage: string | null
          status: Database["public"]["Enums"]["founder_status"]
          success_criteria: string | null
          superpower: string | null
          tagline: string | null
          target_customer: string | null
          timeline_start: string | null
          urgency_level: string | null
          user_id: string | null
          vapi_call_id: string
          weaknesses_blindspots: string[] | null
          whatsapp: string | null
          willingness_to_pay: string | null
          working_style: string | null
        }
        Insert: {
          admin_notes?: string | null
          background?: string | null
          call_summary?: string | null
          cofounder_type?: string | null
          commitment_level?: string | null
          core_skills?: string[] | null
          created_at?: string
          deal_breakers?: string[] | null
          email?: string | null
          embedding?: string | null
          equity_thoughts?: string | null
          excitement_reason?: string | null
          id?: string
          idea_description?: string | null
          location_preference?: string | null
          match_frequency_preference?: string | null
          match_sent_at?: string | null
          matched?: boolean
          name?: string | null
          non_negotiables?: string[] | null
          notes_updated_at?: string | null
          phone_number: string
          preferred_contact?: string | null
          previous_founder?: boolean | null
          problem_solving?: string | null
          seeking_skills?: string[] | null
          seriousness_score?: number | null
          stage?: string | null
          status?: Database["public"]["Enums"]["founder_status"]
          success_criteria?: string | null
          superpower?: string | null
          tagline?: string | null
          target_customer?: string | null
          timeline_start?: string | null
          urgency_level?: string | null
          user_id?: string | null
          vapi_call_id: string
          weaknesses_blindspots?: string[] | null
          whatsapp?: string | null
          willingness_to_pay?: string | null
          working_style?: string | null
        }
        Update: {
          admin_notes?: string | null
          background?: string | null
          call_summary?: string | null
          cofounder_type?: string | null
          commitment_level?: string | null
          core_skills?: string[] | null
          created_at?: string
          deal_breakers?: string[] | null
          email?: string | null
          embedding?: string | null
          equity_thoughts?: string | null
          excitement_reason?: string | null
          id?: string
          idea_description?: string | null
          location_preference?: string | null
          match_frequency_preference?: string | null
          match_sent_at?: string | null
          matched?: boolean
          name?: string | null
          non_negotiables?: string[] | null
          notes_updated_at?: string | null
          phone_number?: string
          preferred_contact?: string | null
          previous_founder?: boolean | null
          problem_solving?: string | null
          seeking_skills?: string[] | null
          seriousness_score?: number | null
          stage?: string | null
          status?: Database["public"]["Enums"]["founder_status"]
          success_criteria?: string | null
          superpower?: string | null
          tagline?: string | null
          target_customer?: string | null
          timeline_start?: string | null
          urgency_level?: string | null
          user_id?: string | null
          vapi_call_id?: string
          weaknesses_blindspots?: string[] | null
          whatsapp?: string | null
          willingness_to_pay?: string | null
          working_style?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      system_parameters: {
        Row: {
          description: string | null
          system_key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          system_key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          system_key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          context: Json
          created_at: string
          current_state: string
          founder_id: string
          id: string
          last_message_at: string
          phone_number: string
        }
        Insert: {
          context?: Json
          created_at?: string
          current_state?: string
          founder_id: string
          id?: string
          last_message_at?: string
          phone_number: string
        }
        Update: {
          context?: Json
          created_at?: string
          current_state?: string
          founder_id?: string
          id?: string
          last_message_at?: string
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          id: string
          is_from_user: boolean | null
          message_content: string | null
          phone_number: string
          processed: boolean
          received_at: string
          twilio_message_sid: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_user?: boolean | null
          message_content?: string | null
          phone_number: string
          processed?: boolean
          received_at?: string
          twilio_message_sid?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_from_user?: boolean | null
          message_content?: string | null
          phone_number?: string
          processed?: boolean
          received_at?: string
          twilio_message_sid?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_founders: {
        Args: {
          exclude_profile_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          background: string
          cofounder_type: string
          commitment_level: string
          core_skills: string[]
          created_at: string
          email: string
          id: string
          idea_description: string
          location_preference: string
          name: string
          phone_number: string
          previous_founder: boolean
          seeking_skills: string[]
          seriousness_score: number
          similarity: number
          stage: string
          superpower: string
          timeline_start: string
          urgency_level: string
          weaknesses_blindspots: string[]
          working_style: string
        }[]
      }
      store_founder_match: {
        Args: {
          p_founder_id: string
          p_matched_founder_id: string
          p_similarity_score: number
        }
        Returns: string
      }
      update_match_status: {
        Args: { p_match_id: string; p_status: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      founder_status: "new" | "reviewed" | "matched" | "contacted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      founder_status: ["new", "reviewed", "matched", "contacted"],
    },
  },
} as const
