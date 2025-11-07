export interface Agent {
  id: string;
  account_id: string;
  name: string;
  description?: string;

  // AI Configuration
  ai_provider: 'openai' | 'anthropic';
  ai_model: string;
  system_prompt: string;
  context_window: number;
  enable_function_calling: boolean;

  // Status
  status: 'active' | 'paused' | 'archived';
  is_default: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  ai_provider?: 'openai' | 'anthropic';
  ai_model?: string;
  system_prompt?: string;
  context_window?: number;
  enable_function_calling?: boolean;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  ai_provider?: 'openai' | 'anthropic';
  ai_model?: string;
  system_prompt?: string;
  context_window?: number;
  enable_function_calling?: boolean;
  status?: 'active' | 'paused' | 'archived';
  is_default?: boolean;
}

export interface AgentStats {
  agent_id: string;
  account_id: string;
  agent_name: string;
  status: string;
  total_conversations: number;
  total_functions: number;
  total_knowledge_items: number;
  last_conversation_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountAgentUsage {
  account_id: string;
  email: string;
  max_agents: number;
  active_agents: number;
  total_agents: number;
  usage_status: 'unlimited' | 'at_limit' | 'under_limit';
}
