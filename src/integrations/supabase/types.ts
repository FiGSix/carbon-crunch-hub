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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          agent_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          agent_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          agent_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commissions: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          base_rate: number
          calculated_at: string
          commission_amount: number
          commission_status: string | null
          final_rate: number
          id: string
          notes: string | null
          override_rate: number | null
          paid_at: string | null
          proposal_id: string | null
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          base_rate?: number
          calculated_at?: string
          commission_amount?: number
          commission_status?: string | null
          final_rate: number
          id?: string
          notes?: string | null
          override_rate?: number | null
          paid_at?: string | null
          proposal_id?: string | null
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          base_rate?: number
          calculated_at?: string
          commission_amount?: number
          commission_status?: string | null
          final_rate?: number
          id?: string
          notes?: string | null
          override_rate?: number | null
          paid_at?: string | null
          proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string
          first_name: string | null
          id: string
          last_modified_by: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_modified_by?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_modified_by?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_level: string | null
          agent_status: string | null
          avatar_url: string | null
          commission_override: number | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          intro_video_viewed: boolean | null
          intro_video_viewed_at: string | null
          join_date: string | null
          last_active_at: string | null
          last_name: string | null
          license_number: string | null
          notes: string | null
          onboarding_completed: boolean | null
          phone: string | null
          role: string
          status_changed_at: string | null
          status_changed_by: string | null
          terms_accepted_at: string | null
          territory: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          agent_status?: string | null
          avatar_url?: string | null
          commission_override?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          intro_video_viewed?: boolean | null
          intro_video_viewed_at?: string | null
          join_date?: string | null
          last_active_at?: string | null
          last_name?: string | null
          license_number?: string | null
          notes?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          terms_accepted_at?: string | null
          territory?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          agent_status?: string | null
          avatar_url?: string | null
          commission_override?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          intro_video_viewed?: boolean | null
          intro_video_viewed_at?: string | null
          join_date?: string | null
          last_active_at?: string | null
          last_name?: string | null
          license_number?: string | null
          notes?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          terms_accepted_at?: string | null
          territory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          agent_commission_percentage: number | null
          agent_id: string
          agent_portfolio_kwp: number | null
          annual_energy: number | null
          archived_at: string | null
          archived_by: string | null
          carbon_credits: number | null
          client_id: string | null
          client_reference_id: string | null
          client_share_percentage: number | null
          content: Json
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          eligibility_criteria: Json
          id: string
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          invitation_viewed_at: string | null
          last_modified_by: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          pdf_version: number | null
          project_info: Json
          review_later_until: string | null
          signed_at: string | null
          status: string
          system_size_kwp: number | null
          title: string
          unit_standard: string | null
          updated_at: string | null
        }
        Insert: {
          agent_commission_percentage?: number | null
          agent_id: string
          agent_portfolio_kwp?: number | null
          annual_energy?: number | null
          archived_at?: string | null
          archived_by?: string | null
          carbon_credits?: number | null
          client_id?: string | null
          client_reference_id?: string | null
          client_share_percentage?: number | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          eligibility_criteria?: Json
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          invitation_viewed_at?: string | null
          last_modified_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          project_info?: Json
          review_later_until?: string | null
          signed_at?: string | null
          status?: string
          system_size_kwp?: number | null
          title?: string
          unit_standard?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_commission_percentage?: number | null
          agent_id?: string
          agent_portfolio_kwp?: number | null
          annual_energy?: number | null
          archived_at?: string | null
          archived_by?: string | null
          carbon_credits?: number | null
          client_id?: string | null
          client_reference_id?: string | null
          client_share_percentage?: number | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          eligibility_criteria?: Json
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          invitation_viewed_at?: string | null
          last_modified_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          pdf_version?: number | null
          project_info?: Json
          review_later_until?: string | null
          signed_at?: string | null
          status?: string
          system_size_kwp?: number | null
          title?: string
          unit_standard?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_reference_id_fkey"
            columns: ["client_reference_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_proposal: {
        Args: { proposal_id: string; user_id: string }
        Returns: boolean
      }
      auth_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_agent_user: {
        Args: {
          access_level_param?: string
          agent_status_param?: string
          commission_override_param?: number
          company_name_param?: string
          email_param: string
          first_name_param: string
          last_name_param: string
          license_number_param?: string
          phone_param?: string
          territory_param?: string
        }
        Returns: string
      }
      create_test_user_profile: {
        Args: {
          email_param: string
          first_name_param?: string
          last_name_param?: string
          role_param: string
          user_id_param: string
        }
        Returns: string
      }
      delete_proposal: {
        Args: { proposal_id: string; user_id: string }
        Returns: boolean
      }
      format_system_size_for_display: {
        Args: { preferred_unit?: string; size_kwp: number }
        Returns: string
      }
      generate_secure_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_agent_clients: {
        Args: { agent_id_param?: string }
        Returns: {
          agent_id: string
          agent_name: string
          client_email: string
          client_id: string
          client_name: string
          company_name: string
          created_at: string
          is_registered: boolean
          project_count: number
          total_mwp: number
        }[]
      }
      get_agent_clients_count: {
        Args: { agent_id_param?: string }
        Returns: number
      }
      get_agent_clients_optimized: {
        Args: { agent_id_param?: string }
        Returns: {
          client_email: string
          client_id: string
          client_name: string
          company_name: string
          created_at: string
          is_registered: boolean
          project_count: number
          total_mwp: number
        }[]
      }
      get_agent_clients_paginated: {
        Args: {
          agent_id_param?: string
          limit_param?: number
          offset_param?: number
        }
        Returns: {
          client_email: string
          client_id: string
          client_name: string
          company_name: string
          created_at: string
          is_registered: boolean
          project_count: number
          total_mwp: number
        }[]
      }
      get_agent_dashboard_stats: {
        Args: { agent_id_param: string }
        Returns: {
          active_proposals: number
          signed_proposals: number
          total_carbon_credits: number
          total_clients: number
          total_proposals: number
          total_revenue: number
        }[]
      }
      get_agents_management_data: {
        Args: {
          limit_param?: number
          offset_param?: number
          search_term?: string
          status_filter?: string
        }
        Returns: {
          access_level: string
          active_proposals: number
          agent_email: string
          agent_id: string
          agent_name: string
          agent_status: string
          commission_override: number
          company_name: string
          join_date: string
          last_active_at: string
          onboarding_completed: boolean
          signed_proposals: number
          total_commission: number
          total_proposals: number
        }[]
      }
      get_client_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_dashboard_stats_optimized: {
        Args: { user_id_param: string; user_role_param: string }
        Returns: {
          active_proposals: number
          portfolio_size_kwp: number
          signed_proposals: number
          total_carbon_credits: number
          total_proposals: number
          total_revenue: number
        }[]
      }
      get_proposal_by_token: {
        Args: { token_param: string }
        Returns: {
          agent_id: string
          archived_at: string
          client_contact_id: string
          client_email: string
          client_id: string
          content: Json
          created_at: string
          id: string
          invitation_expires_at: string
          invitation_token: string
          is_preview: boolean
          preview_of_id: string
          review_later_until: string
          signed_at: string
          status: string
          title: string
        }[]
      }
      get_proposal_by_token_direct: {
        Args: { token_param: string }
        Returns: {
          agent_id: string
          annual_energy: number
          archived_at: string
          carbon_credits: number
          client_email: string
          client_id: string
          client_reference_id: string
          client_share_percentage: number
          content: Json
          created_at: string
          id: string
          invitation_expires_at: string
          invitation_token: string
          is_preview: boolean
          preview_of_id: string
          review_later_until: string
          signed_at: string
          status: string
          title: string
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_agent: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_proposal_client: {
        Args: { proposal_client_reference_id: string }
        Returns: boolean
      }
      mark_invitation_viewed: {
        Args: { token_param: string }
        Returns: undefined
      }
      normalize_system_size_to_kwp: {
        Args: { size_value: number; unit_type?: string }
        Returns: number
      }
      search_clients: {
        Args: { search_term: string }
        Returns: {
          company: string
          email: string
          id: string
          is_registered: boolean
          name: string
        }[]
      }
      search_clients_optimized: {
        Args: {
          agent_id_param?: string
          limit_param?: number
          search_term: string
        }
        Returns: {
          company: string
          email: string
          id: string
          is_registered: boolean
          name: string
          relevance_score: number
        }[]
      }
      search_proposals_optimized: {
        Args: {
          limit_param?: number
          offset_param?: number
          search_term?: string
          status_filter?: string
          user_id_param: string
          user_role_param: string
        }
        Returns: {
          agent_id: string
          carbon_credits: number
          client_id: string
          client_reference_id: string
          created_at: string
          id: string
          invitation_sent_at: string
          invitation_viewed_at: string
          status: string
          system_size_kwp: number
          title: string
        }[]
      }
      set_request_invitation_token: {
        Args: { email_input: string; token_input: string } | { token: string }
        Returns: boolean
      }
      test_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          operation: string
          result: string
          role: string
          success: boolean
          table_name: string
          test_name: string
        }[]
      }
      validate_invitation_token: {
        Args: { token: string }
        Returns: {
          client_email: string
          client_id: string
          client_reference_id: string
          proposal_id: string
        }[]
      }
      validate_token_direct: {
        Args: { token_param: string }
        Returns: {
          client_email: string
          client_id: string
          client_reference_id: string
          is_valid: boolean
          proposal_id: string
        }[]
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
    Enums: {},
  },
} as const
