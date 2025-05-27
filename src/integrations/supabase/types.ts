export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string
          first_name: string | null
          id: string
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
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          avatar_url: string | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role: string
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          agent_commission_percentage: number | null
          agent_id: string | null
          annual_energy: number | null
          archived_at: string | null
          archived_by: string | null
          carbon_credits: number | null
          client_id: string | null
          client_reference_id: string | null
          client_share_percentage: number | null
          content: Json
          created_at: string
          eligibility_criteria: Json
          id: string
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          invitation_viewed_at: string | null
          is_preview: boolean | null
          preview_of_id: string | null
          project_info: Json
          review_later_until: string | null
          signed_at: string | null
          status: string
          title: string
        }
        Insert: {
          agent_commission_percentage?: number | null
          agent_id?: string | null
          annual_energy?: number | null
          archived_at?: string | null
          archived_by?: string | null
          carbon_credits?: number | null
          client_id?: string | null
          client_reference_id?: string | null
          client_share_percentage?: number | null
          content?: Json
          created_at?: string
          eligibility_criteria?: Json
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          invitation_viewed_at?: string | null
          is_preview?: boolean | null
          preview_of_id?: string | null
          project_info?: Json
          review_later_until?: string | null
          signed_at?: string | null
          status?: string
          title: string
        }
        Update: {
          agent_commission_percentage?: number | null
          agent_id?: string | null
          annual_energy?: number | null
          archived_at?: string | null
          archived_by?: string | null
          carbon_credits?: number | null
          client_id?: string | null
          client_reference_id?: string | null
          client_share_percentage?: number | null
          content?: Json
          created_at?: string
          eligibility_criteria?: Json
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          invitation_viewed_at?: string | null
          is_preview?: boolean | null
          preview_of_id?: string | null
          project_info?: Json
          review_later_until?: string | null
          signed_at?: string | null
          status?: string
          title?: string
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
            foreignKeyName: "proposals_preview_of_id_fkey"
            columns: ["preview_of_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
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
      can_create_preview_proposal: {
        Args: { proposal_row: Database["public"]["Tables"]["proposals"]["Row"] }
        Returns: boolean
      }
      fix_proposal_client_references: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_secure_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_agent_clients: {
        Args: { agent_id_param?: string }
        Returns: {
          client_id: string
          client_name: string
          client_email: string
          company_name: string
          is_registered: boolean
          project_count: number
          total_mwp: number
          agent_id: string
          agent_name: string
        }[]
      }
      get_client_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_proposal_by_token: {
        Args: { token_param: string }
        Returns: {
          id: string
          title: string
          status: string
          content: Json
          agent_id: string
          client_id: string
          client_contact_id: string
          signed_at: string
          created_at: string
          archived_at: string
          review_later_until: string
          is_preview: boolean
          preview_of_id: string
          client_email: string
          invitation_token: string
          invitation_expires_at: string
        }[]
      }
      get_proposal_by_token_direct: {
        Args: { token_param: string }
        Returns: {
          id: string
          title: string
          status: string
          content: Json
          agent_id: string
          client_id: string
          client_reference_id: string
          signed_at: string
          created_at: string
          archived_at: string
          review_later_until: string
          is_preview: boolean
          preview_of_id: string
          client_email: string
          invitation_token: string
          invitation_expires_at: string
          annual_energy: number
          carbon_credits: number
          client_share_percentage: number
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: string
      }
      mark_invitation_viewed: {
        Args: { token_param: string }
        Returns: undefined
      }
      migrate_client_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_clients: {
        Args: { search_term: string }
        Returns: {
          id: string
          name: string
          email: string
          company: string
          is_registered: boolean
        }[]
      }
      set_request_invitation_token: {
        Args: { email_input: string; token_input: string } | { token: string }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { token: string }
        Returns: {
          proposal_id: string
          client_email: string
          client_id: string
          client_reference_id: string
        }[]
      }
      validate_token_direct: {
        Args: { token_param: string }
        Returns: {
          proposal_id: string
          client_email: string
          client_id: string
          client_reference_id: string
          is_valid: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
