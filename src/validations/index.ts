import { z } from 'zod';

export const businessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Enter a valid phone number').optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zip: z.string().optional().or(z.literal('')),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  timezone: z.string().min(1, 'Select a timezone'),
});

export const agentSchema = z.object({
  name: z.string().min(2, 'Agent name must be at least 2 characters').max(100),
  voice: z.enum([
    'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer',
    'aura-2-thalia-en', 'aura-2-zeus-en', 'aura-2-hera-en',
    'aura-2-apollo-en', 'aura-2-arcas-en',
  ]),
  language: z.string().default('en'),
  personality: z.enum(['professional', 'friendly', 'formal', 'casual']),
  greeting_message: z.string().max(500).optional().or(z.literal('')),
  system_prompt: z.string().max(2000).optional().or(z.literal('')),
  max_call_duration: z.number().min(60).max(3600).default(600),
  interrupt_sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  is_active: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: z.string().min(2, 'Service name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  duration_minutes: z.number().min(15).max(480).default(60),
  price_type: z.enum(['fixed', 'range', 'starting_at', 'call_for_price']),
  price_min: z.number().min(0).optional().nullable(),
  price_max: z.number().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

export const appointmentSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_phone: z.string().min(10, 'Enter a valid phone number').optional().or(z.literal('')),
  customer_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  custom_fields: z.record(z.unknown()).optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
  scheduled_at: z.string().min(1, 'Appointment date and time is required'),
  duration_minutes: z.number().min(15).max(480).default(60),
  notes: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).default('pending'),
});

export const faqSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(300),
  answer: z.string().min(5, 'Answer must be at least 5 characters').max(2000),
  category: z.string().max(50).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

export const widgetSchema = z.object({
  name: z.string().min(2, 'Widget name is required').max(100),
  agent_id: z.string().uuid().optional().nullable(),
  widget_type: z.enum(['voice', 'chat']).default('voice'),
  position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color').default('#22c55e'),
  greeting: z.string().max(300).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  allowed_domains: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
});

export const businessHoursSchema = z.object({
  hours: z.array(z.object({
    day_of_week: z.number().min(0).max(6),
    is_open: z.boolean(),
    open_time: z.string().optional().nullable(),
    close_time: z.string().optional().nullable(),
  })),
});

export type BusinessFormData = z.infer<typeof businessSchema>;
export type AgentFormData = z.infer<typeof agentSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
export type AppointmentFormData = z.infer<typeof appointmentSchema>;
export type FaqFormData = z.infer<typeof faqSchema>;
export type WidgetFormData = z.infer<typeof widgetSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type BusinessHoursFormData = z.infer<typeof businessHoursSchema>;

// =============================================
// TELEPHONY VALIDATION SCHEMAS
// =============================================

export const twilioCredentialsSchema = z.object({
  accountSid: z.string().min(1, 'Account SID is required'),
  authToken: z.string().min(1, 'Auth Token is required'),
});

export const vapiCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  assistantId: z.string().optional(),
});

export const vobizCredentialsSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  userId: z.string().optional(),
  sipTrunkId: z.string().min(1, 'SIP Trunk ID is required'),
  outboundTrunkId: z.string().min(1, 'Outbound Trunk ID is required'),
  sipDomain: z.string().min(1, 'SIP Domain is required'),
  sipUsername: z.string().min(1, 'SIP Username is required'),
  sipPassword: z.string().min(1, 'SIP Password is required'),
  outboundNumber: z.string().min(10, 'Enter a valid outbound number'),
  defaultTransferNumber: z.string().min(10, 'Enter a valid transfer number'),
});

export const sipCredentialsSchema = z.object({
  sipTrunkId: z.string().min(1, 'SIP Trunk ID is required'),
  outboundTrunkId: z.string().min(1, 'Outbound Trunk ID is required'),
  sipDomain: z.string().min(1, 'SIP Domain is required'),
  sipUsername: z.string().min(1, 'SIP Username is required'),
  sipPassword: z.string().min(1, 'SIP Password is required'),
  outboundNumber: z.string().min(10, 'Enter a valid outbound number'),
  defaultTransferNumber: z.string().min(10, 'Enter a valid transfer number'),
  sipRegistrar: z.string().optional(),
  sipPort: z.string().optional(),
  sipTransport: z.enum(['udp', 'tcp', 'tls']).optional(),
});

export const telephonyProviderSchema = z.object({
  name: z.string().min(2, 'Provider name must be at least 2 characters').max(100),
  provider_type: z.enum(['twilio', 'vapi', 'vobiz', 'sip']),
  credentials: z.union([twilioCredentialsSchema, vapiCredentialsSchema, vobizCredentialsSchema, sipCredentialsSchema]),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  webhook_url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const phoneNumberSchema = z.object({
  provider_id: z.string().uuid('Provider is required'),
  number: z.string().min(10, 'Enter a valid phone number'),
  friendly_name: z.string().max(100).optional().or(z.literal('')),
  direction: z.enum(['inbound', 'outbound', 'both']).default('both'),
  is_active: z.boolean().default(true),
});

export const inboundConfigSchema = z.object({
  phone_number_id: z.string().uuid('Phone number is required'),
  agent_id: z.string().uuid().optional().nullable(),
  greeting_override: z.string().max(500).optional().or(z.literal('')),
  lead_capture_enabled: z.boolean().default(true),
  appointment_booking_enabled: z.boolean().default(true),
  faq_enabled: z.boolean().default(true),
  service_info_enabled: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const outboundCampaignSchema = z.object({
  name: z.string().min(2, 'Campaign name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled']).default('draft'),
  cron_expression: z.string().optional().or(z.literal('')),
  timezone: z.string().default('America/New_York'),
  caller_number_id: z.string().uuid().optional().nullable(),
  agent_id: z.string().uuid().optional().nullable(),
  max_concurrent_calls: z.number().min(1).max(10).default(1),
  call_delay_seconds: z.number().min(0).max(60).default(0),
  retry_attempts: z.number().min(0).max(5).default(0),
  retry_delay_minutes: z.number().min(5).max(1440).default(30),
});

export const campaignLeadSchema = z.object({
  name: z.string().min(2, 'Lead name is required').max(100),
  phone: z.string().min(10, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  custom_fields: z.record(z.unknown()).optional().nullable(),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export type TelephonyProviderFormData = z.infer<typeof telephonyProviderSchema>;
export type PhoneNumberFormData = z.infer<typeof phoneNumberSchema>;
export type InboundConfigFormData = z.infer<typeof inboundConfigSchema>;
export type OutboundCampaignFormData = z.infer<typeof outboundCampaignSchema>;
export type CampaignLeadFormData = z.infer<typeof campaignLeadSchema>;
