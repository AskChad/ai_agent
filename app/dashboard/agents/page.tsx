'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui';
import { Input, Textarea, Select } from '@/components/ui';
import { Agent, CreateAgentRequest } from '@/types/agent';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentLimit, setAgentLimit] = useState({ current: 0, max: 0 });

  // Form state
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: '',
    description: '',
    ai_provider: 'openai',
    ai_model: 'gpt-4',
    system_prompt: 'You are a helpful AI assistant.',
    context_window: 60,
    enable_function_calling: true
  });

  useEffect(() => {
    loadAgents();
  }, []);

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
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
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
      ai_model: 'gpt-4',
      system_prompt: 'You are a helpful AI assistant.',
      context_window: 60,
      enable_function_calling: true
    });
    setEditingAgent(null);
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
                    onClick={() => {
                      setEditingAgent(agent);
                      setFormData({
                        name: agent.name,
                        description: agent.description || '',
                        ai_provider: agent.ai_provider,
                        ai_model: agent.ai_model,
                        system_prompt: agent.system_prompt,
                        context_window: agent.context_window,
                        enable_function_calling: agent.enable_function_calling
                      });
                      setShowCreateModal(true);
                    }}
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
                onChange={(e) => setFormData({
                  ...formData,
                  ai_provider: e.target.value as 'openai' | 'anthropic'
                })}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Model
              </label>
              <Input
                value={formData.ai_model}
                onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                placeholder="gpt-4"
              />
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
