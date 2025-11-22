'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui';
import { Input, Textarea, Select } from '@/components/ui';
import { Agent, CreateAgentRequest } from '@/types/agent';

// GHL connection status type
interface GHLConnectionStatus {
  connected: boolean;
  locationId?: string;
  companyId?: string;
  expiresAt?: string;
  userType?: string;
}

// Model configurations for each provider (2025 latest models)
const AI_MODELS = {
  openai: [
    { value: 'gpt-5', label: 'GPT-5 (Flagship - Best for coding & agentic tasks)', recommended: true },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini (Faster, cost-effective)' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano (Fastest, lowest cost)' },
    { value: 'gpt-4-1', label: 'GPT-4.1 (Improved coding & instruction following)' },
    { value: 'gpt-4-1-mini', label: 'GPT-4.1 Mini (Balanced performance)' },
    { value: 'gpt-4-1-nano', label: 'GPT-4.1 Nano (Low latency)' },
    { value: 'gpt-4o', label: 'GPT-4o (Widely compatible)' },
    { value: 'o3', label: 'o3 (Advanced reasoning)' },
    { value: 'o3-mini', label: 'o3 Mini (Reasoning, cost-effective)' },
    { value: 'o3-pro', label: 'o3 Pro (Maximum reasoning capability)' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Best coding model)', recommended: true },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast & cost-effective)' },
    { value: 'claude-opus-4-1', label: 'Claude Opus 4.1 (Best for agentic tasks)' },
    { value: 'claude-sonnet-4', label: 'Claude Sonnet 4 (Hybrid with thinking modes)' },
    { value: 'claude-opus-4', label: 'Claude Opus 4 (Extended thinking)' },
    { value: 'claude-sonnet-3-7', label: 'Claude Sonnet 3.7' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Previous generation)' }
  ]
};

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentLimit, setAgentLimit] = useState({ current: 0, max: 0 });
  const [ghlStatuses, setGhlStatuses] = useState<Record<string, GHLConnectionStatus>>({});
  const [connectingAgentId, setConnectingAgentId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: '',
    description: '',
    ai_provider: 'openai',
    ai_model: 'gpt-5',
    system_prompt: 'You are a helpful AI assistant.',
    context_window: 60,
    enable_function_calling: true
  });

  useEffect(() => {
    loadAgents();

    // Check for GHL connection success/error from callback
    const ghlConnected = searchParams.get('ghl_connected');
    const ghlError = searchParams.get('ghl_error');
    const agentId = searchParams.get('agentId');

    if (ghlConnected === 'true' && agentId) {
      // Refresh GHL status for this agent
      loadGhlStatus(agentId);
    }
    if (ghlError) {
      alert(`GHL Connection Error: ${ghlError}`);
    }
  }, [searchParams]);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
        setAgentLimit({
          current: data.agents.filter((a: Agent) => a.status === 'active').length,
          max: 0 // TODO: Get from account info
        });
        // Load GHL status for each agent
        data.agents.forEach((agent: Agent) => {
          loadGhlStatus(agent.id);
        });
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGhlStatus = async (agentId: string) => {
    try {
      const response = await fetch(`/api/ghl/status?agentId=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setGhlStatuses(prev => ({
          ...prev,
          [agentId]: {
            connected: data.connected,
            locationId: data.locationId,
            companyId: data.companyId,
            expiresAt: data.expiresAt,
            userType: data.userType,
          }
        }));
      }
    } catch (error) {
      console.error('Error loading GHL status:', error);
    }
  };

  const handleConnectGhl = async (agentId: string) => {
    setConnectingAgentId(agentId);
    try {
      const response = await fetch(`/api/ghl/oauth/authorize?agentId=${agentId}`);
      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to GHL OAuth
        window.location.href = data.authUrl;
      } else {
        alert(data.error || 'Failed to initiate GHL connection');
      }
    } catch (error) {
      console.error('Error connecting to GHL:', error);
      alert('Failed to connect to GHL');
    } finally {
      setConnectingAgentId(null);
    }
  };

  const handleDisconnectGhl = async (agentId: string) => {
    if (!confirm('Are you sure you want to disconnect this agent from GoHighLevel?')) return;

    try {
      const response = await fetch(`/api/ghl/disconnect?agentId=${agentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setGhlStatuses(prev => ({
          ...prev,
          [agentId]: { connected: false }
        }));
      } else {
        alert('Failed to disconnect from GHL');
      }
    } catch (error) {
      console.error('Error disconnecting from GHL:', error);
      alert('Failed to disconnect from GHL');
    }
  };

  const [resyncingAgentId, setResyncingAgentId] = useState<string | null>(null);

  const handleResyncGhl = async (agentId: string) => {
    setResyncingAgentId(agentId);
    try {
      // Refresh the token by calling the resync endpoint
      const response = await fetch(`/api/ghl/resync?agentId=${agentId}`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Reload the status to show updated info
          await loadGhlStatus(agentId);
          alert('GHL connection resynced successfully!');
        } else {
          alert(data.error || 'Failed to resync GHL connection');
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to resync GHL connection');
      }
    } catch (error) {
      console.error('Error resyncing GHL:', error);
      alert('Failed to resync GHL connection');
    } finally {
      setResyncingAgentId(null);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadAgents();
        setShowCreateModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Failed to create agent');
    }
  };

  const handleUpdateAgent = async (agentId: string, updates: Partial<Agent>) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await loadAgents();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update agent');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      alert('Failed to update agent');
    }
  };

  const handleSetDefault = async (agentId: string) => {
    await handleUpdateAgent(agentId, { is_default: true });
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to archive this agent?')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadAgents();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Failed to delete agent');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ai_provider: 'openai',
      ai_model: 'gpt-5',
      system_prompt: 'You are a helpful AI assistant.',
      context_window: 60,
      enable_function_calling: true
    });
    setEditingAgent(null);
  };

  // Get available models for the selected provider
  const getAvailableModels = () => {
    return AI_MODELS[formData.ai_provider as keyof typeof AI_MODELS] || [];
  };

  // Handle provider change - update model to first available for that provider
  const handleProviderChange = (provider: 'openai' | 'anthropic') => {
    const models = AI_MODELS[provider];
    const defaultModel = models[0]?.value || '';
    setFormData({
      ...formData,
      ai_provider: provider,
      ai_model: defaultModel
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Loading agents...</div>
      </div>
    );
  }

  const canCreateAgent = agentLimit.max === 0 || agentLimit.current < agentLimit.max;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-900 mt-1">
            Manage your AI agents and their configurations
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!canCreateAgent}
        >
          + Create Agent
        </Button>
      </div>

      {/* Agent Limit Status */}
      {agentLimit.max > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                Agent Usage
              </span>
              <span className="text-sm text-gray-900">
                {agentLimit.current} / {agentLimit.max} agents
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-800 h-2 rounded-full"
                style={{ width: `${(agentLimit.current / agentLimit.max) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {agent.name}
                    {agent.is_default && (
                      <span className="px-2 py-1 bg-blue-900 text-white text-xs rounded">
                        Default
                      </span>
                    )}
                    {agent.status !== 'active' && (
                      <span className="px-2 py-1 bg-gray-900 text-white text-xs rounded">
                        {agent.status}
                      </span>
                    )}
                  </CardTitle>
                  {agent.description && (
                    <p className="text-sm text-gray-900 mt-1">{agent.description}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-900 font-medium">AI Provider</p>
                  <p className="text-sm text-gray-900">{agent.ai_provider} - {agent.ai_model}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-900 font-medium">System Prompt</p>
                  <p className="text-sm text-gray-900 line-clamp-2">{agent.system_prompt}</p>
                </div>

                {/* GHL Connection Status */}
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-gray-900 font-medium mb-2">GoHighLevel Connection</p>
                  {ghlStatuses[agent.id]?.connected ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm text-green-700">Connected</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {ghlStatuses[agent.id]?.userType === 'Company' ? 'Company' : 'Location'}: {ghlStatuses[agent.id]?.locationId?.slice(0, 8)}...
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDisconnectGhl(agent.id)}
                        >
                          Disconnect GHL
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResyncGhl(agent.id)}
                          disabled={resyncingAgentId === agent.id}
                        >
                          {resyncingAgentId === agent.id ? 'Resyncing...' : 'Resync Connection'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnectGhl(agent.id)}
                      disabled={connectingAgentId === agent.id}
                    >
                      {connectingAgentId === agent.id ? 'Connecting...' : 'Connect to GHL'}
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {!agent.is_default && agent.status === 'active' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetDefault(agent.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.location.href = `/dashboard/agents/${agent.id}/edit`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No agents yet</h3>
            <p className="text-gray-900 mt-2">Create your first AI agent to get started</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              + Create Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title={editingAgent ? 'Edit Agent' : 'Create New Agent'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Agent Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My AI Assistant"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this agent's purpose"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                AI Provider
              </label>
              <Select
                value={formData.ai_provider}
                onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'anthropic')}
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic (Claude)' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Model
              </label>
              <Select
                value={formData.ai_model}
                onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                options={getAvailableModels().map(model => ({
                  value: model.value,
                  label: model.recommended ? `⭐ ${model.label}` : model.label
                }))}
              />
              <p className="text-xs text-gray-600 mt-1">
                ⭐ = Recommended for best performance
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                System Prompt
              </label>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={4}
                placeholder="You are a helpful AI assistant."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Context Window (messages)
              </label>
              <Input
                type="number"
                value={formData.context_window}
                onChange={(e) => setFormData({ ...formData, context_window: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enable_functions"
                checked={formData.enable_function_calling}
                onChange={(e) => setFormData({ ...formData, enable_function_calling: e.target.checked })}
              />
              <label htmlFor="enable_functions" className="text-sm text-gray-900">
                Enable Function Calling
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={editingAgent ? () => handleUpdateAgent(editingAgent.id, formData) : handleCreateAgent}>
                {editingAgent ? 'Update Agent' : 'Create Agent'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <AgentsPageContent />
    </Suspense>
  );
}
