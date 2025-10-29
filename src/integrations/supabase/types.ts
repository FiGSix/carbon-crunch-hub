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
      agent_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          agent_id: string
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          agent_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          agent_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
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
      agent_invitations: {
        Row: {
          accepted_at: string | null
          company_name: string | null
          created_at: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invitation_token: string
          invited_by: string | null
          last_name: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          invitation_token: string
          invited_by?: string | null
          last_name?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string | null
          last_name?: string | null
          status?: string
        }
        Relationships: []
      }
      calculator_results: {
        Row: {
          commissioning_date: string
          created_at: string | null
          email: string
          id: string
          invitation_expires_at: string
          invitation_sent_at: string | null
          invitation_token: string
          invitation_viewed_at: string | null
          ip_address: unknown
          name: string | null
          system_size_kwp: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          commissioning_date: string
          created_at?: string | null
          email: string
          id?: string
          invitation_expires_at: string
          invitation_sent_at?: string | null
          invitation_token: string
          invitation_viewed_at?: string | null
          ip_address?: unknown
          name?: string | null
          system_size_kwp: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          commissioning_date?: string
          created_at?: string | null
          email?: string
          id?: string
          invitation_expires_at?: string
          invitation_sent_at?: string | null
          invitation_token?: string
          invitation_viewed_at?: string | null
          ip_address?: unknown
          name?: string | null
          system_size_kwp?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_access_audit: {
        Row: {
          accessed_at: string
          accessed_by: string
          action: string
          client_ids: string[]
          id: string
          ip_address: unknown
          modified_fields: Json | null
          new_values: Json | null
          old_values: Json | null
          result_count: number
          search_term: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          accessed_by: string
          action: string
          client_ids: string[]
          id?: string
          ip_address?: unknown
          modified_fields?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          result_count?: number
          search_term?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          accessed_by?: string
          action?: string
          client_ids?: string[]
          id?: string
          ip_address?: unknown
          modified_fields?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          result_count?: number
          search_term?: string | null
          user_agent?: string | null
        }
        Relationships: []
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
          registration_number: string | null
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
          registration_number?: string | null
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
          registration_number?: string | null
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
      companies: {
        Row: {
          company_name: string
          created_at: string
          created_by: string | null
          email_domain: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by?: string | null
          email_domain?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string | null
          email_domain?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_access_config: {
        Row: {
          api_key_encrypted: string | null
          configured_by: string | null
          created_at: string
          credential_method: string
          delegated_email: string | null
          first_data_ingested_at: string | null
          id: string
          last_test_at: string | null
          last_test_error: string | null
          last_test_status: string | null
          portal_url: string | null
          project_id: string
          provider: string
          readonly_username: string | null
          site_id: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          configured_by?: string | null
          created_at?: string
          credential_method: string
          delegated_email?: string | null
          first_data_ingested_at?: string | null
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          portal_url?: string | null
          project_id: string
          provider: string
          readonly_username?: string | null
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          configured_by?: string | null
          created_at?: string
          credential_method?: string
          delegated_email?: string | null
          first_data_ingested_at?: string | null
          id?: string
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          portal_url?: string | null
          project_id?: string
          provider?: string
          readonly_username?: string | null
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_config_configured_by_fkey"
            columns: ["configured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_onboarding"
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
      onboarding_activity_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          mentioned_users: string[] | null
          new_value: string | null
          old_value: string | null
          project_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          mentioned_users?: string[] | null
          new_value?: string | null
          old_value?: string | null
          project_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          mentioned_users?: string[] | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_onboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          edited_by: string | null
          id: string
          mentioned_users: string[] | null
          parent_comment_id: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          mentioned_users?: string[] | null
          parent_comment_id?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          mentioned_users?: string[] | null
          parent_comment_id?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_comments_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "onboarding_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_onboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_documents: {
        Row: {
          category: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          is_validated: boolean | null
          mime_type: string | null
          project_id: string
          replaces_doc_id: string | null
          uploaded_at: string
          uploaded_by: string
          validated_at: string | null
          validated_by: string | null
          validation_notes: string | null
          version: number
        }
        Insert: {
          category: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_validated?: boolean | null
          mime_type?: string | null
          project_id: string
          replaces_doc_id?: string | null
          uploaded_at?: string
          uploaded_by: string
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
          version?: number
        }
        Update: {
          category?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_validated?: boolean | null
          mime_type?: string | null
          project_id?: string
          replaces_doc_id?: string | null
          uploaded_at?: string
          uploaded_by?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_documents_replaces_doc_id_fkey"
            columns: ["replaces_doc_id"]
            isOneToOne: false
            referencedRelation: "onboarding_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_documents_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_fields: {
        Row: {
          alternative_power_source: string | null
          battery_brand: string | null
          battery_capacity_kwh: number | null
          battery_cost: number | null
          battery_model: string | null
          battery_serial: string | null
          commissioning_date: string | null
          connection_type: string | null
          created_at: string
          data_collector_present: string | null
          data_collector_serial: string | null
          has_maintenance_agreement: boolean | null
          id: string
          installer_company_name: string | null
          installer_email: string | null
          installer_id: string | null
          inverter_brand: string | null
          inverter_capacity_kw: number | null
          inverter_cost: number | null
          inverter_model: string | null
          inverter_quantity: number | null
          inverter_serial: string | null
          labor_cost: number | null
          maintenance_agreement_term_years: number | null
          maintenance_cost_annual: number | null
          meter_serial: string | null
          meter_type: string | null
          ownership_type: string | null
          panel_brand: string | null
          panel_cost: number | null
          panel_quantity: number | null
          panel_size_wp: number | null
          panel_total_kwp: number | null
          project_id: string
          system_address: string | null
          system_gps_lat: number | null
          system_gps_lng: number | null
          system_name: string | null
          total_capex: number | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          alternative_power_source?: string | null
          battery_brand?: string | null
          battery_capacity_kwh?: number | null
          battery_cost?: number | null
          battery_model?: string | null
          battery_serial?: string | null
          commissioning_date?: string | null
          connection_type?: string | null
          created_at?: string
          data_collector_present?: string | null
          data_collector_serial?: string | null
          has_maintenance_agreement?: boolean | null
          id?: string
          installer_company_name?: string | null
          installer_email?: string | null
          installer_id?: string | null
          inverter_brand?: string | null
          inverter_capacity_kw?: number | null
          inverter_cost?: number | null
          inverter_model?: string | null
          inverter_quantity?: number | null
          inverter_serial?: string | null
          labor_cost?: number | null
          maintenance_agreement_term_years?: number | null
          maintenance_cost_annual?: number | null
          meter_serial?: string | null
          meter_type?: string | null
          ownership_type?: string | null
          panel_brand?: string | null
          panel_cost?: number | null
          panel_quantity?: number | null
          panel_size_wp?: number | null
          panel_total_kwp?: number | null
          project_id: string
          system_address?: string | null
          system_gps_lat?: number | null
          system_gps_lng?: number | null
          system_name?: string | null
          total_capex?: number | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          alternative_power_source?: string | null
          battery_brand?: string | null
          battery_capacity_kwh?: number | null
          battery_cost?: number | null
          battery_model?: string | null
          battery_serial?: string | null
          commissioning_date?: string | null
          connection_type?: string | null
          created_at?: string
          data_collector_present?: string | null
          data_collector_serial?: string | null
          has_maintenance_agreement?: boolean | null
          id?: string
          installer_company_name?: string | null
          installer_email?: string | null
          installer_id?: string | null
          inverter_brand?: string | null
          inverter_capacity_kw?: number | null
          inverter_cost?: number | null
          inverter_model?: string | null
          inverter_quantity?: number | null
          inverter_serial?: string | null
          labor_cost?: number | null
          maintenance_agreement_term_years?: number | null
          maintenance_cost_annual?: number | null
          meter_serial?: string | null
          meter_type?: string | null
          ownership_type?: string | null
          panel_brand?: string | null
          panel_cost?: number | null
          panel_quantity?: number | null
          panel_size_wp?: number | null
          panel_total_kwp?: number | null
          project_id?: string
          system_address?: string | null
          system_gps_lat?: number | null
          system_gps_lng?: number | null
          system_name?: string | null
          total_capex?: number | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_fields_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "solar_installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_fields_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_fields_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          related_doc_category: string | null
          related_field: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          related_doc_category?: string | null
          related_field?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          related_doc_category?: string | null
          related_field?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_onboarding"
            referencedColumns: ["id"]
          },
        ]
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      project_onboarding: {
        Row: {
          admin_validated: boolean | null
          admin_validated_at: string | null
          admin_validated_by: string | null
          assigned_epc_id: string | null
          audit_ready: boolean
          audit_ready_marked_at: string | null
          audit_ready_marked_by: string | null
          created_at: string
          data_access_verified: boolean
          data_access_verified_at: string | null
          id: string
          last_modified_by: string | null
          onboarding_complete: boolean
          onboarding_completed_at: string | null
          proposal_id: string
          submitted_by: string | null
          submitted_for_review: boolean | null
          submitted_for_review_at: string | null
          updated_at: string
        }
        Insert: {
          admin_validated?: boolean | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          assigned_epc_id?: string | null
          audit_ready?: boolean
          audit_ready_marked_at?: string | null
          audit_ready_marked_by?: string | null
          created_at?: string
          data_access_verified?: boolean
          data_access_verified_at?: string | null
          id?: string
          last_modified_by?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          proposal_id: string
          submitted_by?: string | null
          submitted_for_review?: boolean | null
          submitted_for_review_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_validated?: boolean | null
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          assigned_epc_id?: string | null
          audit_ready?: boolean
          audit_ready_marked_at?: string | null
          audit_ready_marked_by?: string | null
          created_at?: string
          data_access_verified?: boolean
          data_access_verified_at?: string | null
          id?: string
          last_modified_by?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          proposal_id?: string
          submitted_by?: string | null
          submitted_for_review?: boolean | null
          submitted_for_review_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_onboarding_assigned_epc_id_fkey"
            columns: ["assigned_epc_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_onboarding_audit_ready_marked_by_fkey"
            columns: ["audit_ready_marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_onboarding_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_onboarding_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_agreements: {
        Row: {
          accepted_terms_version: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          proposal_id: string
          signature_image_url: string | null
          signature_type: Database["public"]["Enums"]["signature_type"]
          signature_type_used: string | null
          signed_at: string
          signed_by: string
          signed_pdf_url: string | null
          typed_name: string | null
          user_agent: string | null
          witness_1_ip_address: unknown
          witness_1_name: string | null
          witness_1_verified_at: string | null
          witness_2_ip_address: unknown
          witness_2_name: string | null
          witness_2_verified_at: string | null
          witness_method: string | null
        }
        Insert: {
          accepted_terms_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          proposal_id: string
          signature_image_url?: string | null
          signature_type?: Database["public"]["Enums"]["signature_type"]
          signature_type_used?: string | null
          signed_at?: string
          signed_by: string
          signed_pdf_url?: string | null
          typed_name?: string | null
          user_agent?: string | null
          witness_1_ip_address?: unknown
          witness_1_name?: string | null
          witness_1_verified_at?: string | null
          witness_2_ip_address?: unknown
          witness_2_name?: string | null
          witness_2_verified_at?: string | null
          witness_method?: string | null
        }
        Update: {
          accepted_terms_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          proposal_id?: string
          signature_image_url?: string | null
          signature_type?: Database["public"]["Enums"]["signature_type"]
          signature_type_used?: string | null
          signed_at?: string
          signed_by?: string
          signed_pdf_url?: string | null
          typed_name?: string | null
          user_agent?: string | null
          witness_1_ip_address?: unknown
          witness_1_name?: string | null
          witness_1_verified_at?: string | null
          witness_2_ip_address?: unknown
          witness_2_name?: string | null
          witness_2_verified_at?: string | null
          witness_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_agreements_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          agent_commission_percentage: number | null
          agent_id: string | null
          agent_portfolio_kwp: number | null
          annual_energy: number | null
          archived_at: string | null
          archived_by: string | null
          carbon_credits: number | null
          client_id: string | null
          client_reference_id: string | null
          client_share_override_enabled: boolean | null
          client_share_override_set_at: string | null
          client_share_override_set_by: string | null
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
          agent_id?: string | null
          agent_portfolio_kwp?: number | null
          annual_energy?: number | null
          archived_at?: string | null
          archived_by?: string | null
          carbon_credits?: number | null
          client_id?: string | null
          client_reference_id?: string | null
          client_share_override_enabled?: boolean | null
          client_share_override_set_at?: string | null
          client_share_override_set_by?: string | null
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
          agent_id?: string | null
          agent_portfolio_kwp?: number | null
          annual_energy?: number | null
          archived_at?: string | null
          archived_by?: string | null
          carbon_credits?: number | null
          client_id?: string | null
          client_reference_id?: string | null
          client_share_override_enabled?: boolean | null
          client_share_override_set_at?: string | null
          client_share_override_set_by?: string | null
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
            foreignKeyName: "proposals_client_share_override_set_by_fkey"
            columns: ["client_share_override_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      solar_installers: {
        Row: {
          address: string | null
          company_name: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      team_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invitation_token: string
          invited_by: string | null
          last_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          invitation_token: string
          invited_by?: string | null
          last_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string | null
          last_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_audit: {
        Row: {
          action: string
          created_at: string | null
          id: string
          performed_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          performed_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          performed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      auth_user_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      can_view_proposal: {
        Args: {
          proposal_agent_id: string
          proposal_client_id: string
          proposal_client_reference_id: string
          proposal_deleted_at: string
          proposal_invitation_expires_at: string
          proposal_invitation_token: string
        }
        Returns: boolean
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
      extract_corporate_domain: {
        Args: { email_param: string }
        Returns: string
      }
      find_or_create_client_by_email: {
        Args: {
          p_company_name: string
          p_created_by: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
        }
        Returns: string
      }
      format_system_size_for_display: {
        Args: { preferred_unit?: string; size_kwp: number }
        Returns: string
      }
      generate_secure_token: { Args: never; Returns: string }
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
      get_client_email: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_metrics_by_stage: {
        Args: { user_id_param: string; user_role_param: string }
        Returns: {
          audit_ready_mwp: number
          audit_ready_revenue: number
          onboarding_mwp: number
          pending_approval_mwp: number
        }[]
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
      get_data_access_status: {
        Args: { project_id_param: string }
        Returns: {
          configured_by: string
          created_at: string
          credential_method: string
          first_data_ingested_at: string
          has_credentials: boolean
          id: string
          last_test_at: string
          last_test_error: string
          last_test_status: string
          portal_url: string
          project_id: string
          provider: string
          site_id: string
          updated_at: string
        }[]
      }
      get_pending_team_invitations: {
        Args: { company_id_param: string }
        Returns: {
          company_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          invitation_token: string
          invited_by: string
          inviter_name: string
          last_name: string
          status: string
        }[]
      }
      get_primary_role: { Args: { _user_id: string }; Returns: string }
      get_project_step_status: {
        Args: { proposal_id_param: string }
        Returns: {
          audit_ready_status: string
          cession_status: string
          data_access_status: string
          onboarding_status: string
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
      get_user_company_id: { Args: { user_id_param: string }; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_agent: { Args: never; Returns: boolean }
      is_proposal_client: {
        Args: { proposal_client_reference_id: string }
        Returns: boolean
      }
      is_team_lead: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: boolean
      }
      log_client_access: {
        Args: {
          action_param: string
          client_ids_param: string[]
          result_count_param?: number
          search_term_param?: string
        }
        Returns: undefined
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
      set_request_invitation_token:
        | {
            Args: { email_input: string; token_input: string }
            Returns: undefined
          }
        | { Args: { token: string }; Returns: boolean }
      test_rls_policies: {
        Args: never
        Returns: {
          operation: string
          result: string
          role: string
          success: boolean
          table_name: string
          test_name: string
        }[]
      }
      user_company_ids: {
        Args: { user_id_param: string }
        Returns: {
          company_id: string
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
      validate_onboarding_completion: {
        Args: { project_id_param: string }
        Returns: boolean
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
      app_role: "admin" | "agent" | "client"
      signature_type: "typed_name" | "electronic_signature" | "manual"
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
      app_role: ["admin", "agent", "client"],
      signature_type: ["typed_name", "electronic_signature", "manual"],
    },
  },
} as const
