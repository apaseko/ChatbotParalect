# ChatBot — AI Chat Assistant

A modern ChatGPT-like chatbot interface built with Next.js, Supabase, and multiple LLM integrations. Features real-time streaming responses, image/document uploads, anonymous access, and cross-tab synchronization.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square) ![Supabase](https://img.shields.io/badge/Supabase-green?style=flat-square)

## Features

- 💬 **Real-time streaming** — SSE-based streaming responses from LLMs
- 🤖 **Multiple LLMs** — GPT-4o and Gemini 2.0 Flash, switchable per message
- 🔐 **Authentication** — Email/password auth with Supabase
- 👻 **Anonymous access** — Try up to 3 questions without signing up
- 🖼️ **Image support** — Paste or attach images directly in chat
- 📄 **Document upload** — Upload text files for contextual Q&A
- 🔄 **Cross-tab sync** — New chats sync across browser tabs via Supabase Realtime
- 📱 **Responsive** — Fully responsive with collapsible sidebar on mobile
- 🌙 **Dark mode** — Beautiful dark theme by default
- ✨ **Rich markdown** — Code blocks, tables, links, and more in responses

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| State Management | TanStack Query |
| UI | Shadcn UI, Tailwind CSS v4 |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| File Storage | Supabase Storage |
| LLM | OpenAI GPT-4o, Google Gemini 2.0 Flash |

## Architecture

```
Client (React)  →  API Routes (Next.js)  →  Database (Supabase)
     ↓                    ↓                       ↓
TanStack Query     Service-role client         PostgreSQL
     ↓                    ↓
  Supabase         LLM Providers
  Realtime         (OpenAI/Gemini)
  (public client)
```

- **Separation of concerns**: Client code fetches only from API routes; no direct DB calls in components
- **Security**: Supabase accessed via service-role key on the server only; no RLS, no public DB access
- **Realtime**: Public Supabase client used only for Realtime subscriptions (as required by Supabase)

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- A [Supabase](https://supabase.com) project
- At least one LLM API key: [OpenAI](https://platform.openai.com) or [Google AI](https://ai.google.dev)

### 1. Clone and install

```bash
git clone <repository-url>
cd ChatbotParalect
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# At least one LLM API key (required)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AI...
```

### 3. Set up the database

Go to **Supabase Dashboard → SQL Editor** and run the contents of:

```
supabase/migration.sql
```

This creates all required tables (`profiles`, `chats`, `messages`, `documents`) and enables Realtime.

### 4. Create storage buckets

In **Supabase Dashboard → Storage**:

1. Create bucket **`chat-images`** (set to **Public**)
2. Create bucket **`chat-documents`** (set to **Private**)

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # REST API routes
│   │   ├── auth/             # signup, login, logout, anonymous
│   │   ├── chats/            # CRUD + messages (streaming)
│   │   ├── upload/           # Image & document upload
│   │   ├── models/           # Available LLM models
│   │   └── user/             # Current user profile
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main page
│   └── globals.css           # Global styles & theme
├── components/
│   ├── auth/AuthModal.tsx    # Login/register dialog
│   ├── chat/                 # Chat components
│   │   ├── ChatArea.tsx      # Main chat with streaming
│   │   ├── ChatInput.tsx     # Message input + attachments
│   │   ├── MessageBubble.tsx # Message with markdown
│   │   └── MessageList.tsx   # Message list + empty states
│   ├── layout/Sidebar.tsx    # Sidebar with chat list
│   ├── ui/                   # Shadcn components
│   ├── ChatApp.tsx           # Main app orchestrator
│   └── Providers.tsx         # Query + toast providers
├── hooks/                    # TanStack Query hooks
│   ├── useAuth.ts
│   ├── useChats.ts
│   ├── useMessages.ts
│   └── useRealtime.ts
├── lib/
│   ├── llm/                  # LLM integrations
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   └── index.ts
│   ├── supabase/
│   │   ├── server.ts         # Service-role client (API only)
│   │   └── client.ts         # Public client (Realtime only)
│   └── utils.ts
└── types/index.ts            # TypeScript types
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `POST` | `/api/auth/anonymous` | Create anonymous session |
| `GET` | `/api/user` | Get current user profile |
| `GET` | `/api/chats` | List user's chats |
| `POST` | `/api/chats` | Create new chat |
| `GET` | `/api/chats/:id` | Get single chat |
| `PATCH` | `/api/chats/:id` | Update chat (title, model) |
| `DELETE` | `/api/chats/:id` | Delete chat |
| `GET` | `/api/chats/:id/messages` | Get messages |
| `POST` | `/api/chats/:id/messages` | Send message (streams SSE) |
| `POST` | `/api/upload` | Upload image or document |
| `GET` | `/api/models` | List available LLM models |

## Database Schema

| Table | Description |
|---|---|
| `profiles` | User profiles (extends `auth.users`) |
| `chats` | Chat conversations |
| `messages` | Individual messages (user/assistant/system) |
| `documents` | Uploaded document metadata & extracted text |

## Deployment

The app is Vercel-ready. Set the environment variables in Vercel's dashboard and deploy:

```bash
vercel
```

## License

MIT
