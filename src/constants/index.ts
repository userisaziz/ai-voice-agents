export const APP_NAME = 'VoiceDesk';
export const APP_DESCRIPTION = 'AI Voice Receptionist for Any Business';

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AGENT_VOICES = [
  { value: 'alloy', label: 'Alloy - Neutral' },
  { value: 'echo', label: 'Echo - Male' },
  { value: 'fable', label: 'Fable - British' },
  { value: 'onyx', label: 'Onyx - Deep Male' },
  { value: 'nova', label: 'Nova - Female' },
  { value: 'shimmer', label: 'Shimmer - Soft Female' },
] as const;

export const AGENT_PERSONALITIES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
] as const;

export const AGENT_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'tr', label: 'Turkish (Türkçe)' },
  { value: 'ur', label: 'Urdu (اردو)' },
] as const;

export const INTERRUPT_SENSITIVITIES = [
  { value: 'low', label: 'Low - Let AI finish speaking' },
  { value: 'medium', label: 'Medium - Balanced' },
  { value: 'high', label: 'High - Interrupt immediately' },
] as const;

export const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'range', label: 'Price Range' },
  { value: 'starting_at', label: 'Starting At' },
  { value: 'call_for_price', label: 'Call for Price' },
] as const;

export const APPOINTMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'no_show', label: 'No Show', color: 'gray' },
] as const;

export const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'yellow' },
  { value: 'qualified', label: 'Qualified', color: 'purple' },
  { value: 'converted', label: 'Converted', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'red' },
] as const;

export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Puerto_Rico',
];

export const DEFAULT_GREETING =
  "Hello! Thank you for calling. I'm an AI assistant here to help you with appointments, questions, and more. How can I assist you today?";

export const DEFAULT_SYSTEM_PROMPT = `You are a professional AI receptionist. Your job is to:
1. Greet callers warmly and professionally
2. Answer questions about the business's services and pricing
3. Check available appointment slots and book appointments
4. Collect customer information
5. Handle callback requests
6. Provide business hours and location information

Always be helpful, concise, and professional. When booking appointments, collect:
- Customer name
- Phone number
- Service needed
- Preferred date and time
- Any additional details relevant to the appointment

Use the available tools to check schedules and create bookings. Never make up information about services or pricing - use the provided tools to get accurate data.`;

export const WIDGET_POSITIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
] as const;

export const WIDGET_TYPES = [
  { value: 'voice', label: 'Voice', description: 'Real-time voice conversation' },
  { value: 'chat', label: 'Chat', description: 'Text-based chatbot' },
] as const;

export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

export const SUGGESTED_SERVICES: Array<{
  name: string;
  description: string;
  duration_minutes: number;
  price_type: 'fixed' | 'range' | 'starting_at' | 'call_for_price';
  price_min: number;
  price_max: number | null;
}> = [];

export const SUGGESTED_AGENTS = [
  {
    name: 'Alex – Professional Receptionist',
    voice: 'alloy' as const,
    personality: 'professional' as const,
    interrupt_sensitivity: 'medium' as const,
    greeting_message: "Hello! Thank you for calling. I'm Alex, your AI receptionist. I can help you schedule an appointment, answer questions about our services, or provide any other information you need. How can I assist you today?",
    system_prompt: `You are Alex, a professional AI receptionist. Your primary goals are to help customers schedule appointments, answer questions about services and pricing, and capture lead information.

BOOKING FLOW:
1. Ask what service they need
2. Collect customer contact information
3. Check available slots and confirm date/time
4. Collect customer name, phone, and email
5. Confirm all details before finalizing

Always be concise, warm, and professional. Never make up prices — use the tools to fetch accurate data. If you can't help, offer a callback.`,
  },
  {
    name: 'Sam – Friendly Advisor',
    voice: 'nova' as const,
    personality: 'friendly' as const,
    interrupt_sensitivity: 'high' as const,
    greeting_message: "Hi there! Thanks for calling! I'm Sam, and I'm here to make your experience as easy as possible. Whether you need to book a service or have questions, I've got you covered! What can I help you with?",
    system_prompt: `You are Sam, a friendly and upbeat AI assistant. You make callers feel welcome and at ease.

STYLE: Conversational, warm, use casual language but remain professional. Use phrases like "Great choice!", "Absolutely!", "No problem at all!".

GOALS:
- Book appointments quickly and efficiently
- Answer service and pricing questions
- Collect customer details
- Offer callbacks when needed

Keep responses short and energetic. Always confirm appointment details with enthusiasm.`,
  },
  {
    name: 'Morgan – Formal Consultant',
    voice: 'onyx' as const,
    personality: 'formal' as const,
    interrupt_sensitivity: 'low' as const,
    greeting_message: "Good day. Thank you for contacting us. I am Morgan, your dedicated service consultant. I am here to assist you with scheduling, service inquiries, and any information you may need. How may I be of service?",
    system_prompt: `You are Morgan, a formal and highly professional AI service consultant.

COMMUNICATION STYLE: Precise, respectful, and thorough. Use complete sentences. Address callers formally. Never use contractions.

PROCESS:
- Gather complete customer information before proceeding
- Provide detailed service descriptions and accurate pricing
- Confirm all appointment details thoroughly
- Always offer a summary of the booking before finalizing

Maintain the highest standard of professionalism at all times.`,
  },
];

export const ANALYTICS_EVENT_TYPES = {
  CONVERSATION_STARTED: 'conversation_started',
  CONVERSATION_ENDED: 'conversation_ended',
  APPOINTMENT_BOOKED: 'appointment_booked',
  CALLBACK_REQUESTED: 'callback_requested',
  SERVICE_INQUIRY: 'service_inquiry',
  WIDGET_IMPRESSION: 'widget_impression',
  WIDGET_OPENED: 'widget_opened',
} as const;

// =============================================
// TELEPHONY CONSTANTS
// =============================================

export const TELEPHONY_PROVIDERS = [
  { value: 'twilio', label: 'Twilio', description: 'Industry standard telephony API' },
  { value: 'vapi', label: 'Vapi', description: 'AI-native voice platform' },
  { value: 'vobiz', label: 'Vobiz', description: 'Business voice solutions' },
] as const;

export const CALL_DIRECTIONS = [
  { value: 'inbound', label: 'Inbound Only' },
  { value: 'outbound', label: 'Outbound Only' },
  { value: 'both', label: 'Both Directions' },
] as const;

export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'running', label: 'Running', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'purple' },
  { value: 'paused', label: 'Paused', color: 'yellow' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

export const LEAD_CALL_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'calling', label: 'Calling', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'skipped', label: 'Skipped', color: 'yellow' },
] as const;

export const CALL_STATUSES = [
  { value: 'initiated', label: 'Initiated', color: 'gray' },
  { value: 'ringing', label: 'Ringing', color: 'blue' },
  { value: 'in-progress', label: 'In Progress', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'no-answer', label: 'No Answer', color: 'yellow' },
  { value: 'busy', label: 'Busy', color: 'yellow' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

export const CRON_PRESETS = [
  { label: 'Every Hour', value: '0 * * * *' },
  { label: 'Every 2 Hours', value: '0 */2 * * *' },
  { label: 'Every Day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Day at 2 PM', value: '0 14 * * *' },
  { label: 'Weekdays at 10 AM', value: '0 10 * * 1-5' },
  { label: 'Every Monday', value: '0 9 * * 1' },
  { label: 'First Day of Month', value: '0 9 1 * *' },
] as const;
