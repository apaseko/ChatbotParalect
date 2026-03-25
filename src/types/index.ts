export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_anonymous: boolean;
  anonymous_questions_used: number;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_urls: string[];
  created_at: string;
}

export interface Document {
  id: string;
  chat_id: string;
  filename: string;
  storage_path: string;
  content_text: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export type LLMModel = 'gpt-4o' | 'gemini-2.0-flash';

export interface SendMessagePayload {
  content: string;
  image_urls?: string[];
  model?: LLMModel;
}

export interface CreateChatPayload {
  title?: string;
  model?: LLMModel;
}

export interface AuthPayload {
  email: string;
  password: string;
}
