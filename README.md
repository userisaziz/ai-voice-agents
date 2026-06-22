# AI Voice Agents SaaS

AI-powered voice assistant platform for businesses built with Next.js, Deepgram Voice Agent, and Supabase.

## Project Overview

Build & Deploy AI Voice Agents for Receptionists, Car Repair Shops, Restaurants & Healthcare | Next.js, LLM & Supabase

In this full-stack AI SaaS tutorial, you’ll learn how to create and deploy powerful AI Voice Agents for real businesses using Next.js, LLMs, and Supabase.

We’ll build AI-powered voice assistants that can handle customer conversations, answer questions, manage appointments, and automate business workflows for industries like:

- Receptionist & Front Desk Services
- Car Repair & Auto Service Shops
- Restaurants & Table Booking Systems
- Healthcare & Patient Management

## In this project, you’ll learn how to:

- Build AI Voice Agents with modern LLMs
- Create real-time voice conversations
- Integrate Supabase for authentication & database
- Manage appointments and customer data
- Deploy a scalable AI SaaS application
- Build a modern frontend with Next.js
- Handle AI prompts, workflows, and business logic
- Create reusable AI agent systems for multiple industries

This tutorial is perfect for developers, SaaS founders, freelancers, and anyone interested in building AI-powered business applications.

## 💻 Tech Stack:

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Voice AI**: Deepgram Voice Agent API (STT + LLM + TTS pipeline)
  - **STT**: Deepgram Nova-3
  - **LLM**: OpenAI GPT-4o-mini
  - **TTS**: Deepgram Aura-2
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **UI Components**: Custom components with Framer Motion

## ✨ Features:

- 🎙️ Real-time AI voice conversations
- 📅 Appointment scheduling and management
- 💬 Conversation history and analytics
- 🏢 Multi-business support
- 🤖 Customizable AI agent personalities
- 📊 Dashboard with insights and metrics
- 🔐 Secure authentication and authorization
- 📱 Responsive design
- 🔌 Embeddable voice widget

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI_Voice_Agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DEEPGRAM_API_KEY=your_deepgram_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_ENABLE_VOICE=true
   NEXT_PUBLIC_DEEPGRAM_STT_MODEL=nova-3
   NEXT_PUBLIC_DEEPGRAM_TTS_MODEL=aura-2-thalia-en
   ```

   Get your Deepgram API key at [console.deepgram.com](https://console.deepgram.com).

   ### LLM Configuration

   The voice agent supports **any LLM provider** — OpenAI, DeepSeek, or self-hosted (Ollama, vLLM, LM Studio):

   ```env
   # Option 1: OpenAI (default)
   DEEPGRAM_LLM_PROVIDER_TYPE=open_ai
   DEEPGRAM_LLM_MODEL=gpt-4o-mini
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_DEEPGRAM_LLM_PROVIDER_TYPE=open_ai
   NEXT_PUBLIC_DEEPGRAM_LLM_MODEL=gpt-4o-mini

   # Option 2: DeepSeek
   DEEPGRAM_LLM_PROVIDER_TYPE=deepseek
   DEEPGRAM_LLM_MODEL=deepseek-chat
   DEEPSEEK_API_KEY=sk-...
   NEXT_PUBLIC_DEEPGRAM_LLM_PROVIDER_TYPE=deepseek
   NEXT_PUBLIC_DEEPGRAM_LLM_MODEL=deepseek-chat

   # Option 3: Self-hosted (Ollama, vLLM, LM Studio, etc.)
   DEEPGRAM_LLM_PROVIDER_TYPE=custom
   DEEPGRAM_LLM_MODEL=llama3
   DEEPGRAM_LLM_ENDPOINT_URL=http://localhost:11434/v1
   NEXT_PUBLIC_DEEPGRAM_LLM_PROVIDER_TYPE=custom
   NEXT_PUBLIC_DEEPGRAM_LLM_MODEL=llama3
   ```

4. **Set up Supabase**
   
   Run the SQL migrations in `supabase/schema.sql` in your Supabase SQL editor.

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎙️ Voice Agent Architecture

The voice pipeline uses **Deepgram Voice Agent API** via WebSocket:

```
Browser → WebSocket → Deepgram Voice Agent API
         (token from /api/deepgram-token)
```

- **STT**: Deepgram Nova-3 (real-time speech-to-text)
- **LLM**: Configurable — OpenAI, DeepSeek, or any self-hosted OpenAI-compatible API
- **TTS**: Deepgram Aura-2 (text-to-speech)
- **Function Calling**: Client-side, executed via `/api/realtime/tools`

Authentication uses short-lived tokens (never expose API keys to the browser).

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 👤 Author

**Aziz**
- GitHub: [@userisaziz](https://github.com/userisaziz)

## 📄 License

This project is open source and available under the MIT License.
