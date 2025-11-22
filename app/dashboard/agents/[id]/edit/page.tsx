'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input, Textarea, Select } from '@/components/ui';
import { Agent } from '@/types/agent';

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

interface EditAgentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditAgentPage({ params }: EditAgentPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ai_provider: 'openai' as 'openai' | 'anthropic',
    ai_model: 'gpt-5',
    system_prompt: '',
    context_window: 60,
    enable_function_calling: true
  });

  useEffect(() => {
    loadAgent();
  }, [id]);

  const loadAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.agent) {
          setAgent(data.agent);
          setFormData({
            name: data.agent.name,
            description: data.agent.description || '',
            ai_provider: data.agent.ai_provider,
            ai_model: data.agent.ai_model,
            system_prompt: data.agent.system_prompt,
            context_window: data.agent.context_window,
            enable_function_calling: data.agent.enable_function_calling
          });
        }
      } else {
        alert('Failed to load agent');
        router.push('/dashboard/agents');
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      alert('Failed to load agent');
      router.push('/dashboard/agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        router.push('/dashboard/agents');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update agent');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
      alert('Failed to update agent');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableModels = () => {
    return AI_MODELS[formData.ai_provider] || [];
  };

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
        <div className="text-gray-900">Loading agent...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900">Agent not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Agent</h1>
          <p className="text-gray-600 mt-1">
            Configure your AI agent settings
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/dashboard/agents')}>
          Back to Agents
        </Button>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Agent Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My AI Assistant"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Context Window (messages)
              </label>
              <Input
                type="number"
                value={formData.context_window}
                onChange={(e) => setFormData({ ...formData, context_window: parseInt(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Number of previous messages to include</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this agent's purpose"
              rows={2}
              className="w-full"
            />
          </div>

          {/* AI Provider & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                AI Provider
              </label>
              <Select
                value={formData.ai_provider}
                onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'anthropic')}
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic (Claude)' }
                ]}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Model
              </label>
              <Select
                value={formData.ai_model}
                onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                options={getAvailableModels().map(model => ({
                  value: model.value,
                  label: model.recommended ? `${model.label}` : model.label
                }))}
                className="w-full"
              />
            </div>
          </div>

          {/* System Prompt - LARGE */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              System Prompt
            </label>
            <p className="text-sm text-gray-500 mb-3">
              This is the instruction that defines how your AI agent behaves. Be specific and detailed.
            </p>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={16}
              placeholder="You are a helpful AI assistant. Your role is to..."
              className="w-full font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              {formData.system_prompt.length} characters
            </p>
          </div>

          {/* Function Calling */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="enable_functions"
              checked={formData.enable_function_calling}
              onChange={(e) => setFormData({ ...formData, enable_function_calling: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <label htmlFor="enable_functions" className="text-sm font-medium text-gray-900">
                Enable Function Calling
              </label>
              <p className="text-xs text-gray-500">Allow the agent to call custom functions and tools</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/dashboard/agents')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
