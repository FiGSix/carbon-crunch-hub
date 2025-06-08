
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
      clients: {
        Row: {
          id: string
          user_id: string | null
          first_name: string | null
          last_name: string | null
          email: string
          phone: string | null
          company_name: string | null
          notes: string | null
          created_at: string
          created_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name?: string | null
          last_name?: string | null
          email: string
          phone?: string | null
          company_name?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string
          phone?: string | null
          company_name?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          first_name: string | null
          last_name: string | null
          company_name: string | null
          role: 'client' | 'agent' | 'admin'
          email: string
          phone: string | null
          terms_accepted_at: string | null
          updated_at: string | null
          avatar_url: string | null
          company_logo_url: string | null
          intro_video_viewed: boolean | null
          intro_video_viewed_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          role: 'client' | 'agent' | 'admin'
          email: string
          phone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          avatar_url?: string | null
          company_logo_url?: string | null
          intro_video_viewed?: boolean | null
          intro_video_viewed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          role?: 'client' | 'agent' | 'admin'
          email?: string
          phone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          avatar_url?: string | null
          company_logo_url?: string | null
          intro_video_viewed?: boolean | null
          intro_video_viewed_at?: string | null
        }
      }
      proposals: {
        Row: {
          id: string
          created_at: string
          title: string
          client_id: string | null
          client_reference_id: string | null
          agent_id: string
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          content: Json
          signed_at: string | null
          archived_at: string | null
          archived_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          review_later_until: string | null
          invitation_sent_at: string | null
          invitation_viewed_at: string | null
          invitation_expires_at: string | null
          invitation_token: string | null
          annual_energy: number | null
          carbon_credits: number | null
          client_share_percentage: number | null
          agent_commission_percentage: number | null
          eligibility_criteria: Json
          project_info: Json
          system_size_kwp: number | null
          agent_portfolio_kwp: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          client_id?: string | null
          client_reference_id?: string | null
          agent_id: string
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          content?: Json
          signed_at?: string | null
          archived_at?: string | null
          archived_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          review_later_until?: string | null
          invitation_sent_at?: string | null
          invitation_viewed_at?: string | null
          invitation_expires_at?: string | null
          invitation_token?: string | null
          annual_energy?: number | null
          carbon_credits?: number | null
          client_share_percentage?: number | null
          agent_commission_percentage?: number | null
          eligibility_criteria?: Json
          project_info?: Json
          system_size_kwp?: number | null
          agent_portfolio_kwp?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          client_id?: string | null
          client_reference_id?: string | null
          agent_id?: string
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          content?: Json
          signed_at?: string | null
          archived_at?: string | null
          archived_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          review_later_until?: string | null
          invitation_sent_at?: string | null
          invitation_viewed_at?: string | null
          invitation_expires_at?: string | null
          invitation_token?: string | null
          annual_energy?: number | null
          carbon_credits?: number | null
          client_share_percentage?: number | null
          agent_commission_percentage?: number | null
          eligibility_criteria?: Json
          project_info?: Json
          system_size_kwp?: number | null
          agent_portfolio_kwp?: number | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
          related_id: string | null
          related_type: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          created_at?: string
          related_id?: string | null
          related_type?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
          related_id?: string | null
          related_type?: string | null
        }
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          description: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
