
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
      profiles: {
        Row: {
          id: string
          created_at: string
          first_name: string | null
          last_name: string | null
          company_name: string | null
          role: 'client' | 'agent' | 'admin'
          email: string
        }
        Insert: {
          id: string
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          role: 'client' | 'agent' | 'admin'
          email: string
        }
        Update: {
          id?: string
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          role?: 'client' | 'agent' | 'admin'
          email?: string
        }
      }
      proposals: {
        Row: {
          id: string
          created_at: string
          title: string
          client_id: string
          agent_id: string | null
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          content: Json
          signed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          client_id: string
          agent_id?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          content: Json
          signed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          client_id?: string
          agent_id?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          content?: Json
          signed_at?: string | null
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
