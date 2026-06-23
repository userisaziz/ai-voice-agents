export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  logo_url: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  business_id: string;
  name: string;
  voice: AgentVoice;
  language: string;
  personality: AgentPersonality;
  greeting_message: string | null;
  system_prompt: string | null;
  is_active: boolean;
  max_call_duration: number;
  interrupt_sensitivity: InterruptSensitivity;
  created_at: string;
  updated_at: string;
}

export type AgentVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'aura-2-thalia-en' | 'aura-2-zeus-en' | 'aura-2-hera-en' | 'aura-2-apollo-en' | 'aura-2-arcas-en';
export type AgentPersonality = 'professional' | 'friendly' | 'formal' | 'casual';
export type InterruptSensitivity = 'low' | 'medium' | 'high';

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_min: number | null;
  price_max: number | null;
  price_type: PriceType;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PriceType = 'fixed' | 'range' | 'starting_at' | 'call_for_price';

export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string | null;
  conversation_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  custom_fields: Record<string, unknown> | null;
  notes: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Conversation {
  id: string;
  business_id: string;
  agent_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  caller_email: string | null;
  status: ConversationStatus;
  duration_seconds: number | null;
  appointment_booked: boolean;
  callback_requested: boolean;
  sentiment: ConversationSentiment | null;
  summary: string | null;
  source: ConversationSource;
  created_at: string;
  updated_at: string;
  messages?: ConversationMessage[];
}

export type ConversationStatus = 'active' | 'completed' | 'abandoned';
export type ConversationSentiment = 'positive' | 'neutral' | 'negative';
export type ConversationSource = 'widget' | 'embed' | 'direct';

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tool_name: string | null;
  tool_result: Record<string, unknown> | null;
  created_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface FAQ {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  category: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  conversation_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  custom_fields: Record<string, unknown> | null;
  service_interest: string | null;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface EmbeddedWidget {
  id: string;
  business_id: string;
  agent_id: string | null;
  name: string;
  widget_type: WidgetType;
  position: WidgetPosition;
  primary_color: string;
  greeting: string | null;
  is_active: boolean;
  allowed_domains: string[] | null;
  total_impressions: number;
  total_interactions: number;
  created_at: string;
  updated_at: string;
}

export type WidgetType = 'voice' | 'chat';
export type WidgetPosition = 'bottom-right' | 'bottom-left';

export interface AnalyticsEvent {
  id: string;
  business_id: string;
  conversation_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardAnalytics {
  total_conversations: number;
  appointments_booked: number;
  conversion_rate: number;
  avg_call_duration: number;
  callback_requests: number;
  conversations_today: number;
  conversations_this_week: number;
  conversations_this_month: number;
  appointments_today: number;
  appointments_this_week: number;
}

export interface AvailableSlot {
  date: string;
  time: string;
  datetime: string;
}

export interface RealtimeSessionResponse {
  conversationId: string;
  agentName: string;
  voice: string;
  language: string;
  model: string;
  systemPrompt: string;
  tools: unknown[];
  turnDetection: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}

export interface VoiceConnectionState {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  error?: string;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// =============================================
// TELEPHONY TYPES
// =============================================

export type TelephonyProviderType = 'twilio' | 'vapi' | 'vobiz' | 'sip';
export type CallDirection = 'inbound' | 'outbound' | 'both';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'cancelled';
export type LeadCallStatus = 'pending' | 'calling' | 'completed' | 'failed' | 'skipped';
export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'busy' | 'cancelled';

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export interface VapiCredentials {
  apiKey: string;
  assistantId?: string;
}

export interface VobizCredentials {
  apiKey: string;
  userId?: string;
  sipTrunkId: string;
  outboundTrunkId: string;
  sipDomain: string;
  sipUsername: string;
  sipPassword: string;
  outboundNumber: string;
  defaultTransferNumber: string;
}

export interface SipCredentials {
  sipTrunkId: string;
  outboundTrunkId: string;
  sipDomain: string;
  sipUsername: string;
  sipPassword: string;
  outboundNumber: string;
  defaultTransferNumber: string;
  sipRegistrar?: string;
  sipPort?: string;
  sipTransport?: 'udp' | 'tcp' | 'tls';
}

export type TelephonyCredentials = TwilioCredentials | VapiCredentials | VobizCredentials | SipCredentials;

export interface TelephonyProvider {
  id: string;
  business_id: string;
  name: string;
  provider_type: TelephonyProviderType;
  credentials: TelephonyCredentials;
  is_default: boolean;
  is_active: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  business_id: string;
  provider_id: string;
  number: string;
  friendly_name: string | null;
  direction: CallDirection;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider?: TelephonyProvider;
}

export interface InboundConfig {
  id: string;
  business_id: string;
  phone_number_id: string;
  agent_id: string | null;
  greeting_override: string | null;
  lead_capture_enabled: boolean;
  appointment_booking_enabled: boolean;
  faq_enabled: boolean;
  service_info_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phone_number?: PhoneNumber;
  agent?: Agent;
}

export interface OutboundCampaign {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  cron_expression: string | null;
  timezone: string;
  caller_number_id: string | null;
  agent_id: string | null;
  max_concurrent_calls: number;
  call_delay_seconds: number;
  retry_attempts: number;
  retry_delay_minutes: number;
  total_leads: number;
  completed_leads: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  caller_number?: PhoneNumber;
  agent?: Agent;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  custom_fields: Record<string, unknown> | null;
  status: LeadCallStatus;
  call_attempts: number;
  last_attempt_at: string | null;
  call_log_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  call_log?: CallLog;
}

export interface CallLog {
  id: string;
  business_id: string;
  campaign_id: string | null;
  lead_id: string | null;
  conversation_id: string | null;
  phone_number_id: string | null;
  direction: 'inbound' | 'outbound';
  from_number: string | null;
  to_number: string | null;
  status: CallStatus;
  duration_seconds: number | null;
  provider_call_id: string | null;
  provider_type: string | null;
  recording_url: string | null;
  error_message: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  campaign?: OutboundCampaign;
  lead?: CampaignLead;
  conversation?: Conversation;
}

export interface CallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

export interface ProviderCallStatus {
  callId: string;
  status: CallStatus;
  duration?: number;
}
