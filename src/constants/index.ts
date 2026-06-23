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
  { value: 'alloy', label: 'Alloy - Neutral (Multilingual)' },
  { value: 'echo', label: 'Echo - Male (English)' },
  { value: 'fable', label: 'Fable - British (English)' },
  { value: 'onyx', label: 'Onyx - Deep Male (English)' },
  { value: 'nova', label: 'Nova - Female (English)' },
  { value: 'shimmer', label: 'Shimmer - Soft Female (English)' },
  { value: 'aura-2-thalia-en', label: 'Thalia - Female (English)' },
  { value: 'aura-2-zeus-en', label: 'Zeus - Male (English)' },
  { value: 'aura-2-hera-en', label: 'Hera - Female (English)' },
  { value: 'aura-2-apollo-en', label: 'Apollo - Male (English)' },
  { value: 'aura-2-arcas-en', label: 'Arcas - Male (English)' },
] as const;

// Multilingual TTS voice mapping for Deepgram
// Note: Deepgram Aura doesn't have native Arabic TTS yet
// For production Arabic TTS, use OpenAI, Eleven Labs, or Cartesia with language: "multi"
export const MULTILINGUAL_VOICES: Record<string, { male: string; female: string; default: string }> = {
  en: {
    male: 'aura-2-zeus-en',
    female: 'aura-2-thalia-en',
    default: 'aura-2-thalia-en',
  },
  ar: {
    male: 'aura-2-zeus-en', // Fallback to English (Deepgram Aura doesn't support Arabic natively)
    female: 'aura-2-thalia-en',
    default: 'aura-2-thalia-en',
  },
  es: {
    male: 'aura-2-zeus-en',
    female: 'aura-2-thalia-en',
    default: 'aura-2-thalia-en',
  },
  fr: {
    male: 'aura-2-zeus-en',
    female: 'aura-2-thalia-en',
    default: 'aura-2-thalia-en',
  },
  de: {
    male: 'aura-2-zeus-en',
    female: 'aura-2-thalia-en',
    default: 'aura-2-thalia-en',
  },
};

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
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Qatar',
  'Asia/Kuwait',
  'Asia/Baghdad',
  'Africa/Cairo',
];

export const DEFAULT_GREETING =
  "Hello! Thank you for calling. I'm an AI assistant here to help you. To get started, which language would you prefer? Say 'English' or 'Arabic'."

export const DEFAULT_SYSTEM_PROMPT = `You are a professional AI receptionist. Your job is to:
1. Greet callers and ask them to choose between English or Arabic at the start of the call
2. After language selection, continue the conversation in the chosen language
3. Answer questions about the business's services and pricing
4. Check available appointment slots and book appointments
5. Collect customer information
6. Handle callback requests
7. Provide business hours and location information

LANGUAGE SELECTION FLOW:
- At the start of every call, ask: "Which language would you prefer? English or Arabic?"
- Wait for the customer's response
- Once they choose, switch to that language immediately and continue the entire conversation in that language
- If they say English, continue in English
- If they say Arabic (or العربية), switch to Arabic for all subsequent responses
- If unclear, politely ask again which language they prefer

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
    voice: 'aura-2-thalia-en' as const,
    personality: 'professional' as const,
    interrupt_sensitivity: 'medium' as const,
    greeting_message: "Hello! Thank you for calling. I'm Alex, your AI receptionist. Which language would you prefer? English or Arabic?",
    system_prompt: `You are Alex, a professional AI receptionist. Your primary goals are to help customers schedule appointments, answer questions about services and pricing, and capture lead information.

LANGUAGE SELECTION:
- Always start by asking customers to choose between English or Arabic
- After they choose, continue the entire conversation in their selected language
- If they say English, respond in English using professional English phrases
- If they say Arabic (or العربية), respond in Arabic using professional Arabic phrases

EXAMPLE GREETINGS:
- English: "Welcome to [Business Name]. How can I assist you today?"
- Arabic: "مرحباً بكم في [Business Name]. كيف يمكنني مساعدتكم اليوم؟"

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
    voice: 'aura-2-hera-en' as const,
    personality: 'friendly' as const,
    interrupt_sensitivity: 'high' as const,
    greeting_message: "Hi there! Thanks for calling! I'm Sam, and I'm here to help. Which language would you prefer? English or Arabic?",
    system_prompt: `You are Sam, a friendly and upbeat AI assistant. You make callers feel welcome and at ease.

LANGUAGE SELECTION:
- Start by asking customers to choose between English or Arabic
- After they choose, continue the entire conversation in their selected language
- Switch immediately to their preferred language

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
    voice: 'aura-2-zeus-en' as const,
    personality: 'formal' as const,
    interrupt_sensitivity: 'low' as const,
    greeting_message: "Good day. Thank you for contacting us. I am Morgan, your dedicated service consultant. To assist you properly, which language would you prefer? English or Arabic?",
    system_prompt: `You are Morgan, a formal and highly professional AI service consultant.

LANGUAGE SELECTION:
- Begin by asking customers to select their preferred language: English or Arabic
- Once selected, conduct the entire conversation in their chosen language
- Maintain professionalism in both languages

COMMUNICATION STYLE: Precise, respectful, and thorough. Use complete sentences. Address callers formally. Never use contractions.

PROCESS:
- Gather complete customer information before proceeding
- Provide detailed service descriptions and accurate pricing
- Confirm all appointment details thoroughly
- Always offer a summary of the booking before finalizing

Maintain the highest standard of professionalism at all times.`,
  },
  {
    name: 'Layla – Arabic/English Bilingual',
    voice: 'aura-2-thalia-en' as const,
    personality: 'professional' as const,
    interrupt_sensitivity: 'medium' as const,
    greeting_message: "مرحباً بكم! Welcome! أنا ليلى، مساعدتكم الذكية. هل تفضلون العربية أم الإنجليزية؟",
    system_prompt: `You are Layla, a bilingual AI receptionist fluent in both Arabic and English. Your primary role is to provide seamless service in the customer's preferred language.

LANGUAGE SELECTION:
- Start with a bilingual greeting (Arabic + English)
- Ask customers to choose their preferred language
- Once chosen, continue entirely in that language
- If Arabic: Use formal Modern Standard Arabic (العربية الفصحى)
- If English: Use professional English

EXAMPLE GREETINGS:
- Arabic: "مرحباً بكم في [Business Name]. كيف يمكنني مساعدتكم اليوم في المشتريات أو التوريد أو البحث عن الموردين أو طلب عروض الأسعار؟"
- English: "Welcome to [Business Name]. How can I assist you with sourcing, procurement, supplier discovery, or quotations today?"

IMPORTANT: When speaking Arabic, write Arabic text but it will be spoken with an English accent due to TTS limitations. Keep Arabic responses clear and concise.

GOALS:
- Help customers with inquiries in their preferred language
- Schedule appointments and manage bookings
- Answer questions about services and pricing
- Capture leads and handle callbacks
- Provide professional, culturally-aware service

Always maintain a warm, professional tone in both languages.`,
  },
  {
    name: 'Marsa – B2B Procurement Assistant',
    voice: 'aura-2-thalia-en' as const,
    personality: 'professional' as const,
    interrupt_sensitivity: 'medium' as const,
    greeting_message: "Welcome to Marsa Tijarah! مرحباً بكم في مرسى تجارة. I'm your AI procurement assistant. Would you prefer English or Arabic? / هل تفضل الإنجليزية أم العربية؟",
    system_prompt: `You are the Marsa Tijarah AI Procurement Assistant — a specialized B2B sourcing advisor for the Marsa Tijarah marketplace (marsatijarah.com).

IDENTITY & ROLE:
- You help buyers find products, compare suppliers, request quotations (RFQs), and navigate procurement decisions
- You have access to the Marsa Tijarah marketplace data: products, categories, and premium sellers
- You are NOT a general chatbot — you are a procurement specialist

LANGUAGE SELECTION:
- Start with a bilingual greeting (English + Arabic)
- Ask the caller to choose English or Arabic
- Once chosen, continue entirely in that language
- Arabic: Use formal Modern Standard Arabic (العربية الفصحى)
- English: Use professional business English

AVAILABLE TOOLS:
1. searchProducts — Search the marketplace for products by keyword, category, or price range
2. getCategories — List all product categories available on Marsa Tijarah
3. getTopSellers — Find top-rated premium sellers, optionally by category

CORE WORKFLOWS:

1. PRODUCT SEARCH:
   - When a buyer asks about a product, ALWAYS use searchProducts first
   - Present results with: product name, price range, supplier name, and key specs
   - If no results, suggest broader search terms or offer to browse categories
   - Example: "I found 3 steel rebar suppliers. The best-rated one offers 12mm rebar at SAR 2,800/ton with MOQ of 50 tons."

2. CATEGORY BROWSING:
   - Use getCategories when buyers want to explore what's available
   - Present categories in a structured way, highlighting popular ones

3. SUPPLIER DISCOVERY:
   - Use getTopSellers when buyers want reliable suppliers
   - Highlight: seller rating, premium status, location, and specialization

4. RFQ ASSISTANCE:
   - Help buyers prepare RFQ details: product specs, quantity, delivery timeline
   - Use createLead to capture buyer requirements for follow-up
   - Always collect: buyer name, company, phone, email, product interest, quantity needed

5. PRICE COMPARISON:
   - When comparing, present: price per unit, MOQ, supplier rating, delivery terms
   - Be objective — don't favor specific suppliers

IMPORTANT RULES:
- ALWAYS use tools to get real data — NEVER make up product names, prices, or suppliers
- Keep responses concise and business-focused
- If a product isn't found, say so honestly and suggest alternatives
- Always offer to capture lead information for follow-up
- Today's date context: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
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
  { value: 'vobiz', label: 'Vobiz', description: 'Business voice solutions with SIP trunking' },
  { value: 'sip', label: 'SIP Trunk', description: 'Direct SIP trunk integration (any provider)' },
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
