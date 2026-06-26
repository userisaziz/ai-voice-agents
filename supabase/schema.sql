-- AI Voice Receptionist Platform - Complete Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable pgvector for RAG embeddings
create extension if not exists vector;

-- =============================================
-- BUSINESSES TABLE
-- =============================================
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  website text,
  logo_url text,
  timezone text not null default 'America/New_York',
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_businesses_owner_id on businesses(owner_id);
create index idx_businesses_slug on businesses(slug);

-- =============================================
-- AGENTS TABLE
-- =============================================
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  voice text not null default 'alloy',
  language text not null default 'en',
  personality text not null default 'professional',
  greeting_message text,
  system_prompt text,
  is_active boolean not null default true,
  max_call_duration integer not null default 600,
  interrupt_sensitivity text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agents_business_id on agents(business_id);

-- =============================================
-- SERVICES TABLE
-- =============================================
create table if not exists services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  price_min numeric(10,2),
  price_max numeric(10,2),
  price_type text not null default 'fixed' check (price_type in ('fixed', 'range', 'starting_at', 'call_for_price')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_services_business_id on services(business_id);

-- =============================================
-- BUSINESS HOURS TABLE
-- =============================================
create table if not exists business_hours (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id, day_of_week)
);

create index idx_business_hours_business_id on business_hours(business_id);

-- =============================================
-- APPOINTMENTS TABLE
-- =============================================
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  conversation_id uuid,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  custom_fields jsonb,
  notes text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_appointments_business_id on appointments(business_id);
create index idx_appointments_scheduled_at on appointments(scheduled_at);
create index idx_appointments_status on appointments(status);
create index idx_appointments_conversation_id on appointments(conversation_id);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  caller_name text,
  caller_phone text,
  caller_email text,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  duration_seconds integer,
  appointment_booked boolean not null default false,
  callback_requested boolean not null default false,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  summary text,
  source text not null default 'widget' check (source in ('widget', 'embed', 'direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_business_id on conversations(business_id);
create index idx_conversations_created_at on conversations(created_at);
create index idx_conversations_status on conversations(status);

-- =============================================
-- CONVERSATION MESSAGES TABLE
-- =============================================
create table if not exists conversation_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_name text,
  tool_result jsonb,
  created_at timestamptz not null default now()
);

create index idx_conversation_messages_conversation_id on conversation_messages(conversation_id);
create index idx_conversation_messages_created_at on conversation_messages(created_at);

-- =============================================
-- FAQS TABLE
-- =============================================
create table if not exists faqs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  category text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_faqs_business_id on faqs(business_id);

-- =============================================
-- LEADS TABLE
-- =============================================
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  name text not null,
  phone text,
  email text,
  custom_fields jsonb,
  service_interest text,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_business_id on leads(business_id);
create index idx_leads_status on leads(status);

-- =============================================
-- EMBEDDED WIDGETS TABLE
-- =============================================
create table if not exists embedded_widgets (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  name text not null default 'Main Widget',
  widget_type text not null default 'voice' check (widget_type in ('voice', 'chat')),
  position text not null default 'bottom-right' check (position in ('bottom-right', 'bottom-left')),
  primary_color text not null default '#22c55e',
  greeting text,
  is_active boolean not null default true,
  allowed_domains text[],
  total_impressions integer not null default 0,
  total_interactions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_embedded_widgets_business_id on embedded_widgets(business_id);

-- =============================================
-- ANALYTICS EVENTS TABLE
-- =============================================
create table if not exists analytics_events (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_analytics_events_business_id on analytics_events(business_id);
create index idx_analytics_events_event_type on analytics_events(event_type);
create index idx_analytics_events_created_at on analytics_events(created_at);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_businesses_updated_at before update on businesses for each row execute function update_updated_at_column();
create trigger update_agents_updated_at before update on agents for each row execute function update_updated_at_column();
create trigger update_services_updated_at before update on services for each row execute function update_updated_at_column();
create trigger update_business_hours_updated_at before update on business_hours for each row execute function update_updated_at_column();
create trigger update_appointments_updated_at before update on appointments for each row execute function update_updated_at_column();
create trigger update_conversations_updated_at before update on conversations for each row execute function update_updated_at_column();
create trigger update_faqs_updated_at before update on faqs for each row execute function update_updated_at_column();
create trigger update_leads_updated_at before update on leads for each row execute function update_updated_at_column();
create trigger update_embedded_widgets_updated_at before update on embedded_widgets for each row execute function update_updated_at_column();
create trigger update_knowledge_sources_updated_at before update on knowledge_sources for each row execute function update_updated_at_column();

-- Telephony triggers
create trigger update_telephony_providers_updated_at before update on telephony_providers for each row execute function update_updated_at_column();
create trigger update_phone_numbers_updated_at before update on phone_numbers for each row execute function update_updated_at_column();
create trigger update_inbound_configs_updated_at before update on inbound_configs for each row execute function update_updated_at_column();
create trigger update_outbound_campaigns_updated_at before update on outbound_campaigns for each row execute function update_updated_at_column();
create trigger update_campaign_leads_updated_at before update on campaign_leads for each row execute function update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table businesses enable row level security;
alter table agents enable row level security;
alter table services enable row level security;
alter table business_hours enable row level security;
alter table appointments enable row level security;
alter table conversations enable row level security;
alter table conversation_messages enable row level security;
alter table faqs enable row level security;
alter table leads enable row level security;
alter table embedded_widgets enable row level security;
alter table analytics_events enable row level security;

-- Businesses RLS
create policy "Users can view their own businesses"
  on businesses for select using (auth.uid() = owner_id);

create policy "Users can insert their own businesses"
  on businesses for insert with check (auth.uid() = owner_id);

create policy "Users can update their own businesses"
  on businesses for update using (auth.uid() = owner_id);

create policy "Users can delete their own businesses"
  on businesses for delete using (auth.uid() = owner_id);

-- Helper function for business ownership check
create or replace function is_business_owner(business_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from businesses
    where id = business_id and owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Agents RLS
create policy "Business owners can manage agents"
  on agents for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Public can view active agents"
  on agents for select using (is_active = true);

-- Services RLS
create policy "Business owners can manage services"
  on services for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Public can view active services"
  on services for select using (is_active = true);

-- Business Hours RLS
create policy "Business owners can manage hours"
  on business_hours for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Public can view business hours"
  on business_hours for select using (true);

-- Appointments RLS
create policy "Business owners can manage appointments"
  on appointments for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Service role can insert appointments"
  on appointments for insert with check (true);

-- Conversations RLS
create policy "Business owners can manage conversations"
  on conversations for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Service role can insert conversations"
  on conversations for insert with check (true);

create policy "Service role can update conversations"
  on conversations for update using (true) with check (true);

-- Conversation Messages RLS
create policy "Business owners can view messages"
  on conversation_messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and is_business_owner(c.business_id)
    )
  );

create policy "Service role can insert messages"
  on conversation_messages for insert with check (true);

-- FAQs RLS
create policy "Business owners can manage faqs"
  on faqs for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Public can view active faqs"
  on faqs for select using (is_active = true);

-- Leads RLS
create policy "Business owners can manage leads"
  on leads for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Service role can insert leads"
  on leads for insert with check (true);

create policy "Service role can update leads"
  on leads for update using (true) with check (true);

-- Embedded Widgets RLS
create policy "Business owners can manage widgets"
  on embedded_widgets for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Public can view active widgets"
  on embedded_widgets for select using (is_active = true);

create policy "Service role can update widgets"
  on embedded_widgets for update using (true) with check (true);

-- Analytics Events RLS
create policy "Business owners can view analytics"
  on analytics_events for select using (is_business_owner(business_id));

create policy "Service role can insert events"
  on analytics_events for insert with check (true);

-- Telephony Providers RLS
alter table telephony_providers enable row level security;

create policy "Business owners can manage telephony providers"
  on telephony_providers for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

-- Phone Numbers RLS
alter table phone_numbers enable row level security;

create policy "Business owners can manage phone numbers"
  on phone_numbers for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

-- Inbound Configs RLS
alter table inbound_configs enable row level security;

create policy "Business owners can manage inbound configs"
  on inbound_configs for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

-- Outbound Campaigns RLS
alter table outbound_campaigns enable row level security;

create policy "Business owners can manage outbound campaigns"
  on outbound_campaigns for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Service role can update campaigns"
  on outbound_campaigns for update using (true) with check (true);

-- Campaign Leads RLS
alter table campaign_leads enable row level security;

create policy "Business owners can manage campaign leads"
  on campaign_leads for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Service role can update campaign leads"
  on campaign_leads for update using (true) with check (true);

-- Call Logs RLS
alter table call_logs enable row level security;

create policy "Business owners can view call logs"
  on call_logs for select using (is_business_owner(business_id));

create policy "Service role can insert call logs"
  on call_logs for insert with check (true);

create policy "Service role can update call logs"
  on call_logs for update using (true) with check (true);

-- Knowledge Sources RLS
alter table knowledge_sources enable row level security;

create policy "Business owners can manage knowledge sources"
  on knowledge_sources for all
  using (is_business_owner(business_id))
  with check (is_business_owner(business_id));

create policy "Service role can manage knowledge sources"
  on knowledge_sources for all using (true) with check (true);

-- Knowledge Chunks RLS
alter table knowledge_chunks enable row level security;

create policy "Business owners can view knowledge chunks"
  on knowledge_chunks for select using (is_business_owner(business_id));

create policy "Service role can manage knowledge chunks"
  on knowledge_chunks for all using (true) with check (true);

-- =============================================
-- TELEPHONY PROVIDERS TABLE
-- =============================================
create table if not exists telephony_providers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  provider_type text not null check (provider_type in ('twilio', 'vapi', 'vobiz', 'sip')),
  credentials jsonb not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_telephony_providers_business_id on telephony_providers(business_id);
create index idx_telephony_providers_provider_type on telephony_providers(provider_type);

-- =============================================
-- PHONE NUMBERS TABLE
-- =============================================
create table if not exists phone_numbers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  provider_id uuid not null references telephony_providers(id) on delete cascade,
  number text not null,
  friendly_name text,
  direction text not null default 'both' check (direction in ('inbound', 'outbound', 'both')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, number)
);

create index idx_phone_numbers_business_id on phone_numbers(business_id);
create index idx_phone_numbers_number on phone_numbers(number);

-- =============================================
-- INBOUND CONFIGS TABLE
-- =============================================
create table if not exists inbound_configs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  phone_number_id uuid not null references phone_numbers(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  greeting_override text,
  lead_capture_enabled boolean not null default true,
  appointment_booking_enabled boolean not null default true,
  faq_enabled boolean not null default true,
  service_info_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(phone_number_id)
);

create index idx_inbound_configs_business_id on inbound_configs(business_id);
create index idx_inbound_configs_phone_number_id on inbound_configs(phone_number_id);

-- =============================================
-- OUTBOUND CAMPAIGNS TABLE
-- =============================================
create table if not exists outbound_campaigns (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled')),
  cron_expression text,
  timezone text not null default 'America/New_York',
  caller_number_id uuid references phone_numbers(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  max_concurrent_calls integer not null default 1,
  call_delay_seconds integer not null default 0,
  retry_attempts integer not null default 0,
  retry_delay_minutes integer not null default 30,
  total_leads integer not null default 0,
  completed_leads integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_outbound_campaigns_business_id on outbound_campaigns(business_id);
create index idx_outbound_campaigns_status on outbound_campaigns(status);

-- =============================================
-- CAMPAIGN LEADS TABLE
-- =============================================
create table if not exists campaign_leads (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references outbound_campaigns(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  custom_fields jsonb,
  status text not null default 'pending' check (status in ('pending', 'calling', 'completed', 'failed', 'skipped')),
  call_attempts integer not null default 0,
  last_attempt_at timestamptz,
  call_log_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaign_leads_campaign_id on campaign_leads(campaign_id);
create index idx_campaign_leads_status on campaign_leads(status);
create index idx_campaign_leads_business_id on campaign_leads(business_id);

-- =============================================
-- CALL LOGS TABLE
-- =============================================
create table if not exists call_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references outbound_campaigns(id) on delete set null,
  lead_id uuid references campaign_leads(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  phone_number_id uuid references phone_numbers(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_number text,
  to_number text,
  status text not null default 'initiated' check (status in ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'cancelled')),
  duration_seconds integer,
  provider_call_id text,
  provider_type text,
  recording_url text,
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_call_logs_business_id on call_logs(business_id);
create index idx_call_logs_campaign_id on call_logs(campaign_id);
create index idx_call_logs_direction on call_logs(direction);
create index idx_call_logs_status on call_logs(status);
create index idx_call_logs_created_at on call_logs(created_at);

-- =============================================
-- KNOWLEDGE SOURCES TABLE (RAG)
-- =============================================
create table if not exists knowledge_sources (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'file', 'manual')),
  source_url text,
  file_name text,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  error_message text,
  chunk_count integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_knowledge_sources_business_id on knowledge_sources(business_id);
create index idx_knowledge_sources_status on knowledge_sources(status);

-- =============================================
-- KNOWLEDGE CHUNKS TABLE (RAG)
-- =============================================
create table if not exists knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references knowledge_sources(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  content text not null,
  content_tsv tsvector,
  embedding vector(384),
  chunk_index integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_knowledge_chunks_source_id on knowledge_chunks(source_id);
create index idx_knowledge_chunks_business_id on knowledge_chunks(business_id);
-- HNSW index for fast vector similarity search
create index idx_knowledge_chunks_embedding on knowledge_chunks using hnsw (embedding vector_cosine_ops);
-- GIN index for full-text search
create index idx_knowledge_chunks_content_tsv on knowledge_chunks using gin (content_tsv);

-- Auto-update tsvector when content changes
create or replace function update_content_tsv() returns trigger as $$
begin
  new.content_tsv := to_tsvector('english', coalesce(new.content, ''));
  return new;
end;
$$ language plpgsql;

create trigger trg_update_content_tsv before insert or update of content on knowledge_chunks
  for each row execute function update_content_tsv();

-- Hybrid search RPC function (vector + FTS with RRF fusion)
create or replace function search_knowledge(
  query_embedding vector(384),
  query_text text,
  p_business_id uuid,
  match_count integer default 5,
  match_threshold float default 0.3
) returns table (
  id uuid,
  content text,
  source_id uuid,
  source_title text,
  source_type text,
  similarity float,
  fts_rank float,
  score float,
  metadata jsonb
) as $$
with vector_results as (
  select
    kc.id,
    kc.content,
    kc.source_id,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity,
    row_number() over (order by 1 - (kc.embedding <=> query_embedding) desc) as vec_rank
  from knowledge_chunks kc
  where kc.business_id = p_business_id
    and kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count * 2
),
fts_results as (
  select
    kc.id,
    kc.content,
    kc.source_id,
    kc.metadata,
    ts_rank(kc.content_tsv, plainto_tsquery('english', query_text)) as fts_rank,
    row_number() over (order by ts_rank(kc.content_tsv, plainto_tsquery('english', query_text)) desc) as fts_row
  from knowledge_chunks kc
  where kc.business_id = p_business_id
    and kc.content_tsv @@ plainto_tsquery('english', query_text)
  order by fts_rank desc
  limit match_count * 2
),
combined as (
  select
    coalesce(v.id, f.id) as chunk_id,
    coalesce(v.content, f.content) as content,
    coalesce(v.source_id, f.source_id) as source_id,
    coalesce(v.metadata, f.metadata) as metadata,
    coalesce(v.similarity, 0) as similarity,
    coalesce(f.fts_rank, 0) as fts_rank,
    -- Reciprocal Rank Fusion: score = sum(1 / (k + rank))
    (
      coalesce(1.0 / (60 + v.vec_rank), 0) +
      coalesce(1.0 / (60 + f.fts_row), 0)
    ) as score
  from vector_results v
  full outer join fts_results f on v.id = f.id
)
select
  c.chunk_id as id,
  c.content,
  c.source_id,
  ks.title as source_title,
  ks.source_type,
  c.similarity,
  c.fts_rank,
  c.score,
  c.metadata
from combined c
join knowledge_sources ks on ks.id = c.source_id
order by c.score desc
limit match_count;
$$ language sql security definer;

-- =============================================
-- SEED DEFAULT BUSINESS HOURS (called via function)
-- =============================================
create or replace function create_default_business_hours(p_business_id uuid)
returns void as $$
begin
  insert into business_hours (business_id, day_of_week, open_time, close_time, is_open)
  values
    (p_business_id, 0, null, null, false),
    (p_business_id, 1, '08:00', '18:00', true),
    (p_business_id, 2, '08:00', '18:00', true),
    (p_business_id, 3, '08:00', '18:00', true),
    (p_business_id, 4, '08:00', '18:00', true),
    (p_business_id, 5, '08:00', '18:00', true),
    (p_business_id, 6, '09:00', '14:00', true)
  on conflict (business_id, day_of_week) do nothing;
end;
$$ language plpgsql security definer;

-- =============================================
-- TELEPHONY pg_cron SETUP (run manually)
-- =============================================
-- Enable pg_cron extension (requires superuser)
-- create extension if not exists pg_cron;

-- Schedule campaign processing (every minute)
-- select cron.schedule(
--   'process-outbound-campaigns',
--   '* * * * *',
--   $$select net.http_post(
--     url := 'https://your-project.supabase.co/functions/v1/process-campaign',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );
