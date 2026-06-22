# AI Voice Agents SaaS

AI-powered voice assistant platform for businesses built with Next.js, OpenAI, and Supabase.

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
- **AI**: OpenAI Realtime API (GPT-4o)
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
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_ENABLE_VOICE=true
   ```

4. **Set up Supabase**
   
   Run the SQL migrations in `supabase/schema.sql` in your Supabase SQL editor.

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

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
