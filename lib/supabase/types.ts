/**
 * Database Types
 *
 * TypeScript types for database tables.
 * These provide type safety when querying with Supabase.
 *
 * Note: In production, you can auto-generate these from your database:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Account, 'id'>>
      }
      account_settings: {
        Row: AccountSettings
        Insert: Omit<AccountSettings, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AccountSettings, 'id'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id'>>
      }
      ai_functions: {
        Row: AIFunction
        Insert: Omit<AIFunction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AIFunction, 'id'>>
      }
    }
  }
}

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Account {
  id: string
  account_name: string
  ghl_location_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccountSettings {
  id: string
  account_id: string

  // Context window settings
  context_window_days: number
  context_window_messages: number
  max_context_tokens: number

  // Semantic search settings
  enable_semantic_search: boolean
  semantic_search_limit: number
  semantic_similarity_threshold: number

  // RAG settings
  enable_rag: boolean
  rag_chunk_limit: number
  rag_similarity_threshold: number

  // AI Provider settings
  default_ai_provider: 'openai' | 'anthropic'
  openai_model: string
  anthropic_model: string

  // Function calling settings
  enable_function_calling: boolean
  max_function_calls_per_message: number

  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  account_id: string

  // GHL contact information
  ghl_contact_id: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null

  // Conversation metadata
  conversation_title: string | null
  last_message_at: string | null
  message_count: number

  // AI preferences
  preferred_ai_provider: 'openai' | 'anthropic' | null

  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  account_id: string

  // Message content
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string

  // Message type
  message_type: 'chat' | 'automation' | 'manual'

  // Smart context loading
  precedes_user_reply: boolean

  // GHL reference
  ghl_message_id: string | null

  // Function calling
  function_call: any | null
  function_call_result: any | null

  // Vector embedding (optional - may be stored in separate table)
  embedding: number[] | null

  // Message tracking
  channel: string | null
  direction: 'inbound' | 'outbound' | null
  source: 'contact' | 'ai_agent' | 'ghl_user' | 'ghl_automation' | 'system' | null

  // AI metadata
  tokens_used: number | null
  model_used: string | null
  created_at: string
  updated_at: string
}

export interface ConversationEmbedding {
  id: string
  message_id: string
  conversation_id: string
  account_id: string

  message_text: string
  message_role: string

  embedding: number[] // vector(1536)

  created_at: string
}

export interface ConversationFile {
  id: string
  conversation_id: string
  account_id: string

  file_name: string
  file_type: string | null
  file_size: number | null

  storage_path: string
  storage_url: string

  is_processed: boolean
  processed_at: string | null

  uploaded_by_contact_id: string | null
  created_at: string
}

export interface RAGDocument {
  id: string
  account_id: string

  document_name: string
  document_type: string | null
  source_url: string | null

  full_content: string | null

  metadata: any
  is_active: boolean

  created_at: string
  updated_at: string
}

export interface RAGChunk {
  id: string
  document_id: string
  account_id: string

  chunk_text: string
  chunk_index: number

  embedding: number[] // vector(1536)

  metadata: any
  created_at: string
}

export interface AIFunction {
  id: string

  function_name: string
  display_name: string
  description: string
  category: string | null

  account_id: string | null
  is_platform_function: boolean

  parameters: any // JSONB

  handler_type: 'internal' | 'api' | 'webhook' | 'database'
  handler_config: any // JSONB

  requires_auth: boolean
  allowed_roles: string[] | null

  is_active: boolean

  version: number
  created_by: string | null

  created_at: string
  updated_at: string
}

export interface FunctionCallLog {
  id: string

  function_id: string | null
  message_id: string | null
  conversation_id: string | null
  account_id: string | null

  function_name: string
  handler_type: string

  input_parameters: any
  output_result: any | null

  status: 'pending' | 'running' | 'success' | 'error'
  error_message: string | null

  execution_time_ms: number | null
  executed_at: string
}

export interface WebhookConfiguration {
  id: string
  account_id: string

  webhook_name: string
  description: string | null

  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'

  headers: any
  auth_type: 'none' | 'bearer' | 'basic' | 'apikey' | null
  auth_config: any | null

  timeout_ms: number
  retry_count: number

  is_active: boolean

  created_at: string
  updated_at: string
}

export interface WebhookEvent {
  id: string
  account_id: string | null

  source: string
  event_type: string

  payload: any
  headers: any | null

  status: 'pending' | 'processing' | 'processed' | 'failed'
  processed_at: string | null
  error_message: string | null

  ghl_location_id: string | null
  ghl_contact_id: string | null

  received_at: string
}

/**
 * GHL OAuth Token Storage
 *
 * ✅ CORRECT: Stores encrypted token REFERENCES (not plaintext!)
 * Actual tokens are encrypted in Token Manager service
 */
export interface GHLOAuthToken {
  id: string
  account_id: string

  // Encrypted token references (NOT plaintext!)
  access_token_reference: string  // Reference ID from Token Manager
  refresh_token_reference: string  // Reference ID from Token Manager

  // Token metadata
  token_type: string
  scope: string | null
  expires_at: string

  // GHL location info
  location_id: string
  company_id: string | null

  created_at: string
  updated_at: string
}

export interface APIKey {
  id: string
  account_id: string | null

  key_type: 'openai' | 'anthropic' | 'ghl'
  key_level: 'platform' | 'account' | 'user'

  user_id: string | null

  encrypted_key_reference: string

  key_name: string | null
  is_active: boolean

  last_used_at: string | null
  usage_count: number

  permissions: any

  created_at: string
  updated_at: string
}
