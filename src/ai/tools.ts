import type { Business, Service, BusinessHours } from '@/types';
import { formatPrice } from '@/lib/utils';
import { DAYS_OF_WEEK } from '@/constants';

/**
 * Deepgram Voice Agent function definitions.
 * Format: { name, description, parameters, endpoint? }
 * Client-side functions have no endpoint — the SDK triggers FunctionCallRequest events.
 * Server-side functions include an endpoint URL.
 */
export const DEEPGRAM_FUNCTIONS = [
  {
    name: 'getBusinessHours',
    description: 'Get the business operating hours for each day of the week',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getServices',
    description: 'Get all available services with pricing and duration',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'searchProducts',
    description: 'Search for products in the Marsa Tijarah marketplace by keyword, category, or specifications. Returns approved products with pricing and supplier information.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword for products (e.g., "steel", "cement", "copper wire")' },
        category: { type: 'string', description: 'Filter by category name or slug (optional)' },
        min_price: { type: 'number', description: 'Minimum price filter (optional)' },
        max_price: { type: 'number', description: 'Maximum price filter (optional)' },
        limit: { type: 'number', description: 'Max results to return, default 10 (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getCategories',
    description: 'Get all available product categories in the Marsa Tijarah marketplace',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getTopSellers',
    description: 'Get top-rated premium sellers from the Marsa Tijarah marketplace, optionally filtered by category',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter sellers by category (optional)' },
        limit: { type: 'number', description: 'Max results to return, default 5 (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'getAvailableSlots',
    description: 'Get available appointment time slots for a specific date',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to check availability for in YYYY-MM-DD format',
        },
        service_id: {
          type: 'string',
          description: 'Optional service ID to check duration-specific availability',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'createAppointment',
    description: 'Book an appointment for a customer',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Full name of the customer' },
        customer_phone: { type: 'string', description: 'Customer phone number' },
        customer_email: { type: 'string', description: 'Customer email address (optional)' },
        service_id: { type: 'string', description: 'ID of the service being booked' },
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime for the appointment (e.g., 2024-01-15T10:00:00)' },
        custom_fields: { type: 'object', description: 'Any additional business-specific intake fields as key-value pairs' },
        notes: { type: 'string', description: 'Any additional notes from the customer' },
      },
      required: ['customer_name', 'customer_phone', 'scheduled_at'],
    },
  },
  {
    name: 'createLead',
    description: 'Capture a customer lead when they are interested but not ready to book',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer name' },
        phone: { type: 'string', description: 'Customer phone number' },
        email: { type: 'string', description: 'Customer email (optional)' },
        service_interest: { type: 'string', description: 'What service they are interested in' },
        custom_fields: { type: 'object', description: 'Any additional business-specific intake fields as key-value pairs' },
        notes: { type: 'string' },
      },
      required: ['name', 'phone'],
    },
  },
  {
    name: 'requestCallback',
    description: 'Schedule a callback for a customer who wants to be called back',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Customer name' },
        phone: { type: 'string', description: 'Callback phone number' },
        preferred_time: { type: 'string', description: 'Preferred callback time' },
        reason: { type: 'string', description: 'Reason for the callback' },
      },
      required: ['name', 'phone'],
    },
  },
  {
    name: 'searchKnowledge',
    description: 'Search the business knowledge base for information about products, services, policies, or any other business-related questions. Use this when the customer asks about something not covered by other tools.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query describing what information is needed' },
      },
      required: ['query'],
    },
  },
];

/**
 * OpenAI Realtime tool format (kept for backwards compatibility / future use).
 */
export const REALTIME_TOOLS = DEEPGRAM_FUNCTIONS.map((fn) => ({
  type: 'function' as const,
  ...fn,
}));

export function buildSystemPrompt(
  business: Business,
  services: Service[],
  hours: BusinessHours[],
  agentSystemPrompt: string | null,
  faqs: Array<{ question: string; answer: string }>,
  language = 'en',
  greetingMessage?: string | null,
  ragContext?: string
): string {
  // Only add language/greeting instructions if the agent's own prompt doesn't
  // already cover them — avoids redundant directives that cause greeting loops.
  const agentHasLanguageInstructions = agentSystemPrompt
    ? /language\s*selection|bilingual\s*greeting|choose\s*(between\s*)?(english|arabic)/i.test(agentSystemPrompt)
    : false;

  const langInstruction = agentHasLanguageInstructions
    ? '' // Agent prompt already handles language selection
    : language === 'en'
      ? 'LANGUAGE REQUIREMENT: Start by asking the customer to choose between English or Arabic. After they choose, respond ONLY in their chosen language for the entire conversation.'
      : `LANGUAGE REQUIREMENT: Start by asking the customer to choose between English or Arabic. After they choose, respond ONLY in their chosen language for the entire conversation. Default language preference: ${language}.`;

  const servicesText = services.length > 0
    ? services.map((s) => `- ${s.name}: ${formatPrice(s.price_min, s.price_max, s.price_type)}, ${s.duration_minutes} minutes`).join('\n')
    : 'Services not configured yet.';

  const hoursText = hours.map((h) => {
    if (!h.is_open) return `${DAYS_OF_WEEK[h.day_of_week]}: Closed`;
    return `${DAYS_OF_WEEK[h.day_of_week]}: ${h.open_time} - ${h.close_time}`;
  }).join('\n');

  const faqsText = faqs.length > 0
    ? faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    : '';

  // Greeting is sent to Deepgram as the `agent.greeting` field, so the LLM
  // should NOT be told to repeat it. Just instruct to move forward after greeting.
  const greetingInstruction = agentHasLanguageInstructions
    ? 'GREETING: A bilingual greeting is played automatically. After the greeting, immediately proceed to help the caller. Do NOT repeat the greeting or re-ask for language preference.'
    : greetingMessage
      ? `GREETING: A greeting is played automatically. After it, proceed to help the caller. Do NOT repeat the greeting.`
      : `GREETING: Greet the caller briefly, then ask how you can help. Do NOT repeat the greeting.`;

  const languageRules = agentHasLanguageInstructions
    ? '- After the customer selects a language, speak ONLY in their chosen language — never re-ask for language preference'
    : '- Start by asking the customer to choose between English or Arabic\n- After language selection, speak ONLY in the customer\'s chosen language';

  // When a greeting is configured via Deepgram's agent.greeting field, it plays
  // automatically as audio. Strip any lines from the agent prompt that would
  // cause the LLM to regenerate it (prevents greeting loops).
  let processedAgentPrompt = agentSystemPrompt || '';
  if (greetingMessage && processedAgentPrompt) {
    processedAgentPrompt = processedAgentPrompt
      .split('\n')
      .filter((line) => !/^[-•]\s*(Start with a|Generate a|Say a|Deliver a).*(greeting|welcome)/i.test(line.trim()))
      .join('\n');
  }

  return `${langInstruction ? langInstruction + '\n\n' : ''}${greetingInstruction}

${processedAgentPrompt}

BUSINESS INFORMATION:
Business Name: ${business.name}
Phone: ${business.phone || 'Not provided'}
Email: ${business.email || 'Not provided'}
Address: ${[business.address, business.city, business.state, business.zip].filter(Boolean).join(', ') || 'Not provided'}
Website: ${business.website || 'Not provided'}
Timezone: ${business.timezone}

SERVICES OFFERED:
${servicesText}

BUSINESS HOURS:
${hoursText}

${faqsText ? `FREQUENTLY ASKED QUESTIONS:\n${faqsText}` : ''}
${ragContext ? ragContext : ''}

IMPORTANT RULES:
${languageRules}
- Always collect customer name and phone before booking
- Always use the available tools to check slots before confirming times
- Never make up pricing - use the getServices tool for accurate pricing
- If a customer wants to book, use createAppointment tool
- If customer is not ready to book, use createLead to capture their information
- If customer requests a callback, use requestCallback tool
- Be professional, helpful, and concise
- Today's date context: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}
