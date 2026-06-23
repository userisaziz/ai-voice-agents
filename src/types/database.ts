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
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          website: string | null
          logo_url: string | null
          timezone: string
          currency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          website?: string | null
          logo_url?: string | null
          timezone?: string
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          website?: string | null
          logo_url?: string | null
          timezone?: string
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          business_id: string
          name: string
          voice: string
          language: string
          personality: string
          greeting_message: string | null
          system_prompt: string | null
          is_active: boolean
          max_call_duration: number
          interrupt_sensitivity: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          voice?: string
          language?: string
          personality?: string
          greeting_message?: string | null
          system_prompt?: string | null
          is_active?: boolean
          max_call_duration?: number
          interrupt_sensitivity?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          voice?: string
          language?: string
          personality?: string
          greeting_message?: string | null
          system_prompt?: string | null
          is_active?: boolean
          max_call_duration?: number
          interrupt_sensitivity?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          duration_minutes: number
          price_min: number | null
          price_max: number | null
          price_type: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          description?: string | null
          duration_minutes?: number
          price_min?: number | null
          price_max?: number | null
          price_type?: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price_min?: number | null
          price_max?: number | null
          price_type?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
      }
      business_hours: {
        Row: {
          id: string
          business_id: string
          day_of_week: number
          open_time: string | null
          close_time: string | null
          is_open: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          day_of_week: number
          open_time?: string | null
          close_time?: string | null
          is_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          day_of_week?: number
          open_time?: string | null
          close_time?: string | null
          is_open?: boolean
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          business_id: string
          service_id: string | null
          conversation_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_email: string | null
          custom_fields: Json | null
          notes: string | null
          scheduled_at: string
          duration_minutes: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          service_id?: string | null
          conversation_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_email?: string | null
          custom_fields?: Json | null
          notes?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          service_id?: string | null
          conversation_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_email?: string | null
          custom_fields?: Json | null
          notes?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          business_id: string
          agent_id: string | null
          caller_name: string | null
          caller_phone: string | null
          caller_email: string | null
          status: string
          duration_seconds: number | null
          appointment_booked: boolean
          callback_requested: boolean
          sentiment: string | null
          summary: string | null
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          agent_id?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          caller_email?: string | null
          status?: string
          duration_seconds?: number | null
          appointment_booked?: boolean
          callback_requested?: boolean
          sentiment?: string | null
          summary?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          agent_id?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          caller_email?: string | null
          status?: string
          duration_seconds?: number | null
          appointment_booked?: boolean
          callback_requested?: boolean
          sentiment?: string | null
          summary?: string | null
          source?: string
          updated_at?: string
        }
      }
      conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          tool_name: string | null
          tool_result: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          tool_name?: string | null
          tool_result?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          tool_name?: string | null
          tool_result?: Json | null
        }
      }
      faqs: {
        Row: {
          id: string
          business_id: string
          question: string
          answer: string
          category: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          question: string
          answer: string
          category?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          question?: string
          answer?: string
          category?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          business_id: string
          conversation_id: string | null
          name: string
          phone: string | null
          email: string | null
          custom_fields: Json | null
          service_interest: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          conversation_id?: string | null
          name: string
          phone?: string | null
          email?: string | null
          custom_fields?: Json | null
          service_interest?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          conversation_id?: string | null
          name?: string
          phone?: string | null
          email?: string | null
          custom_fields?: Json | null
          service_interest?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
      }
      embedded_widgets: {
        Row: {
          id: string
          business_id: string
          agent_id: string | null
          name: string
          position: string
          primary_color: string
          greeting: string | null
          is_active: boolean
          allowed_domains: string[] | null
          total_impressions: number
          total_interactions: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          agent_id?: string | null
          name?: string
          position?: string
          primary_color?: string
          greeting?: string | null
          is_active?: boolean
          allowed_domains?: string[] | null
          total_impressions?: number
          total_interactions?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          agent_id?: string | null
          name?: string
          position?: string
          primary_color?: string
          greeting?: string | null
          is_active?: boolean
          allowed_domains?: string[] | null
          total_impressions?: number
          total_interactions?: number
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          business_id: string
          conversation_id: string | null
          event_type: string
          event_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          conversation_id?: string | null
          event_type: string
          event_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          conversation_id?: string | null
          event_type?: string
          event_data?: Json | null
        }
      }
      telephony_providers: {
        Row: {
          id: string
          business_id: string
          name: string
          provider_type: string
          credentials: Json
          is_default: boolean
          is_active: boolean
          webhook_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          provider_type: string
          credentials: Json
          is_default?: boolean
          is_active?: boolean
          webhook_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          provider_type?: string
          credentials?: Json
          is_default?: boolean
          is_active?: boolean
          webhook_url?: string | null
          updated_at?: string
        }
      }
      phone_numbers: {
        Row: {
          id: string
          business_id: string
          provider_id: string
          number: string
          friendly_name: string | null
          direction: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          provider_id: string
          number: string
          friendly_name?: string | null
          direction?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          provider_id?: string
          number?: string
          friendly_name?: string | null
          direction?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      inbound_configs: {
        Row: {
          id: string
          business_id: string
          phone_number_id: string
          agent_id: string | null
          greeting_override: string | null
          lead_capture_enabled: boolean
          appointment_booking_enabled: boolean
          faq_enabled: boolean
          service_info_enabled: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          phone_number_id: string
          agent_id?: string | null
          greeting_override?: string | null
          lead_capture_enabled?: boolean
          appointment_booking_enabled?: boolean
          faq_enabled?: boolean
          service_info_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          phone_number_id?: string
          agent_id?: string | null
          greeting_override?: string | null
          lead_capture_enabled?: boolean
          appointment_booking_enabled?: boolean
          faq_enabled?: boolean
          service_info_enabled?: boolean
          is_active?: boolean
          updated_at?: string
        }
      }
      outbound_campaigns: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          status: string
          cron_expression: string | null
          timezone: string
          caller_number_id: string | null
          agent_id: string | null
          max_concurrent_calls: number
          call_delay_seconds: number
          retry_attempts: number
          retry_delay_minutes: number
          total_leads: number
          completed_leads: number
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          description?: string | null
          status?: string
          cron_expression?: string | null
          timezone?: string
          caller_number_id?: string | null
          agent_id?: string | null
          max_concurrent_calls?: number
          call_delay_seconds?: number
          retry_attempts?: number
          retry_delay_minutes?: number
          total_leads?: number
          completed_leads?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          description?: string | null
          status?: string
          cron_expression?: string | null
          timezone?: string
          caller_number_id?: string | null
          agent_id?: string | null
          max_concurrent_calls?: number
          call_delay_seconds?: number
          retry_attempts?: number
          retry_delay_minutes?: number
          total_leads?: number
          completed_leads?: number
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      campaign_leads: {
        Row: {
          id: string
          campaign_id: string
          business_id: string
          name: string
          phone: string
          email: string | null
          custom_fields: Json | null
          status: string
          call_attempts: number
          last_attempt_at: string | null
          call_log_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          business_id: string
          name: string
          phone: string
          email?: string | null
          custom_fields?: Json | null
          status?: string
          call_attempts?: number
          last_attempt_at?: string | null
          call_log_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          business_id?: string
          name?: string
          phone?: string
          email?: string | null
          custom_fields?: Json | null
          status?: string
          call_attempts?: number
          last_attempt_at?: string | null
          call_log_id?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          business_id: string
          campaign_id: string | null
          lead_id: string | null
          conversation_id: string | null
          phone_number_id: string | null
          direction: string
          from_number: string | null
          to_number: string | null
          status: string
          duration_seconds: number | null
          provider_call_id: string | null
          provider_type: string | null
          recording_url: string | null
          error_message: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          campaign_id?: string | null
          lead_id?: string | null
          conversation_id?: string | null
          phone_number_id?: string | null
          direction: string
          from_number?: string | null
          to_number?: string | null
          status?: string
          duration_seconds?: number | null
          provider_call_id?: string | null
          provider_type?: string | null
          recording_url?: string | null
          error_message?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          campaign_id?: string | null
          lead_id?: string | null
          conversation_id?: string | null
          phone_number_id?: string | null
          direction?: string
          from_number?: string | null
          to_number?: string | null
          status?: string
          duration_seconds?: number | null
          provider_call_id?: string | null
          provider_type?: string | null
          recording_url?: string | null
          error_message?: string | null
          started_at?: string | null
          ended_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      is_business_owner: {
        Args: { business_id: string }
        Returns: boolean
      }
      create_default_business_hours: {
        Args: { p_business_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
