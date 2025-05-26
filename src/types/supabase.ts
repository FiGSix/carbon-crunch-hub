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
        }
      }
      proposals: {
        Row: {
          id: string
          created_at: string
          title: string
          client_id: string | null
          client_reference_id: string | null
          agent_id: string | null
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          content: Json
          signed_at: string | null
          archived_at: string | null
          archived_by: string | null
          review_later_until: string | null
          invitation_sent_at: string | null
          invitation_viewed_at: string | null
          invitation_expires_at: string | null
          invitation_token: string | null
          is_preview: boolean | null
          preview_of_id: string | null
          annual_energy: number | null
          carbon_credits: number | null
          client_share_percentage: number | null
          agent_commission_percentage: number | null
          eligibility_criteria: Json
          project_info: Json
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          client_id?: string | null
          client_reference_id?: string | null
          agent_id?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          content: Json
          signed_at?: string | null
          archived_at?: string | null
          archived_by?: string | null
          review_later_until?: string | null
          invitation_sent_at?: string | null
          invitation_viewed_at?: string | null
          invitation_expires_at?: string | null
          invitation_token?: string | null
          is_preview?: boolean | null
          preview_of_id?: string | null
          annual_energy?: number | null
          carbon_credits?: number | null
          client_share_percentage?: number | null
          agent_commission_percentage?: number | null
          eligibility_criteria?: Json
          project_info?: Json
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          client_id?: string | null
          client_reference_id?: string | null
          agent_id?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          content?: Json
          signed_at?: string | null
          archived_at?: string | null
          archived_by?: string | null
          review_later_until?: string | null
          invitation_sent_at?: string | null
          invitation_viewed_at?: string | null
          invitation_expires_at?: string | null
          invitation_token?: string | null
          is_preview?: boolean | null
          preview_of_id?: string | null
          annual_energy?: number | null
          carbon_credits?: number | null
          client_share_percentage?: number | null
          agent_commission_percentage?: number | null
          eligibility_criteria?: Json
          project_info?: Json
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
