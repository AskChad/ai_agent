/**
 * Application Configuration
 *
 * Centralized configuration management for all environment variables
 * and application settings.
 */

export const config = {
  // Application
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
  },

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },

  // AI Providers
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: 'gpt-4-turbo-preview',
      embeddingModel: 'text-embedding-ada-002',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      defaultModel: 'claude-3-5-sonnet-20241022',
    },
  },

  // GoHighLevel
  ghl: {
    clientId: process.env.GHL_CLIENT_ID || '',
    clientSecret: process.env.GHL_CLIENT_SECRET || '',
    redirectUri: process.env.GHL_REDIRECT_URI || '',
    conversationProviderId: process.env.GHL_CONVERSATION_PROVIDER_ID || '',
    apiBaseUrl: 'https://services.leadconnectorhq.com',
    oauthBaseUrl: 'https://marketplace.gohighlevel.com',
  },

  // Token Manager
  tokenManager: {
    apiKey: process.env.TOKEN_MANAGER_API_KEY || '',
    url: process.env.TOKEN_MANAGER_URL || '',
  },

  // External APIs (optional)
  external: {
    weatherApiKey: process.env.WEATHER_API_KEY || '',
    stockApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
  },
} as const

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const required = {
    'NEXT_PUBLIC_SUPABASE_URL': config.supabase.url,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': config.supabase.anonKey,
    'OPENAI_API_KEY': config.ai.openai.apiKey,
  }

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      'Please create a .env.local file with the required variables.'
    )
  }
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = config.app.env === 'development'

/**
 * Check if we're in production mode
 */
export const isProduction = config.app.env === 'production'
