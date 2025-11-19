'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { getChannelDisplayName, getChannelIcon } from '@/lib/ghl/channels';

interface AccountSettings {
  context_window_days: number;
  context_window_messages: number;
  max_context_tokens: number;
  enable_semantic_search: boolean;
  semantic_search_limit: number;
  semantic_similarity_threshold: number;
  enable_rag: boolean;
  rag_chunk_limit: number;
  rag_similarity_threshold: number;
  default_ai_provider: 'openai' | 'anthropic';
  openai_model: string;
  anthropic_model: string;
  enable_function_calling: boolean;
  max_function_calls_per_message: number;
}

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  badgeColor: string;
}

const SETTING_CARDS: SettingCard[] = [
  {
    id: 'ghl-integration',
    title: 'GHL Integration',
    description: 'Connect your GoHighLevel account via OAuth for automated messaging across all channels',
    icon: '🔌',
    badge: 'Required',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    id: 'context-window',
    title: 'Context Window',
    description: 'Control how much conversation history the AI uses when generating responses',
    icon: '🪟',
    badge: 'AI Settings',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    id: 'semantic-search',
    title: 'Semantic Search',
    description: 'Use AI-powered search to find relevant past conversations and information',
    icon: '🔍',
    badge: 'AI Settings',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge Base (RAG)',
    description: 'Retrieve relevant information from your knowledge base to enhance AI responses',
    icon: '📚',
    badge: 'AI Settings',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    id: 'ai-provider',
    title: 'AI Provider',
    description: 'Configure which AI provider and models to use for generating responses',
    icon: '🤖',
    badge: 'AI Settings',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    id: 'function-calling',
    title: 'Function Calling',
    description: 'Allow the AI to call functions to perform actions or retrieve information',
    icon: '⚡',
    badge: 'Advanced',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
  },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GHL Integration state
  const [ghlConnected, setGhlConnected] = useState(false);
  const [ghlLocation, setGhlLocation] = useState<string | null>(null);
  const [ghlScopes, setGhlScopes] = useState<string[]>([]);
  const [ghlExpiresAt, setGhlExpiresAt] = useState<string | null>(null);
  const [showScopeSelector, setShowScopeSelector] = useState(false);
  const [availableScopes, setAvailableScopes] = useState<Record<string, string>>({});
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [useDefaultScopes, setUseDefaultScopes] = useState(true);

  // Account settings state
  const [settings, setSettings] = useState<AccountSettings>({
    context_window_days: 30,
    context_window_messages: 60,
    max_context_tokens: 8000,
    enable_semantic_search: true,
    semantic_search_limit: 10,
    semantic_similarity_threshold: 0.7,
    enable_rag: true,
    rag_chunk_limit: 5,
    rag_similarity_threshold: 0.75,
    default_ai_provider: 'openai',
    openai_model: 'gpt-4-turbo-preview',
    anthropic_model: 'claude-3-5-sonnet-20241022',
    enable_function_calling: true,
    max_function_calls_per_message: 10,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('ghl_connected') === 'true') {
      const locationCount = params.get('locations');
      setMessage({
        type: 'success',
        text: locationCount
          ? `Successfully connected to GoHighLevel! ${locationCount} location(s) configured.`
          : 'Successfully connected to GoHighLevel!',
      });
      setGhlConnected(true);
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    if (params.get('ghl_error')) {
      const error = params.get('ghl_error');
      setMessage({ type: 'error', text: `Failed to connect: ${error}` });
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    loadAccountSettings();
    checkGHLStatus();
    loadAvailableScopes();
  }, []);

  const loadAccountSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load account settings:', error);
    }
  };

  const loadAvailableScopes = async () => {
    try {
      const response = await fetch('/api/ghl/scopes');
      if (response.ok) {
        const data = await response.json();
        setAvailableScopes(data.scopes || {});
        setSelectedScopes(data.defaultScopes || []);
      }
    } catch (error) {
      console.error('Failed to load OAuth scopes:', error);
    }
  };

  const checkGHLStatus = async () => {
    try {
      const response = await fetch('/api/ghl/status');
      if (response.ok) {
        const data = await response.json();
        setGhlConnected(data.connected);
        setGhlLocation(data.locationId || null);
        setGhlScopes(data.scopes || []);
        setGhlExpiresAt(data.expiresAt || null);
      }
    } catch (error) {
      console.error('Failed to check GHL status:', error);
    }
  };

  const handleConnectGHL = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const scopesToRequest = useDefaultScopes ? undefined : selectedScopes;

      const response = await fetch('/api/ghl/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes: scopesToRequest }),
      });
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Failed to get authorization URL' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initiate OAuth flow' });
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleDisconnectGHL = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect GoHighLevel? This will stop message synchronization.'
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ghl/disconnect', { method: 'POST' });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Successfully disconnected from GoHighLevel' });
        setGhlConnected(false);
        setGhlLocation(null);
        setGhlScopes([]);
        setGhlExpiresAt(null);
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect from GoHighLevel' });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AccountSettings>) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        setMessage({ type: 'success', text: 'Settings reset to defaults' });
      } else {
        setMessage({ type: 'error', text: 'Failed to reset settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset settings' });
    } finally {
      setLoading(false);
    }
  };

  const renderSectionContent = () => {
    if (!activeSection) return null;

    switch (activeSection) {
      case 'ghl-integration':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">GHL Integration</h2>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Connect your GoHighLevel account to enable bi-directional messaging across all
                channels: SMS, Email, WhatsApp, Facebook, Instagram, and Google Business.
              </p>
            </div>

            <div className="space-y-6">
              {/* Connection Status */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Connection Status</h3>

                {ghlConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Connected to GoHighLevel</span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <dl className="space-y-2">
                        {ghlLocation && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500">Location ID</dt>
                            <dd className="text-sm text-gray-900">{ghlLocation}</dd>
                          </div>
                        )}
                        {ghlScopes.length > 0 && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500">Active Scopes</dt>
                            <dd className="text-sm text-gray-900 font-mono">{ghlScopes.join(', ')}</dd>
                          </div>
                        )}
                        {ghlExpiresAt && (
                          <div>
                            <dt className="text-xs font-medium text-gray-500">Token Expires</dt>
                            <dd className="text-sm text-gray-900">
                              {new Date(ghlExpiresAt).toLocaleString()}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Supported Channels:</h4>
                      <div className="flex flex-wrap gap-2">
                        {['SMS', 'Email', 'WhatsApp', 'GMB', 'FB', 'Instagram'].map((channel) => (
                          <div
                            key={channel}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-900 font-medium"
                          >
                            <span>{getChannelIcon(channel)}</span>
                            <span>{getChannelDisplayName(channel)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={checkGHLStatus}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                      >
                        Refresh Status
                      </button>
                      <button
                        onClick={handleDisconnectGHL}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Not Connected</span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Connect your GoHighLevel account to enable:
                    </p>

                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
                      <li>Bi-directional messaging across all channels</li>
                      <li>Automated contact sync</li>
                      <li>Real-time webhook updates</li>
                      <li>AI-powered message responses</li>
                    </ul>

                    {/* OAuth Scope Selection */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm text-gray-900">OAuth Permissions</h4>
                        <button
                          onClick={() => setShowScopeSelector(!showScopeSelector)}
                          className="text-sm text-blue-600 hover:underline font-medium"
                        >
                          {showScopeSelector ? 'Hide' : 'Customize Permissions'}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useDefaultScopes}
                            onChange={(e) => setUseDefaultScopes(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            Use recommended permissions (messaging, contacts, location info)
                          </span>
                        </label>

                        {showScopeSelector && !useDefaultScopes && (
                          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                            <p className="text-xs text-gray-600 mb-3">
                              Select which permissions to request. More permissions give your AI agent
                              more capabilities.
                            </p>
                            {Object.entries(availableScopes).map(([scope, description]) => (
                              <label
                                key={scope}
                                className="flex items-start gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedScopes.includes(scope)}
                                  onChange={() => toggleScope(scope)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{scope}</div>
                                  <div className="text-xs text-gray-600">{description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}

                        {!useDefaultScopes && (
                          <div className="mt-2 text-xs text-gray-600">
                            <strong>Selected:</strong> {selectedScopes.length} permission(s)
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleConnectGHL}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Connecting...' : 'Connect to GoHighLevel'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'context-window':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Context Window Settings</h2>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Control how much conversation history the AI uses when generating responses
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.context_window_days}
                  onChange={(e) =>
                    setSettings({ ...settings, context_window_days: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Load messages from the last N days (1-365)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Context Window (Messages)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settings.context_window_messages}
                  onChange={(e) =>
                    setSettings({ ...settings, context_window_messages: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Load the last N messages per conversation (1-500)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Context Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  max="128000"
                  value={settings.max_context_tokens}
                  onChange={(e) =>
                    setSettings({ ...settings, max_context_tokens: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum tokens to use for context (100-128000)
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() =>
                    updateSettings({
                      context_window_days: settings.context_window_days,
                      context_window_messages: settings.context_window_messages,
                      max_context_tokens: settings.max_context_tokens,
                    })
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'semantic-search':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Semantic Search Settings</h2>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Use AI-powered search to find relevant past conversations
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enable_semantic_search}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_semantic_search: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">Enable Semantic Search</label>
              </div>

              {settings.enable_semantic_search && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Result Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={settings.semantic_search_limit}
                      onChange={(e) =>
                        setSettings({ ...settings, semantic_search_limit: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of search results (1-50)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Similarity Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.semantic_similarity_threshold}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          semantic_similarity_threshold: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum similarity score to include results (0-1)
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() =>
                    updateSettings({
                      enable_semantic_search: settings.enable_semantic_search,
                      semantic_search_limit: settings.semantic_search_limit,
                      semantic_similarity_threshold: settings.semantic_similarity_threshold,
                    })
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'knowledge-base':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Knowledge Base (RAG) Settings</h2>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Retrieve relevant information from your knowledge base to enhance AI responses
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enable_rag}
                  onChange={(e) => setSettings({ ...settings, enable_rag: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable Knowledge Base Integration
                </label>
              </div>

              {settings.enable_rag && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chunk Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.rag_chunk_limit}
                      onChange={(e) =>
                        setSettings({ ...settings, rag_chunk_limit: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of knowledge base chunks to include (1-20)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Similarity Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.rag_similarity_threshold}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          rag_similarity_threshold: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum similarity score to include chunks (0-1)
                    </p>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() =>
                    updateSettings({
                      enable_rag: settings.enable_rag,
                      rag_chunk_limit: settings.rag_chunk_limit,
                      rag_similarity_threshold: settings.rag_similarity_threshold,
                    })
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'ai-provider':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">AI Provider Settings</h2>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Configure which AI provider and models to use for generating responses
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default AI Provider
                </label>
                <select
                  value={settings.default_ai_provider}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_ai_provider: e.target.value as 'openai' | 'anthropic',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI Model</label>
                <input
                  type="text"
                  value={settings.openai_model}
                  onChange={(e) => setSettings({ ...settings, openai_model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="gpt-4-turbo-preview"
                />
                <p className="text-xs text-gray-500 mt-1">Model to use when OpenAI is selected</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anthropic Model
                </label>
                <input
                  type="text"
                  value={settings.anthropic_model}
                  onChange={(e) => setSettings({ ...settings, anthropic_model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="claude-3-5-sonnet-20241022"
                />
                <p className="text-xs text-gray-500 mt-1">Model to use when Anthropic is selected</p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() =>
                    updateSettings({
                      default_ai_provider: settings.default_ai_provider,
                      openai_model: settings.openai_model,
                      anthropic_model: settings.anthropic_model,
                    })
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'function-calling':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Function Calling Settings</h2>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Allow the AI to call functions to perform actions or retrieve information
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enable_function_calling}
                  onChange={(e) =>
                    setSettings({ ...settings, enable_function_calling: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">Enable Function Calling</label>
              </div>

              {settings.enable_function_calling && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Function Calls Per Message
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.max_function_calls_per_message}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        max_function_calls_per_message: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of function calls allowed per message (1-20)
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() =>
                    updateSettings({
                      enable_function_calling: settings.enable_function_calling,
                      max_function_calls_per_message: settings.max_function_calls_per_message,
                    })
                  }
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your AI Chat Agent configuration and integrations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Global Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Settings Cards Grid or Active Section */}
        {activeSection ? (
          renderSectionContent()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SETTING_CARDS.map((card) => (
              <div
                key={card.id}
                onClick={() => setActiveSection(card.id)}
                className="bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
              >
                {/* Icon and Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className="text-4xl">{card.icon}</div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Title and Description */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600">{card.description}</p>

                {/* Click to open indicator */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-blue-600 font-medium">
                    Click to configure →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
